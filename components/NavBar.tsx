'use client';

import Link from 'next/link';
import { useLang, T } from '../lib/i18n';

export default function NavBar() {
  const { lang, setLang } = useLang();

  return (
    <header className="border-b border-border sticky top-0 bg-background/90 backdrop-blur z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-black text-lg flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm">U</span>
          U-OneShot
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted">
          <Link href="/platforms" className="hover:text-foreground">
            <T ko="지원 플랫폼" en="Platforms" />
          </Link>
          <Link href="/for" className="hover:text-foreground">
            <T ko="누구를 위한 서비스" en="Who it's for" />
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            <T ko="요금제" en="Pricing" />
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            className="text-xs font-bold text-muted hover:text-foreground border border-border rounded-[var(--radius-pill)] px-3 py-1.5"
          >
            {lang === 'ko' ? 'English' : '한국어'}
          </button>
          <Link
            href="/login"
            className="text-sm font-bold bg-accent text-white rounded-[var(--radius-card-sm)] px-4 py-2 hover:bg-accent-hover"
          >
            <T ko="무료로 시작하기" en="Start free" />
          </Link>
        </div>
      </div>
    </header>
  );
}
