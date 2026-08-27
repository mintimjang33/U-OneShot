import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/supabaseServerAuth';
import { encryptVaultValue } from '../../../../../lib/vaultCrypto';

const REDIRECT_URI = 'https://u-one-shot.vercel.app/api/auth/facebook/callback';

// Facebook 로그인 + 페이지 목록 조회 + (연결돼 있으면) 그 페이지의 인스타그램 비즈니스 계정까지 한 번에 저장.
// Instagram은 별도 OAuth 버튼이 없다 — buronai.com도 "Instagram 로그인·Facebook 연동 계정 모두 지원"이라고
// 명시했듯, 페이지에 연결된 IG 계정을 그대로 가져오는 방식이 Meta 표준 플로우다.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error_description') || searchParams.get('error');
  if (oauthError) return NextResponse.redirect(new URL(`/dashboard/publish?error=${encodeURIComponent(oauthError)}`, request.url));
  if (!code) return NextResponse.redirect(new URL('/dashboard/publish?error=missing_code', request.url));

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) return NextResponse.redirect(new URL('/dashboard/publish?error=server_not_configured', request.url));

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) throw new Error(tokenJson.error?.message || JSON.stringify(tokenJson));

    // 단기 -> 장기(60일) 사용자 토큰 교환
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenJson.access_token}`
    );
    const longJson = await longRes.json();
    const userAccessToken = longJson.access_token || tokenJson.access_token;

    // 관리 중인 페이지 목록(+각 페이지의 장기 페이지 토큰 + 연결된 IG 비즈니스 계정) 조회
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${userAccessToken}`
    );
    const pagesJson = await pagesRes.json();
    if (!pagesRes.ok) throw new Error(pagesJson.error?.message || JSON.stringify(pagesJson));

    const pages: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string; username: string } }> =
      pagesJson.data || [];
    if (pages.length === 0) throw new Error('연결 가능한 Facebook 페이지가 없습니다. 페이지 관리자 권한을 확인해주세요.');

    const supabase = getSupabaseServerClient();

    for (const page of pages) {
      await supabase.from('uos_social_accounts').upsert(
        {
          user_id: user.id,
          platform: 'facebook',
          external_account_id: page.id,
          username: page.name,
          encrypted_access_token: encryptVaultValue(page.access_token),
          extra: {},
        },
        { onConflict: 'user_id,platform,external_account_id' }
      );

      if (page.instagram_business_account) {
        await supabase.from('uos_social_accounts').upsert(
          {
            user_id: user.id,
            platform: 'instagram',
            external_account_id: page.instagram_business_account.id,
            username: page.instagram_business_account.username,
            // 인스타그램 발행은 페이지 토큰을 그대로 쓴다(같은 access_token).
            encrypted_access_token: encryptVaultValue(page.access_token),
            extra: { facebook_page_id: page.id },
          },
          { onConflict: 'user_id,platform,external_account_id' }
        );
      }
    }

    return NextResponse.redirect(new URL('/dashboard/publish?connected=facebook', request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(new URL(`/dashboard/publish?error=${encodeURIComponent(message.slice(0, 200))}`, request.url));
  }
}
