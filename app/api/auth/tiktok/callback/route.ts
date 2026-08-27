import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/supabaseServerAuth';
import { encryptVaultValue } from '../../../../../lib/vaultCrypto';

const REDIRECT_URI = 'https://u-one-shot.vercel.app/api/auth/tiktok/callback';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');
  if (oauthError) return NextResponse.redirect(new URL(`/dashboard/publish?error=${encodeURIComponent(oauthError)}`, request.url));
  if (!code) return NextResponse.redirect(new URL('/dashboard/publish?error=missing_code', request.url));

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) return NextResponse.redirect(new URL('/dashboard/publish?error=server_not_configured', request.url));

  try {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) throw new Error(tokenJson.error_description || JSON.stringify(tokenJson));

    const infoRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const infoJson = await infoRes.json();
    const info = infoJson.data?.user;
    if (!info?.open_id) throw new Error('프로필 조회 실패: ' + JSON.stringify(infoJson));

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from('uos_social_accounts').upsert(
      {
        user_id: user.id,
        platform: 'tiktok',
        external_account_id: info.open_id,
        username: info.display_name,
        encrypted_access_token: encryptVaultValue(tokenJson.access_token),
        token_expires_at: new Date(Date.now() + (tokenJson.expires_in || 86400) * 1000).toISOString(),
        extra: tokenJson.refresh_token ? { refresh_token: encryptVaultValue(tokenJson.refresh_token) } : {},
      },
      { onConflict: 'user_id,platform,external_account_id' }
    );
    if (error) throw new Error(error.message);

    return NextResponse.redirect(new URL('/dashboard/publish?connected=tiktok', request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(new URL(`/dashboard/publish?error=${encodeURIComponent(message.slice(0, 200))}`, request.url));
  }
}
