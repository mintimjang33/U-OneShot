import Link from 'next/link';

// 원본(8절) 실측 사이드바 순서 그대로: 한방살포→컷대리→진실의방→부테나→롱대리→숏대리→
// 가사도우미→사방팔방→업로드처방전→썸네일이상형월드컵→비콘.
const NAV = [
  { href: '/dashboard/publish', label: '원샷배포', ready: true },
  { href: '/dashboard/cut-daeri', label: '컷비서', ready: true },
  { href: '/dashboard/truth-room', label: '직언의방', ready: true },
  { href: '/dashboard/butena', label: '떡상레이더', ready: true },
  { href: '/dashboard/long-daeri', label: '롱폼비서', ready: true },
  { href: '/dashboard/short-daeri', label: '숏폼비서', ready: true },
  { href: '/dashboard/lyrics', label: '가사비서', ready: true },
  { href: '/dashboard/sabangpalbang', label: '요모조모', ready: true },
  { href: '/dashboard/upload-rx', label: '업로드 클리닉', ready: true },
  { href: '/dashboard/thumbnail-arena', label: '썸네일 리믹스', ready: true },
  { href: '/dashboard/reading-box', label: '리딩박스', ready: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
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
                item.ready ? 'hover:bg-active-bg font-medium' : 'text-white/30 cursor-default'
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
