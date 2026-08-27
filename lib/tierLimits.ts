export type Tier = 'free' | 'lite' | 'standard' | 'pro';

// buronai.com /pricing에 실제로 나온 한도 그대로(app/pricing/page.tsx의 PLANS/LIMIT_ROWS와 동일 숫자).
// 이미지/동영상/음성은 컷대리(Phase 2) 등 아직 없는 기능용 — 지금은 정의만 해두고, 해당 도구를
// 만들 때 이 값을 그대로 가져다 쓰면 된다. 지금 실제로 강제하는 건 multiPublish(원샷배포)뿐이다.
export const TIER_LIMITS: Record<
  Tier,
  { multiPublish: { count: number; period: 'day' | 'month' }; images: number; videos: number; ttsChars: number }
> = {
  free: { multiPublish: { count: 2, period: 'month' }, images: 0, videos: 0, ttsChars: 0 },
  lite: { multiPublish: { count: 1, period: 'day' }, images: 0, videos: 0, ttsChars: 0 },
  standard: { multiPublish: { count: 3, period: 'day' }, images: 60, videos: 30, ttsChars: 5000 },
  pro: { multiPublish: { count: 10, period: 'day' }, images: 200, videos: 90, ttsChars: 20000 },
};

export const TIER_LABEL: Record<Tier, string> = { free: 'Free', lite: 'Lite', standard: 'Standard', pro: 'Pro' };
