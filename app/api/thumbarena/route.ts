import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { generateThumbnailVariant } from '../../../lib/generateImage';
import { generateThumbnailCopy } from '../../../lib/generateScript';

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

// 원본(8-8절) 실측: "이상형 월드컵"이라는 이름과 달리 실제로는 2모드 도구다.
// - variation(썸네일 변형): 원본 1장 → 2/3/4개 변형 이미지 생성.
// - copywriting(카피라이팅): 주제 → 썸네일용 짧은 문구 여러 개(이 모드 UI는 미확인 상태라 추정 구현).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const mode = String(formData?.get('mode') || 'variation');
  const supabase = getSupabaseServerClient();

  try {
    if (mode === 'copywriting') {
      const topic = String(formData?.get('topic') || '').trim();
      const variantCount = [2, 3, 4].includes(Number(formData?.get('variantCount'))) ? Number(formData?.get('variantCount')) : 3;
      if (!topic) return NextResponse.json({ error: '주제를 입력해주세요.' }, { status: 400 });

      const copies = await generateThumbnailCopy(topic, variantCount);
      const { data: project, error } = await supabase
        .from('uos_thumbnailremix_projects')
        .insert({ user_id: user.id, mode: 'copywriting', topic, variant_count: variantCount, result_texts: copies, status: 'done' })
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
