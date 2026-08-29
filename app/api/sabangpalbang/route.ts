import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { SABANGPALBANG_ANGLES, generateSabangpalbangVideo } from '../../../lib/generateImage';
import { checkSabangpalbangVideoQuota } from '../../../lib/subscription';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_sabangpalbang_projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ projects: data || [] });
}

// 원본(8-6절) 실측: 입력모드 3종(이미지/프롬프트/동영상), 화면비율 선택, 앵글은 체크박스로 원하는 것만 고름.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const mode = String(formData?.get('mode') || 'image');
  const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '2:3', '3:2'];
  const requestedAspectRatio = String(formData?.get('aspectRatio') || '9:16');
  const aspectRatio: string = ASPECT_RATIOS.includes(requestedAspectRatio) ? requestedAspectRatio : '9:16';
  const supabase = getSupabaseServerClient();

  // "동영상" 입력모드는 8개 카메라 앵글 개념이 없다(원본 실측: 소스 이미지+화면비율+추가 프롬프트만으로
  // 이미지→동영상 변환) — 앵글 선택도 요구하지 않고, 컷비서처럼 프로젝트만 만든 뒤 별도 엔드포인트
  // (POST /api/sabangpalbang/[id]/generate-video)에서 실제 생성을 트리거한다.
  if (mode === 'video') {
    const gateError = await checkSabangpalbangVideoQuota(user.id);
    if (gateError) return NextResponse.json({ error: gateError }, { status: 403 });

    const file = formData?.get('image');
    if (!(file instanceof File)) return NextResponse.json({ error: '이미지 파일을 첨부해주세요.' }, { status: 400 });
    const extraPrompt = String(formData?.get('extraPrompt') || '').trim() || null;

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('sabangpalbang-assets')
        .upload(path, await file.arrayBuffer(), { contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);
      const { data: pub } = supabase.storage.from('sabangpalbang-assets').getPublicUrl(path);

      const { data: project, error: projectError } = await supabase
        .from('uos_sabangpalbang_projects')
        .insert({
          user_id: user.id,
          source_image_url: pub.publicUrl,
          input_mode: 'video',
          extra_prompt: extraPrompt,
          aspect_ratio: aspectRatio,
          status: 'generating',
        })
        .select()
        .single();
      if (projectError || !project) throw new Error(projectError?.message || '프로젝트 생성 실패');

      try {
        const { videoUrl } = await generateSabangpalbangVideo(pub.publicUrl, aspectRatio, extraPrompt || undefined);
        const { data: done } = await supabase
          .from('uos_sabangpalbang_projects')
          .update({ output_video_url: videoUrl, status: 'done' })
          .eq('id', project.id)
          .select()
          .single();
        return NextResponse.json({ project: done || project });
      } catch (genErr) {
        await supabase.from('uos_sabangpalbang_projects').update({ status: 'failed' }).eq('id', project.id);
        throw genErr;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const selectedIndexes = String(formData?.get('angleIndexes') || '')
    .split(',')
    .map((s) => Number(s))
    .filter((n) => !Number.isNaN(n) && n >= 0 && n < SABANGPALBANG_ANGLES.length);
  if (selectedIndexes.length === 0) return NextResponse.json({ error: '앵글을 1개 이상 선택해주세요.' }, { status: 400 });

  try {
    let sourceImageUrl: string | null = null;
    let promptText: string | null = null;

    if (mode === 'prompt') {
      promptText = String(formData?.get('prompt') || '').trim();
      if (!promptText) return NextResponse.json({ error: '프롬프트를 입력해주세요.' }, { status: 400 });
    } else {
      const file = formData?.get('image');
      if (!(file instanceof File)) return NextResponse.json({ error: '이미지 파일을 첨부해주세요.' }, { status: 400 });
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('sabangpalbang-assets')
        .upload(path, await file.arrayBuffer(), { contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);
      const { data: pub } = supabase.storage.from('sabangpalbang-assets').getPublicUrl(path);
      sourceImageUrl = pub.publicUrl;
    }

    const { data: project, error: projectError } = await supabase
      .from('uos_sabangpalbang_projects')
      .insert({ user_id: user.id, source_image_url: sourceImageUrl, input_mode: mode, prompt_text: promptText, aspect_ratio: aspectRatio, status: 'draft' })
      .select()
      .single();
    if (projectError || !project) throw new Error(projectError?.message || '프로젝트 생성 실패');

    const angleRows = selectedIndexes.map((i) => ({ project_id: project.id, order_index: i, angle_label: SABANGPALBANG_ANGLES[i].label }));
    const { error: anglesError } = await supabase.from('uos_sabangpalbang_angles').insert(angleRows);
    if (anglesError) throw new Error(anglesError.message);

    return NextResponse.json({ project });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
