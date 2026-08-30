// 컷비서 4단계(자막 스타일) — 2026-08-30 재로그인 재실측(원본 진짜 편집기 화면)으로 재설계.
// 마이그레이션 25 당시엔 U-Short 워커의 "8개 프리셋 묶음" 시스템을 재사용했는데, 실제 원본은 프리셋이
// 아니라 줄수/크기/위치/폰트/색상/윤곽선/배경이 전부 독립적으로 조절되는 방식이었다. 이 파일은 그
// 독립 조절 항목들의 선택지(폰트 목록, 색상 스와치)와 기본값만 관리하고, U-Short 워커
// (remotion/src/CaptionText.jsx)가 이 값을 그대로 받아서 실제 렌더링에 반영한다.

export const CAPTION_FONTS = [
  { value: 'Pretendard, sans-serif', label: '프리텐다드' },
  { value: '"Nanum Gothic", sans-serif', label: '나눔고딕' },
  { value: '"Noto Sans KR", sans-serif', label: 'Noto Sans KR' },
  { value: '"Nanum Myeongjo", serif', label: '나눔명조' },
  { value: '"GmarketSans", sans-serif', label: 'G마켓 산스' },
  { value: '"Cafe24Ssurround", sans-serif', label: '카페24 써라운드' },
] as const;

// 2026-08-30 재실측: 실제 편집기 색상칩 10개를 DOM에서 그대로 추출한 값(getComputedStyle 대조 완료).
export const CAPTION_COLOR_SWATCHES = [
  '#ffffff', '#000000', '#ffd700', '#ff6b6b', '#00f2ff', '#4ade80', '#a78bfa', '#fb923c', '#f472b6', '#38bdf8',
];

export const CAPTION_BACKGROUND_MODES = [
  { value: 'none', label: '없음' },
  { value: 'thin', label: '얇게' },
  { value: 'thick', label: '두껍게' },
] as const;

export type CaptionStyle = {
  lineCount: 1 | 2 | 3;
  fontSize: number; // px
  position: number; // 0~100 (%) — 세로 위치, 100이 화면 맨 아래
  fontFamily: string;
  color: string;
  outlineEnabled: boolean;
  outlineWidth: number; // px
  background: 'none' | 'thin' | 'thick';
};

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  lineCount: 2,
  fontSize: 24,
  position: 90,
  fontFamily: CAPTION_FONTS[0].value,
  color: '#ffffff',
  outlineEnabled: true,
  outlineWidth: 2,
  background: 'none',
};
