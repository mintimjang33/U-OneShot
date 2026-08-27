import Link from 'next/link';
import { getCurrentUser } from '../../lib/supabaseServerAuth';
import { getUserTier } from '../../lib/subscription';
import { TIER_LABEL, TIER_LIMITS } from '../../lib/tierLimits';

export default async function DashboardHome() {
  const user = await getCurrentUser();
  const { tier, expiresAt } = user ? await getUserTier(user.id) : { tier: 'free' as const, expiresAt: null };
  const limit = TIER_LIMITS[tier].multiPublish;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-black">대시보드</h1>
        <Link href="/pricing" className="text-xs font-bold bg-accent-soft text-accent rounded-[var(--radius-pill)] px-3 py-1">
          {TIER_LABEL[tier]} 플랜{expiresAt ? ` · ${new Date(expiresAt).toLocaleDateString('ko-KR')}까지` : ''}
        </Link>
      </div>
      <p className="text-sm text-muted mb-1">먼저 원샷배포로 6개 플랫폼 동시 발행을 시작해보세요.</p>
      <p className="text-xs text-muted mb-8">
        원샷배포 한도: {limit.period === 'day' ? '하루' : '월'} {limit.count}회 ·{' '}
        <Link href="/purchase" className="text-accent font-bold underline">
          업그레이드
        </Link>
      </p>
      <Link href="/dashboard/publish" className="inline-block bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-3">
        원샷배포 열기 →
      </Link>
    </div>
  );
}
