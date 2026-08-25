import Link from 'next/link';

export default function DashboardHome() {
  return (
    <div>
      <h1 className="text-2xl font-black mb-2">대시보드</h1>
      <p className="text-sm text-muted mb-8">먼저 한방살포로 6개 플랫폼 동시 발행을 시작해보세요.</p>
      <Link href="/dashboard/publish" className="inline-block bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-3">
        한방살포 열기 →
      </Link>
    </div>
  );
}
