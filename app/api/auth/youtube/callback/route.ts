import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/supabaseServerAuth';
import { encryptVaultValue } from '../../../../../lib/vaultCrypto';

const REDIRECT_URI = 'https://u-one-shot.vercel.app/api/auth/youtube/callback';

// Supabase Auth의 Google 로그인과는 완전히 별개의 Google Cloud OAuth 클라이언트가 필요하다
// (youtube.upload 스코프는 민감 스코프라 별도 앱/동의화면 승인 대상).
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');
  if (oauthError) return NextResponse.redirect(new URL(`/dashboard/publish?error=${encodeURIComponent(oauthError)}`, request.url));
  if (!code) return NextResponse.redirect(new URL('/dashboard/publish?error=missing_code', request.url));

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(new URL('/dashboard/publish?error=server_not_configured', request.url));

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) throw new Error(tokenJson.error_description || JSON.stringify(tokenJson));
    if (!tokenJson.refresh_token) {
      // 이미 한 번 승인한 계정으로 다시 연동하면 refresh_token이 안 내려온다(구글 정책) —
      // access_type=offline + prompt=consent를 항상 붙여야 매번 refresh_token을 받는다.
      throw new Error('refresh_token을 받지 못했습니다. Google 계정 연동 앱 목록에서 기존 연동을 해제한 뒤 다시 시도해주세요.');
    }

    const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const channelJson = await channelRes.json();
    const channel = channelJson.items?.[0];
    if (!channel) throw new Error('연결할 YouTube 채널을 찾을 수 없습니다.');

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from('uos_social_accounts').upsert(
      {
        user_id: user.id,
        platform: 'youtube',
        external_account_id: channel.id,
        username: channel.snippet?.title,
        encrypted_access_token: encryptVaultValue(tokenJson.access_token),
        token_expires_at: new Date(Date.now() + (tokenJson.expires_in || 3600) * 1000).toISOString(),
        extra: { refresh_token: encryptVaultValue(tokenJson.refresh_token) },
      },
      { onConflict: 'user_id,platform,external_account_id' }
    );
    if (error) throw new Error(error.message);

    return NextResponse.redirect(new URL('/dashboard/publish?connected=youtube', request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(new URL(`/dashboard/publish?error=${encodeURIComponent(message.slice(0, 200))}`, request.url));
  }
}
