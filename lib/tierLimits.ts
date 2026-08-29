export type Tier = 'free' | 'lite' | 'standard' | 'pro';

// buronai.com /pricing "서비스별 제공 한도 비교"(로그인 후 전체 상세표, 2026-08-30 재실측으로 확정.
// 이전 실측은 공개 /pricing 페이지의 요약표만 봐서 사방팔방/썸네일리믹스/추천글감받기 게이트를 놓쳤었음)
// images/videos/ttsChars는 컷비서 월간 사용량 상한(0 = 이용 불가).
// sabangpalbangImages/sabangpalbangVideos/thumbnailRemix도 같은 패턴(Standard부터 오픈).
// gated는 무제한/불가만 갈리는 기능 — false면 Free에서 아예 못 쓰고, true면 무제한.
export const TIER_LIMITS: Record<
  Tier,
  {
    multiPublish: { count: number; period: 'day' | 'month' };
    images: number;
    videos: number;
    ttsChars: number;
    sabangpalbangImages: number;
    sabangpalbangVideos: number;
    thumbnailRemix: number;
    truthRoom: boolean;
    butenaAnalysis: boolean;
    longformShortform: boolean;
    lyrics: boolean;
    uploadClinic: boolean;
    cutdaeriTopicSuggestion: boolean;
  }
> = {
  free: {
    multiPublish: { count: 2, period: 'month' },
    images: 0,
    videos: 0,
    ttsChars: 0,
    sabangpalbangImages: 0,
    sabangpalbangVideos: 0,
    thumbnailRemix: 0,
    truthRoom: false,
    butenaAnalysis: false,
    longformShortform: false,
    lyrics: false,
    uploadClinic: false,
    cutdaeriTopicSuggestion: false,
  },
  lite: {
    multiPublish: { count: 1, period: 'day' },
    images: 0,
    videos: 0,
    ttsChars: 0,
    sabangpalbangImages: 0,
    sabangpalbangVideos: 0,
    thumbnailRemix: 0,
    truthRoom: true,
    butenaAnalysis: true,
    longformShortform: true,
    lyrics: true,
    uploadClinic: true,
    cutdaeriTopicSuggestion: true,
  },
  standard: {
    multiPublish: { count: 3, period: 'day' },
    images: 60,
    videos: 30,
    ttsChars: 5000,
    sabangpalbangImages: 60,
    sabangpalbangVideos: 30,
    thumbnailRemix: 60,
    truthRoom: true,
    butenaAnalysis: true,
    longformShortform: true,
    lyrics: true,
    uploadClinic: true,
    cutdaeriTopicSuggestion: true,
  },
  pro: {
    multiPublish: { count: 10, period: 'day' },
    images: 200,
    videos: 90,
    ttsChars: 20000,
    sabangpalbangImages: 200,
    sabangpalbangVideos: 90,
    thumbnailRemix: 200,
    truthRoom: true,
    butenaAnalysis: true,
    longformShortform: true,
    lyrics: true,
    uploadClinic: true,
    cutdaeriTopicSuggestion: true,
  },
};

export const TIER_LABEL: Record<Tier, string> = { free: 'Free', lite: 'Lite', standard: 'Standard', pro: 'Pro' };
