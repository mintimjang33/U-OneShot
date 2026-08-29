import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { generateThumbnailVariant, generateThumbnailCopyImage } from '../../../lib/generateImage';
import { checkThumbnailRemixQuota } from '../../../lib/subscription';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_thumbnailremix_projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ projects: data || [] });
}

// 원본(8-8절, 10-3절 재실측) 실측: "이상형 월드컵"이라는 이름과 달리 실제로는 2모드 도구다.
// - variation(썸네일 변형): 원본 1장 → 2/3/4개 변형 이미지 생성.
// - copywriting(카피라이팅): 텍스트+분위기+레이아웃(6종)+스타일(4종)을 반영한 완성 썸네일 이미지 1장 생성
//   (2026-08-29 재실측 전에는 텍스트 문구만 뽑는 걸로 잘못 만들어져 있었음).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const gateError = await checkThumbnailRemixQuota(user.id);
  if (gateError) return NextResponse.json({ error: gateError }, { status: 403 });

  const formData = await request.formData().catch(() => null);
  const mode = String(formData?.get('mode') || 'variation');
  const supabase = getSupabaseServerClient();

  try {
    if (mode === 'copywriting') {
      const copyText = String(formData?.get('copyText') || '').trim();
      const mood = String(formData?.get('mood') || '').trim() || null;
      const layout = String(formData?.get('layout') || '텍스트좌측');
      const visualStyle = String(formData?.get('visualStyle') || '드라마틱');
      const extraPrompt = String(formData?.get('extraPrompt') || '').trim() || null;
      if (!copyText) return NextResponse.json({ error: '썸네일 텍스트를 입력해주세요.' }, { status: 400 });

      const { imageUrl } = await generateThumbnailCopyImage(copyText, mood || undefined, layout, visualStyle, extraPrompt || undefined);
      const { data: project, error } = await supabase
        .from('uos_thumbnailremix_projects')
        .insert({
          user_id: user.id,
          mode: 'copywriting',
          copy_text: copyText,
          mood,
          layout,
          visual_style: visualStyle,
          prompt_text: extraPrompt,
          variant_count: 1,
          image_urls: [imageUrl],
          status: 'done',
        })
        .select()
        .single();
      if (error || !project) throw new Error(error?.message || '프로젝트 생성 실패');
      return NextResponse.json({ project });
    }

    // variation 모드
    const file = formData?.get('image');
    if (!(file instanceof File)) return NextResponse.json({ error: '원본 썸네일 이미지를 첨부해주세요.' }, { status: 400 });
    const promptText = String(formData?.get('prompt') || '').trim() || null;
    const subjectFile = formData?.get('subjectImage');
    const variantCount = [2, 3, 4].includes(Number(formData?.get('variantCount'))) ? Number(formData?.get('variantCount')) : 2;

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('thumbarena-assets').upload(path, await file.arrayBuffer(), { contentType: file.type });
    if (uploadError) throw new Error(uploadError.message);
    const { data: pub } = supabase.storage.from('thumbarena-assets').getPublicUrl(path);
    const sourceImageUrl = pub.publicUrl;

    let subjectImageUrl: string | null = null;
    if (subjectFile instanceof File) {
      const sExt = subjectFile.name.split('.').pop() || 'jpg';
      const sPath = `${user.id}/subject-${Date.now()}.${sExt}`;
      const { error: sErr } = await supabase.storage.from('thumbarena-assets').upload(sPath, await subjectFile.arrayBuffer(), { contentType: subjectFile.type });
      if (!sErr) subjectImageUrl = supabase.storage.from('thumbarena-assets').getPublicUrl(sPath).data.publicUrl;
    }

    const { data: project, error: projectError } = await supabase
      .from('uos_thumbnailremix_projects')
      .insert({
        user_id: user.id,
        mode: 'variation',
        source_image_url: sourceImageUrl,
        subject_image_url: subjectImageUrl,
        prompt_text: promptText,
        variant_count: variantCount,
        status: 'draft',
      })
      .select()
      .single();
    if (projectError || !project) throw new Error(projectError?.message || '프로젝트 생성 실패');

    const variants = await Promise.all(
      Array.from({ length: variantCount }, () => generateThumbnailVariant(sourceImageUrl, promptText || undefined, subjectImageUrl || undefined))
    );
    const imageUrls = variants.map((v) => v.imageUrl);

    const { data: updated, error: updateError } = await supabase
      .from('uos_thumbnailremix_projects')
      .update({ image_urls: imageUrls, status: 'done' })
      .eq('id', project.id)
      .select()
      .single();
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ project: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
