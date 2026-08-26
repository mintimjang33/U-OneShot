import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/auth/callback', '/platforms', '/for', '/pricing', '/terms', '/privacy'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // 환경변수가 아직 설정 안 된 배포 초기 단계에서는 createServerClient 생성 자체가 던진다(URL이
  // undefined면 즉시 예외) — 이 경우 미들웨어 전체가 죽지 않도록 클라이언트 생성까지 try에 넣는다.
  // 로그인 안 된 것으로만 취급하고, public path는 그대로 통과시킨다.
  let user = null;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase 환경변수 미설정');

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|\\.well-known/|.*\\.(?:jpg|jpeg|png|gif|svg|webp|avif|ico|css|js|woff|woff2)$).*)'],
};
