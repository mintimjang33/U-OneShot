import { getSupabaseServerClient } from './supabase';
import { TIER_LIMITS, type Tier } from './tierLimits';

export function isAdminUser(userId: string): boolean {
  return !!process.env.MCP_OWNER_USER_ID && userId === process.env.MCP_OWNER_USER_ID;
}

// 운영자(MCP_OWNER_USER_ID) 계정은 실제 구독 여부와 무관하게 Pro가 항상 열려있다(유쓰레드 lib/subscription.ts와 동일 원칙).
export async function getUserTier(userId: string): Promise<{ tier: Tier; expiresAt: string | null }> {
  if (isAdminUser(userId)) return { tier: 'pro', expiresAt: null };

  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from('uos_subscriptions').select('*').eq('user_id', userId).maybeSingle();
  if (!data) return { tier: 'free', expiresAt: null };

  const expired = data.expires_at && new Date(data.expires_at) <= new Date();
  if (expired) return { tier: 'free', expiresAt: data.expires_at };
  return { tier: data.tier as Tier, expiresAt: data.expires_at };
}

// 이번 기간(한방살포는 tier에 따라 일간 또는 월간) 시작 시각을 구한다.
function periodStart(period: 'day' | 'month'): Date {
  const now = new Date();
  if (period === 'day') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// 한방살포 발행 전 한도 체크. 초과하면 에러 메시지를 반환하고, 여유 있으면 null을 반환한다.
export async function checkMultiPublishQuota(userId: string): Promise<string | null> {
  const { tier } = await getUserTier(userId);
  const limit = TIER_LIMITS[tier].multiPublish;

  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from('uos_publish_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', periodStart(limit.period).toISOString());
  if (error) throw new Error(error.message);

  if ((count || 0) >= limit.count) {
    const periodLabel = limit.period === 'day' ? '오늘' : '이번 달';
    return `한방살포 ${periodLabel} 한도(${limit.count}회)를 다 쓰셨어요. 요금제를 업그레이드하면 더 많이 발행할 수 있어요.`;
  }
  return null;
}
