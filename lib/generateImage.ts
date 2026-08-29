import { getRemoteConfig } from './remoteConfig';

// 컷비서 2단계(이미지 스타일) — 2026-08-29 재로그인 실측(10-3절)으로 원본 실제 스타일 프리셋을 확인해서
// 3개(portrait/natural/editorial)에서 19개로 확장함. "레퍼런스 이미지"(업로드한 이미지의 스타일을
// 그대로 따라가는 옵션)는 별도 이미지 입력 처리가 필요해서 이번 재작업 범위에서는 제외함 — 필요하면
// 다음에 캐릭터 레퍼런스와는 별개로 추가할 것.
export const CUTDAERI_STYLES: { value: string; label: string; prompt: string }[] = [
  { value: 'portrait', label: '인물 중심', prompt: 'photorealistic portrait photography, cinematic lighting, shallow depth of field, focus on a person' },
  { value: 'natural', label: '내추럴', prompt: 'photorealistic environmental photography, natural lighting, wide shot, atmospheric background' },
  { value: 'editorial', label: '에디토리얼', prompt: 'professional editorial photography, studio lighting, clean minimal composition' },
  { value: 'illustration', label: '일러스트', prompt: 'digital illustration, clean linework, flat colors' },
  { value: '3d_character', label: '3D 캐릭터', prompt: '3D rendered character illustration, pixar-like style, soft studio lighting' },
  { value: 'risograph', label: '리소그래프', prompt: 'risograph print style, limited color palette, grainy halftone texture' },
  { value: 'pixel_art', label: '픽셀아트', prompt: 'pixel art style, retro video game aesthetic' },
  { value: 'oil_painting', label: '유화', prompt: 'oil painting style, visible brush strokes, rich color depth' },
  { value: 'korean_traditional', label: '한국 전통화', prompt: 'traditional Korean ink painting style, minhwa folk art aesthetic' },
  { value: 'cartoon', label: '카툰', prompt: 'cartoon illustration style, bold outlines, vibrant flat colors' },
  { value: 'pop_surreal', label: '팝 초현실', prompt: 'pop surrealism art style, dreamlike vivid colors' },
  { value: 'vibrant_film', label: '비브런트 필름', prompt: 'vibrant film photography, saturated colors, punchy contrast' },
  { value: 'fashion_photo', label: '패션 포토', prompt: 'high fashion editorial photography, dramatic studio lighting' },
  { value: 'glitch_collage', label: '글리치 콜라주', prompt: 'glitch art collage style, digital distortion effects' },
  { value: 'retro_film', label: '레트로 필름', prompt: 'retro film photography, vintage grain, faded colors' },
  { value: 'cross_process', label: '크로스프로세스', prompt: 'cross-processed film photography, shifted color tones' },
  { value: 'film_landscape', label: '필름 풍경', prompt: 'cinematic landscape film photography, wide vista' },
  { value: 'bold_line', label: '볼드 라인', prompt: 'bold line art illustration, thick black outlines, minimal shading' },
  { value: 'watercolor', label: '수채화', prompt: 'watercolor painting style, soft washes, delicate color bleed' },
];

const CUTDAERI_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'];
function normalizeCutdaeriAspectRatio(aspectRatio?: string): string {
  return aspectRatio && CUTDAERI_ASPECT_RATIOS.includes(aspectRatio) ? aspectRatio : '9:16';
}

// 컷 텍스트 기반 이미지를 생성한다. 원본이 "Google Nano Banana 2"를 이미지 모델로 쓰는 걸 실측으로
// 확인해서(2026-08-29) fal-ai/nano-banana(계열)로 통일함. characterImageUrl이 있으면(2단계 "캐릭터"
// 섹션에서 업로드) nano-banana/edit으로 그 인물을 참조해 모든 컷에 동일 인물이 등장하도록 하고,
// 없으면 순수 text-to-image로 생성한다.
export async function generateCutImage(
  cutText: string,
  style: string,
  aspectRatio?: string,
  characterImageUrl?: string,
  directionPrompt?: string
): Promise<{ imageUrl: string }> {
  const apiKey = await getRemoteConfig('FAL_KEY');
  if (!apiKey) throw new Error('FAL_KEY가 설정되어 있지 않습니다.');

  const stylePrompt = CUTDAERI_STYLES.find((s) => s.value === style)?.prompt || CUTDAERI_STYLES[1].prompt;
  const directionPart = directionPrompt?.trim() ? ` ${directionPrompt}.` : '';
  const ratio = normalizeCutdaeriAspectRatio(aspectRatio);

  if (characterImageUrl) {
    const prompt =
      `Depict the same character/person from the reference image in this new scene, keeping their face and appearance ` +
      `consistent: ${cutText}. Style: ${stylePrompt}.${directionPart}`;
    const res = await fetch('https://fal.run/fal-ai/nano-banana/edit', {
      method: 'POST',
      headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, image_urls: [characterImageUrl], aspect_ratio: ratio, num_images: 1, output_format: 'png' }),
    });
    const json = await res.json();
    const imageUrl = json.images?.[0]?.url;
    if (!res.ok || !imageUrl) throw new Error(json.detail || JSON.stringify(json));
    return { imageUrl };
  }

  const prompt = `${stylePrompt}, ${cutText}.${directionPart}`;
  const res = await fetch('https://fal.run/fal-ai/nano-banana', {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspect_ratio: ratio, num_images: 1, output_format: 'png' }),
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

// 썸네일 리믹스 "카피라이팅" 모드 — 2026-08-29 재로그인 실측(10-3절)으로 재설계: 이전엔 텍스트 문구만
// 뽑았지만, 실제 원본은 완성된 썸네일 이미지를 만드는 기능이다(텍스트+분위기+레이아웃+스타일을 반영한
// 이미지 자체를 생성). fal-ai/nano-banana(text-to-image, 16:9 유튜브 썸네일 비율)로 생성한다.
export const THUMBNAIL_COPY_LAYOUTS: Record<string, string> = {
  텍스트좌측: 'the bold headline text positioned on the left side of the frame',
  텍스트우측: 'the bold headline text positioned on the right side of the frame',
  중앙집중: 'the bold headline text centered in the middle of the frame',
  분할화면: 'a split-screen composition with the headline text separating the two halves',
  풀블리드: 'a full-bleed image filling the entire frame with the headline text overlaid on top',
  대각선분할: 'a diagonal split composition with the headline text along the diagonal',
};

export const THUMBNAIL_COPY_STYLES: Record<string, string> = {
  드라마틱: 'dramatic, high contrast lighting, bold hard shadows',
  시네마틱: 'cinematic, film-like color grading, moody atmosphere',
  '팝/컬러풀': 'pop art style, vibrant saturated colors, playful energy',
  '클린/미니멀': 'clean, minimalist, plenty of negative space, simple color palette',
};

export async function generateThumbnailCopyImage(
  copyText: string,
  mood: string | undefined,
  layout: string,
  style: string,
  extraPrompt?: string
): Promise<{ imageUrl: string }> {
  const apiKey = await getRemoteConfig('FAL_KEY');
  if (!apiKey) throw new Error('FAL_KEY가 설정되어 있지 않습니다.');

  const layoutDesc = THUMBNAIL_COPY_LAYOUTS[layout] || THUMBNAIL_COPY_LAYOUTS.텍스트좌측;
  const styleDesc = THUMBNAIL_COPY_STYLES[style] || THUMBNAIL_COPY_STYLES.드라마틱;
  const moodPart = mood?.trim() ? ` The overall mood/tone should be: ${mood}.` : '';
  const extraPart = extraPrompt?.trim() ? ` Additional direction: ${extraPrompt}.` : '';

  const prompt =
    `Design an eye-catching YouTube thumbnail. Render the exact text "${copyText}" as a large, bold, highly readable ` +
    `headline with a thick outline or drop shadow so it stands out against the background. Layout: ${layoutDesc}. ` +
    `Visual style: ${styleDesc}.${moodPart}${extraPart} Make it look like a professional, high-CTR YouTube thumbnail.`;

  const res = await fetch('https://fal.run/fal-ai/nano-banana', {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspect_ratio: '16:9', num_images: 1, output_format: 'png' }),
  });
  const json2 = await res.json();
  const imageUrl2 = json2.images?.[0]?.url;
  if (!res.ok || !imageUrl2) throw new Error(json2.detail || JSON.stringify(json2));

  return { imageUrl: imageUrl2 };
}
