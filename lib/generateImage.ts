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
