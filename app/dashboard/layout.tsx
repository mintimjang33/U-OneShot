import Link from 'next/link';

const NAV = [
  { href: '/dashboard/publish', label: '원샷배포', ready: true },
  { href: '/dashboard/cut-daeri', label: '컷대리', ready: true },
  { href: '/dashboard/long-daeri', label: '롱대리 · 숏대리', ready: true },
  { href: '/dashboard/upload-rx', label: '업로드 처방전', ready: true },
  { href: '/dashboard/butena', label: '부테나', ready: true },
  { href: '/dashboard/truth-room', label: '진실의방', ready: false },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r border-border p-4 hidden md:block">
        <Link href="/" className="font-black text-lg flex items-center gap-2 mb-8">
          <span className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm">U</span>
          U-OneShot
        </Link>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.ready ? item.href : '#'}
              className={`flex items-center justify-between text-sm rounded-[var(--radius-card-sm)] px-3 py-2 ${
                item.ready ? 'hover:bg-active-bg font-medium' : 'text-neutral-300 cursor-default'
              }`}
            >
              {item.label}
              {!item.ready && <span className="text-[10px] font-bold">준비중</span>}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
