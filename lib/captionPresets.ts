// 컷비서 4단계(자막 스타일) — U-Short 워커(remotion/src/captionPresets.js)와 값을 그대로 맞춘 8종
// 프리셋. 실제 렌더링은 저 파일이 하고, 여기 값은 프론트 미리보기 + DB 저장용 id/label만 쓴다.
export type CaptionPreset = {
  id: string;
  label: string;
  fontWeight: number;
  fontSize: number;
  color: string;
  backgroundColor: string | null;
  outlineColor: string | null;
  outlineWidth: number;
  pill?: boolean;
};

export const CAPTION_PRESETS: CaptionPreset[] = [
  { id: 'existing-preset-bold-white-outline', label: '기본 · 흰글씨 굵은 외곽선', fontWeight: 800, fontSize: 58, color: '#ffffff', backgroundColor: null, outlineColor: '#000000', outlineWidth: 8 },
  { id: 'existing-preset-black-bar-bold', label: '기본 · 검정박스 흰글씨', fontWeight: 700, fontSize: 52, color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.75)', outlineColor: null, outlineWidth: 0 },
  { id: 'existing-preset-yellow-accent-bold', label: '노랑 볼드', fontWeight: 800, fontSize: 56, color: '#ffd400', backgroundColor: null, outlineColor: '#1a1a1a', outlineWidth: 6 },
  { id: 'existing-preset-minimal-white', label: '미니멀 화이트', fontWeight: 500, fontSize: 46, color: '#ffffff', backgroundColor: null, outlineColor: null, outlineWidth: 0 },
  { id: 'existing-preset-pastel-blue', label: '파스텔 블루', fontWeight: 700, fontSize: 52, color: '#eaf6ff', backgroundColor: 'rgba(84,164,255,0.35)', outlineColor: null, outlineWidth: 0 },
  { id: 'existing-preset-punch-outline', label: '펀치 아웃라인', fontWeight: 900, fontSize: 60, color: '#ffffff', backgroundColor: null, outlineColor: '#ff3b6f', outlineWidth: 10 },
  { id: 'existing-preset-pink-rounded', label: '핑크 라운드', fontWeight: 700, fontSize: 50, color: '#ffffff', backgroundColor: '#ff6fa5', outlineColor: null, outlineWidth: 0, pill: true },
  { id: 'existing-preset-black-pill', label: '블랙 알약', fontWeight: 700, fontSize: 50, color: '#ffffff', backgroundColor: 'rgba(10,10,10,0.85)', outlineColor: null, outlineWidth: 0, pill: true },
];

export const CAPTION_POSITIONS = [
  { value: 'top', label: '상단' },
  { value: 'middle', label: '중앙' },
  { value: 'bottom', label: '하단' },
] as const;

export const DEFAULT_CAPTION_PRESET_ID = 'existing-preset-bold-white-outline';

export type CaptionCustom = {
  color?: string;
  backgroundColor?: string | null;
  outlineColor?: string | null;
  outlineWidth?: number;
  fontSize?: number;
};
