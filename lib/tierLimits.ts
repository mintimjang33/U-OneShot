export type Tier = 'free' | 'lite' | 'standard' | 'pro';

// buronai.com /pricing에 실제로 나온 한도 그대로(app/pricing/page.tsx의 PLANS/LIMIT_ROWS와 동일 숫자,
// 2026-08-29 재로그인 실측으로 확정). images/videos/ttsChars는 컷비서 월간 사용량 상한(0 = 이용 불가).
// gated는 무제한/불가만 갈리는 기능(직언의방/떡상레이더 분석/롱폼비서·숏폼비서/가사비서/업로드클리닉) —
// false면 Free에서 아예 못 쓰고, true면 무제한.
export const TIER_LIMITS: Record<
  Tier,
  {
    multiPublish: { count: number; period: 'day' | 'month' };
    images: number;
    videos: number;
    ttsChars: number;
    truthRoom: boolean;
    butenaAnalysis: boolean;
    longformShortform: boolean;
    lyrics: boolean;
    uploadClinic: boolean;
  }
> = {
  free: {
    multiPublish: { count: 2, period: 'month' },
    images: 0,
    videos: 0,
    ttsChars: 0,
    truthRoom: false,
    butenaAnalysis: false,
    longformShortform: false,
    lyrics: false,
    uploadClinic: false,
  },
  lite: {
    multiPublish: { count: 1, period: 'day' },
    images: 0,
    videos: 0,
    ttsChars: 0,
    truthRoom: true,
    butenaAnalysis: true,
    longformShortform: true,
    lyrics: true,
    uploadClinic: true,
  },
  standard: {
    multiPublish: { count: 3, period: 'day' },
    images: 60,
    videos: 30,
    ttsChars: 5000,
    truthRoom: true,
    butenaAnalysis: true,
    longformShortform: true,
    lyrics: true,
    uploadClinic: true,
  },
  pro: {
    multiPublish: { count: 10, period: 'day' },
    images: 200,
    videos: 90,
    ttsChars: 20000,
    truthRoom: true,
    butenaAnalysis: true,
    longformShortform: true,
    lyrics: true,
    uploadClinic: true,
  },
};

export const TIER_LABEL: Record<Tier, string> = { free: 'Free', lite: 'Lite', standard: 'Standard', pro: 'Pro' };
