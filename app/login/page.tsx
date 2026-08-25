'use client';

import { getSupabaseBrowserClient } from '../../lib/supabaseBrowser';

export default function LoginPage() {
  async function handleGoogleLogin() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm bg-white border border-border rounded-[var(--radius-card)] p-8">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-black mx-auto mb-3">U</div>
          <h1 className="font-black text-lg">U-OneShot 로그인</h1>
          <p className="text-xs text-muted mt-1">회원가입 없이 Google 로그인으로 바로 시작</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full border border-border rounded-[var(--radius-card-sm)] py-3 text-sm font-bold hover:bg-neutral-50"
        >
          Google로 계속하기
        </button>

        <div className="text-center mt-6 text-[10px] text-neutral-300 font-black tracking-wide">
          SECURED BY U-ONESHOT VAULT
        </div>
      </div>
    </div>
  );
}
