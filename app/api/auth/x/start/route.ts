import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentUser } from '../../../../../lib/supabaseServerAuth';

const REDIRECT_URI = 'https://u-one-shot.vercel.app/api/auth/x/callback';

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// X(Twitter) OAuth 2.0은 PKCE가 필수다. code_verifier를 서버에서 생성해 httpOnly 쿠키에 잠깐
// 보관해뒀다가, 콜백에서 그 값으로 토큰 교환을 검증한다(클라이언트 URL에 노출하지 않기 위함).
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const clientId = process.env.X_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL('/dashboard/publish?error=server_not_configured', request.url));

  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
  const state = base64url(crypto.randomBytes(16));

  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('x_oauth_verifier', codeVerifier, { httpOnly: true, secure: true, maxAge: 600, path: '/' });
  response.cookies.set('x_oauth_state', state, { httpOnly: true, secure: true, maxAge: 600, path: '/' });
  return response;
}
