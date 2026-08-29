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

// 이번 기간(원샷배포는 tier에 따라 일간 또는 월간) 시작 시각을 구한다.
function periodStart(period: 'day' | 'month'): Date {
  const now = new Date();
  if (period === 'day') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// 원샷배포 발행 전 한도 체크. 초과하면 에러 메시지를 반환하고, 여유 있으면 null을 반환한다.
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
    return `원샷배포 ${periodLabel} 한도(${limit.count}회)를 다 쓰셨어요. 요금제를 업그레이드하면 더 많이 발행할 수 있어요.`;
  }
  return null;
}

// buronai.com /pricing "서비스별 제공 한도 비교" 표(2026-08-29 재로그인 실측)에서 Free 플랜만 막혀있는
// 기능(직언의방/떡상레이더 분석/롱폼비서·숏폼비서/가사비서/업로드 클리닉) 공통 게이트.
export async function checkFeatureGate(
  userId: string,
  feature: 'truthRoom' | 'butenaAnalysis' | 'longformShortform' | 'lyrics' | 'uploadClinic',
  label: string
): Promise<string | null> {
  const { tier } = await getUserTier(userId);
  if (!TIER_LIMITS[tier][feature]) {
    return `${label}은(는) Free 플랜에서는 이용할 수 없어요. 요금제를 업그레이드해주세요.`;
  }
  return null;
}

// 컷비서 이미지/음성/동영상 월간 상한 체크. 정확한 "생성 시각" 컬럼은 없어서, 컷/프로젝트의 created_at을
// 기준으로 이번 달 사용량을 센다(컷 생성과 이미지·음성 생성이 보통 같은 달 안에 일어나므로 근사치로 충분).
async function monthStart(): Promise<Date> {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function checkCutdaeriImageQuota(userId: string): Promise<string | null> {
  const { tier } = await getUserTier(userId);
  const limit = TIER_LIMITS[tier].images;
  if (limit === 0) return '컷비서 이미지 생성은 Standard 이상 플랜부터 이용할 수 있어요.';

  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from('uos_cutdaeri_cuts')
    .select('*, uos_cutdaeri_projects!inner(user_id)', { count: 'exact', head: true })
    .eq('uos_cutdaeri_projects.user_id', userId)
    .not('image_url', 'is', null)
    .gte('created_at', (await monthStart()).toISOString());
  if (error) throw new Error(error.message);

  if ((count || 0) >= limit) return `컷비서 이미지 이번 달 한도(${limit}장)를 다 쓰셨어요. 요금제를 업그레이드해주세요.`;
  return null;
}

export async function checkCutdaeriVoiceQuota(userId: string, textLength: number): Promise<string | null> {
  const { tier } = await getUserTier(userId);
  const limit = TIER_LIMITS[tier].ttsChars;
  if (limit === 0) return '컷비서 음성 생성은 Standard 이상 플랜부터 이용할 수 있어요.';

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_cutdaeri_cuts')
    .select('text, uos_cutdaeri_projects!inner(user_id)')
    .eq('uos_cutdaeri_projects.user_id', userId)
    .not('audio_url', 'is', null)
    .gte('created_at', (await monthStart()).toISOString());
  if (error) throw new Error(error.message);

  const usedChars = (data || []).reduce((sum, row) => sum + (row.text?.length || 0), 0);
  if (usedChars + textLength > limit) return `컷비서 음성 이번 달 글자수 한도(${limit.toLocaleString()}자)를 넘어요. 요금제를 업그레이드해주세요.`;
  return null;
}

export async function checkCutdaeriVideoQuota(userId: string): Promise<string | null> {
  const { tier } = await getUserTier(userId);
  const limit = TIER_LIMITS[tier].videos;
  if (limit === 0) return '컷비서 동영상 생성은 Standard 이상 플랜부터 이용할 수 있어요.';

  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from('uos_cutdaeri_projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'done')
    .gte('created_at', (await monthStart()).toISOString());
  if (error) throw new Error(error.message);

  if ((count || 0) >= limit) return `컷비서 동영상 이번 달 한도(${limit}회)를 다 쓰셨어요. 요금제를 업그레이드해주세요.`;
  return null;
}
