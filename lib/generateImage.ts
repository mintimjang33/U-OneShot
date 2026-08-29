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
// 2026-08-29 재로그인 실측(10-3절)으로 원본 실제 8개 앵글과 순서를 확인해서 교체함 — 이전 값(정면/
// 3-4앵글/좌측면/우측면/후면/탑다운/로우앵글/클로즈업)은 실측 없이 임의로 지은 것이라 실제와 거의 안 겹쳤음.
export const SABANGPALBANG_ANGLES: { label: string; prompt: string }[] = [
  { label: '익스트림 클로즈업', prompt: 'extreme close-up shot, subject fills the entire frame' },
  { label: '옆모습 클로즈업', prompt: 'side profile close-up crop of the subject' },
  { label: '45도 앵글', prompt: 'shot from a 45-degree oblique angle' },
  { label: '하이 앵글', prompt: 'high angle shot looking down from above' },
  { label: '로우 앵글', prompt: 'low angle shot looking slightly upward, dramatic perspective' },
  { label: '풀샷', prompt: 'full shot with the entire subject framed in view' },
  { label: '뒷모습', prompt: 'back view of the subject seen from behind' },
  { label: '오버더 숄더', prompt: 'over-the-shoulder cinematic angle, camera looking past the subject from behind' },
];

const NANO_BANANA_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '2:3', '3:2'];
function normalizeAspectRatio(aspectRatio?: string): string {
  return aspectRatio && NANO_BANANA_ASPECT_RATIOS.includes(aspectRatio) ? aspectRatio : '9:16';
}

// 사방팔방: 원본 이미지 1장 + 앵글 프롬프트 → fal-ai/nano-banana/edit(Google Gemini 2.5 Flash Image)로
// 같은 스타일·질감을 유지한 채 다른 앵글의 이미지를 생성한다. 원본은 "Google Nano Banana 2"를 이미지
// 모델로 쓰는 걸 실측으로 확인해서(2026-08-29, 10-3절) flux-pro/kontext에서 nano-banana/edit로 전환함
// — 화면비율(aspect_ratio) 파라미터를 명시적으로 받을 수 있어서 5종 비율 선택도 실제로 적용된다.
export async function generateAngleImage(sourceImageUrl: string, anglePrompt: string, aspectRatio?: string): Promise<{ imageUrl: string }> {
  const apiKey = await getRemoteConfig('FAL_KEY');
  if (!apiKey) throw new Error('FAL_KEY가 설정되어 있지 않습니다.');

  const prompt = `Show this exact same subject from a different camera angle: ${anglePrompt}. Keep the same style, texture, materials, colors and lighting as the original image — only the camera angle changes.`;

  const res = await fetch('https://fal.run/fal-ai/nano-banana/edit', {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_urls: [sourceImageUrl],
      aspect_ratio: normalizeAspectRatio(aspectRatio),
      num_images: 1,
      output_format: 'png',
    }),
  });
  const json = await res.json();
  const imageUrl = json.images?.[0]?.url;
  if (!res.ok || !imageUrl) throw new Error(json.detail || JSON.stringify(json));

  return { imageUrl };
}

// 요모조모 "프롬프트" 입력모드: 원본 이미지 없이 텍스트 설명만으로 특정 앵글의 이미지를 새로 그린다
// (image-to-image가 아니라 text-to-image — fal-ai/nano-banana, aspect_ratio 명시 지원).
export async function generateAngleImageFromPrompt(subjectPrompt: string, anglePrompt: string, aspectRatio?: string): Promise<{ imageUrl: string }> {
  const apiKey = await getRemoteConfig('FAL_KEY');
  if (!apiKey) throw new Error('FAL_KEY가 설정되어 있지 않습니다.');

  const prompt = `${subjectPrompt}, ${anglePrompt}, consistent style and lighting across all angles, photorealistic`;

  const res = await fetch('https://fal.run/fal-ai/nano-banana', {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspect_ratio: normalizeAspectRatio(aspectRatio), num_images: 1, output_format: 'png' }),
  });
  const json2 = await res.json();
  const imageUrl2 = json2.images?.[0]?.url;
  if (!res.ok || !imageUrl2) throw new Error(json2.detail || JSON.stringify(json2));

  return { imageUrl: imageUrl2 };
}

// 썸네일 리믹스 "썸네일 변형" 모드: 원본 썸네일 1장 → AI가 변형 이미지를 생성한다(A/B 테스트용).
// "피사체(선택)" 이미지가 같이 오면 fal-ai/nano-banana/edit(Gemini 2.5 Flash Image, image_urls 배열로
// 여러 장을 한 번에 받는 멀티이미지 편집 모델)로 전환해서 원본 썸네일 속 인물을 피사체 이미지의 인물로
// 실제로 교체한다. 기존 flux-pro/kontext는 이미지 1장만 받아서 인물 교체가 불가능했던 부분(FAL_KEY는
// 그대로 재사용, 새 키 발급 불필요).
export async function generateThumbnailVariant(
  sourceImageUrl: string,
  promptText?: string,
  subjectImageUrl?: string
): Promise<{ imageUrl: string }> {
  const apiKey = await getRemoteConfig('FAL_KEY');
  if (!apiKey) throw new Error('FAL_KEY가 설정되어 있지 않습니다.');

  if (subjectImageUrl) {
    const prompt = promptText?.trim()
      ? `Replace the main person in the first image with the person from the second image, keeping the first image's background, composition, text and layout. Then apply this direction: ${promptText}. Keep it eye-catching and clickable as a YouTube thumbnail.`
      : "Replace the main person in the first image with the person from the second image, keeping the first image's background, composition, text and layout unchanged. Keep it eye-catching and clickable as a YouTube thumbnail.";

    const res = await fetch('https://fal.run/fal-ai/nano-banana/edit', {
      method: 'POST',
      headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, image_urls: [sourceImageUrl, subjectImageUrl], num_images: 1, output_format: 'png' }),
    });
    const json = await res.json();
    const imageUrl = json.images?.[0]?.url;
    if (!res.ok || !imageUrl) throw new Error(json.detail || JSON.stringify(json));
    return { imageUrl };
  }

  const prompt = promptText?.trim()
    ? `Create a variation of this thumbnail for A/B testing: ${promptText}. Keep it eye-catching and clickable.`
    : 'Create an eye-catching variation of this thumbnail for A/B testing — change the composition, color grading or emphasis while keeping the same subject and message.';

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
