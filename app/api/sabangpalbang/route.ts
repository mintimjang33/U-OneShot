import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { SABANGPALBANG_ANGLES } from '../../../lib/generateImage';

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
  const aspectRatio: string = formData?.get('aspectRatio') === '16:9' ? '16:9' : '9:16';
  const selectedIndexes = String(formData?.get('angleIndexes') || '')
    .split(',')
    .map((s) => Number(s))
    .filter((n) => !Number.isNaN(n) && n >= 0 && n < SABANGPALBANG_ANGLES.length);
  if (selectedIndexes.length === 0) return NextResponse.json({ error: '앵글을 1개 이상 선택해주세요.' }, { status: 400 });

  if (mode === 'video') {
    return NextResponse.json({ error: '동영상 입력모드는 아직 지원하지 않습니다. 이미지 또는 프롬프트를 이용해주세요.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

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
