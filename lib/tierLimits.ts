export type Tier = 'free' | 'lite' | 'standard' | 'pro';

// buronai.com /pricing "서비스별 제공 한도 비교"(로그인 후 전체 상세표, 2026-08-30 재실측으로 확정.
// 이전 실측은 공개 /pricing 페이지의 요약표만 봐서 사방팔방/썸네일리믹스/추천글감받기 게이트를 놓쳤었음)
// images/ttsChars는 컷비서 월간 사용량 상한(0 = 이용 불가). "컷대리 내보내기"(최종 렌더링)는 전 플랜
// 무제한이라 별도 필드가 없다(2026-08-30 재실측으로 발견 — 예전엔 여기 videos 필드로 잘못 게이트했었음).
// cutdaeriCutVideos: 컷비서 "컷별 동영상"(정지 이미지 대신 짧은 AI 영상클립) 생성 한도.
// 원본 요금제표는 이걸 6s/10s × 768P/1080P 4단계로 나눠 따로 집계하지만, 4단계 모두 같은 숫자라
// 여기선 해상도/길이 구분 없이 한 가지 숫자로 근사한다.
// sabangpalbangImages/sabangpalbangVideos/thumbnailRemix도 같은 패턴(Standard부터 오픈).
// storageGB: "내 저장소" 클라우드 저장소 용량 한도(GB).
// gated는 무제한/불가만 갈리는 기능 — false면 Free에서 아예 못 쓰고, true면 무제한.
export const TIER_LIMITS: Record<
  Tier,
  {
    multiPublish: { count: number; period: 'day' | 'month' };
    images: number;
    ttsChars: number;
    cutdaeriCutVideos: number;
    sabangpalbangImages: number;
    sabangpalbangVideos: number;
    thumbnailRemix: number;
    storageGB: number;
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
    ttsChars: 0,
    cutdaeriCutVideos: 0,
    sabangpalbangImages: 0,
    sabangpalbangVideos: 0,
    thumbnailRemix: 0,
    storageGB: 0.1,
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
    ttsChars: 0,
    cutdaeriCutVideos: 0,
    sabangpalbangImages: 0,
    sabangpalbangVideos: 0,
    thumbnailRemix: 0,
    storageGB: 0.5,
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
    ttsChars: 5000,
    cutdaeriCutVideos: 30,
    sabangpalbangImages: 60,
    sabangpalbangVideos: 30,
    thumbnailRemix: 60,
    storageGB: 1,
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
    ttsChars: 20000,
    cutdaeriCutVideos: 90,
    sabangpalbangImages: 200,
    sabangpalbangVideos: 90,
    thumbnailRemix: 200,
    storageGB: 5,
    truthRoom: true,
    butenaAnalysis: true,
    longformShortform: true,
    lyrics: true,
    uploadClinic: true,
    cutdaeriTopicSuggestion: true,
  },
};

export const TIER_LABEL: Record<Tier, string> = { free: 'Free', lite: 'Lite', standard: 'Standard', pro: 'Pro' };
