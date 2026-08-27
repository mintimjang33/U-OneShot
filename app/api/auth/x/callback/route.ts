import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/supabaseServerAuth';
import { encryptVaultValue } from '../../../../../lib/vaultCrypto';

const REDIRECT_URI = 'https://u-one-shot.vercel.app/api/auth/x/callback';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');
  if (oauthError) return NextResponse.redirect(new URL(`/dashboard/publish?error=${encodeURIComponent(oauthError)}`, request.url));
  if (!code) return NextResponse.redirect(new URL('/dashboard/publish?error=missing_code', request.url));

  const codeVerifier = request.headers.get('cookie')?.match(/x_oauth_verifier=([^;]+)/)?.[1];
  const savedState = request.headers.get('cookie')?.match(/x_oauth_state=([^;]+)/)?.[1];
  if (!codeVerifier || state !== savedState) {
    return NextResponse.redirect(new URL('/dashboard/publish?error=invalid_state', request.url));
  }

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(new URL('/dashboard/publish?error=server_not_configured', request.url));

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basicAuth}` },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) throw new Error(tokenJson.error_description || JSON.stringify(tokenJson));

    const meRes = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const meJson = await meRes.json();
    if (!meJson.data?.id) throw new Error('프로필 조회 실패: ' + JSON.stringify(meJson));

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from('uos_social_accounts').upsert(
      {
        user_id: user.id,
        platform: 'x',
        external_account_id: meJson.data.id,
        username: meJson.data.username,
        encrypted_access_token: encryptVaultValue(tokenJson.access_token),
        token_expires_at: new Date(Date.now() + (tokenJson.expires_in || 7200) * 1000).toISOString(),
        extra: tokenJson.refresh_token ? { refresh_token: encryptVaultValue(tokenJson.refresh_token) } : {},
      },
      { onConflict: 'user_id,platform,external_account_id' }
    );
    if (error) throw new Error(error.message);

    const response = NextResponse.redirect(new URL('/dashboard/publish?connected=x', request.url));
    response.cookies.delete('x_oauth_verifier');
    response.cookies.delete('x_oauth_state');
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(new URL(`/dashboard/publish?error=${encodeURIComponent(message.slice(0, 200))}`, request.url));
  }
}
