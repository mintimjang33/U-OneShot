import Link from 'next/link';
import { T } from '../lib/i18n';

export default function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row justify-between gap-4 text-xs text-muted">
        <div>© U-OneShot</div>
        <div className="flex gap-4">
          <Link href="/terms">
            <T ko="이용약관" en="Terms" />
          </Link>
          <Link href="/privacy">
            <T ko="개인정보처리방침" en="Privacy" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
