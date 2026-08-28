import { getRemoteConfig } from './remoteConfig';

const STYLE_PREFIX: Record<string, string> = {
  portrait: 'photorealistic portrait photography, cinematic lighting, shallow depth of field, focus on a person,',
  natural: 'photorealistic environmental photography, natural lighting, wide shot, atmospheric background,',
  editorial: 'professional product photography, studio lighting, clean minimal background, editorial style,',
};

// fal.ai flux/schnell로 컷 텍스트 기반 이미지를 생성한다. 컷대리 스타일(인물/내추럴/에디토리얼)별로
// 고정 프롬프트 접두사를 붙여 톤앤매너를 통일한다.
// ⚠️ 캐릭터 일관성(레퍼런스 이미지로 동일 인물 유지)은 아직 미구현 — 다음 단계에서 image-to-image로 확장 예정.
export async function generateCutImage(cutText: string, style: string): Promise<{ imageUrl: string }> {
  const apiKey = await getRemoteConfig('FAL_KEY');
  if (!apiKey) throw new Error('FAL_KEY가 설정되어 있지 않습니다.');

  const prompt = `${STYLE_PREFIX[style] || STYLE_PREFIX.natural} ${cutText}`;

  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: 'portrait_16_9', num_images: 1 }),
  });
  const json = await res.json();
  const imageUrl = json.images?.[0]?.url;
  if (!res.ok || !imageUrl) throw new Error(json.detail || JSON.stringify(json));

  return { imageUrl };
}

// 사방팔방: 8개 앵글 정의(순서 고정). order_index로 참조한다.
export const SABANGPALBANG_ANGLES: { label: string; prompt: string }[] = [
  { label: '정면', prompt: 'front view, direct frontal angle' },
  { label: '3/4 앵글', prompt: '3/4 angle view from the front-left' },
  { label: '좌측면', prompt: 'left side profile view, 90 degrees' },
  { label: '우측면', prompt: 'right side profile view, 90 degrees' },
  { label: '후면', prompt: 'back view, rear angle' },
  { label: '탑다운', prompt: "top-down bird's eye view, looking straight down" },
  { label: '로우앵글', prompt: 'low angle view looking upward, dramatic perspective' },
  { label: '클로즈업', prompt: 'close-up macro detail shot, sharp focus on texture' },
];

// 사방팔방: 원본 이미지 1장 + 앵글 프롬프트 → fal.ai flux-pro/kontext(이미지 편집 모델)로 같은 스타일·질감을
// 유지한 채 다른 앵글의 이미지를 생성한다. 텍스트만으로 새로 그리는 generateCutImage와 달리, 원본 이미지를
// image_url로 함께 넘겨서 "이 피사체를 다른 각도에서" 편집하도록 시킨다.
export async function generateAngleImage(sourceImageUrl: string, anglePrompt: string): Promise<{ imageUrl: string }> {
  const apiKey = await getRemoteConfig('FAL_KEY');
  if (!apiKey) throw new Error('FAL_KEY가 설정되어 있지 않습니다.');

  const prompt = `Show this exact same subject from a different camera angle: ${anglePrompt}. Keep the same style, texture, materials, colors and lighting as the original image — only the camera angle changes.`;

  const res = await fetch('https://fal.run/fal-ai/flux-pro/kontext', {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_url: sourceImageUrl, num_images: 1, output_format: 'png' }),
  });
  const json = await res.json();
  const imageUrl = json.images?.[0]?.url;
  if (!res.ok || !imageUrl) throw new Error(json.detail || JSON.stringify(json));

  return { imageUrl };
}

// 요모조모 "프롬프트" 입력모드: 원본 이미지 없이 텍스트 설명만으로 특정 앵글의 이미지를 새로 그린다
// (image-to-image가 아니라 text-to-image — fal.ai flux/schnell 사용).
export async function generateAngleImageFromPrompt(subjectPrompt: string, anglePrompt: string): Promise<{ imageUrl: string }> {
  const apiKey = await getRemoteConfig('FAL_KEY');
  if (!apiKey) throw new Error('FAL_KEY가 설정되어 있지 않습니다.');

  const prompt = `${subjectPrompt}, ${anglePrompt}, consistent style and lighting across all angles, photorealistic`;

  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: 'square_hd', num_images: 1 }),
  });
  const json2 = await res.json();
  const imageUrl2 = json2.images?.[0]?.url;
  if (!res.ok || !imageUrl2) throw new Error(json2.detail || JSON.stringify(json2));

  return { imageUrl: imageUrl2 };
}
