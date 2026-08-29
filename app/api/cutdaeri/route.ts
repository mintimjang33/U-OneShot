import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { splitCutDaeriScript } from '../../../lib/generateScript';

const CUT_COUNT_PRESETS = [3, 5, 8, 10, 12, 16, 20];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_cutdaeri_projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ projects: data || [] });
}

// 컷비서 1단계(원본 스크립트 입력): 사용자가 이미 쓴 원고 + 컷 수를 받아서 컷 단위로 나눈다.
// 스타일/화면비율은 2단계에서 고른다(project 생성 시점엔 아직 없음).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    return createFromImages(request, user.id);
  }

  const body = await request.json().catch(() => null);
  const script: string = body?.script;
  const topic: string | null = body?.topic || null;
  const cutCount: number = CUT_COUNT_PRESETS.includes(body?.cutCount) ? body.cutCount : Number(body?.cutCount) || 0;
  const aspectRatio: string = body?.aspectRatio === '16:9' ? '16:9' : '9:16';
  if (!script?.trim()) return NextResponse.json({ error: '원고를 입력해주세요.' }, { status: 400 });
  if (!cutCount || cutCount < 2 || cutCount > 30) return NextResponse.json({ error: '컷 수를 1~30 사이로 선택해주세요.' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  try {
    const cuts = await splitCutDaeriScript(script, cutCount);

    const { data: project, error: projectError } = await supabase
      .from('uos_cutdaeri_projects')
      .insert({ user_id: user.id, topic, script, cut_count: cutCount, aspect_ratio: aspectRatio, status: 'draft' })
      .select()
      .single();
    if (projectError || !project) throw new Error(projectError?.message || '프로젝트 생성 실패');

    const cutRows = cuts.map((text: string, i: number) => ({ project_id: project.id, order_index: i, text }));
    const { error: cutsError } = await supabase.from('uos_cutdaeri_cuts').insert(cutRows);
    if (cutsError) throw new Error(cutsError.message);

    return NextResponse.json({ project });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 컷비서 1단계 "이미지 입력" 탭(원본 8-1/10-3절 실측): 이미지를 여러 장 올리면 장당 1컷으로 씬이 생성된다.
// 원고를 병행 입력하면 씬 수(=이미지 장수)만큼 자동 분배해 대사로 쓰고, 비워두면 대사 없이 진행한다.
async function createFromImages(request: Request, userId: string) {
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });

  const images = formData.getAll('images').filter((f): f is File => f instanceof File);
  const topic = (formData.get('topic') as string) || null;
  const script = (formData.get('script') as string) || '';
  const aspectRatio = formData.get('aspectRatio') === '16:9' ? '16:9' : '9:16';

  if (images.length === 0) return NextResponse.json({ error: '이미지를 1장 이상 업로드해주세요.' }, { status: 400 });
  if (images.length > 30) return NextResponse.json({ error: '이미지는 최대 30장까지 업로드할 수 있습니다.' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  try {
    const texts = script.trim() ? await splitCutDaeriScript(script, images.length) : new Array(images.length).fill('');

    const { data: project, error: projectError } = await supabase
      .from('uos_cutdaeri_projects')
      .insert({ user_id: userId, topic, script: script.trim() || null, cut_count: images.length, aspect_ratio: aspectRatio, status: 'draft' })
      .select()
      .single();
    if (projectError || !project) throw new Error(projectError?.message || '프로젝트 생성 실패');

    const cutRows = [];
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/cut-input-${project.id}-${i}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('cutdaeri-assets').upload(path, await file.arrayBuffer(), { contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);
      const imageUrl = supabase.storage.from('cutdaeri-assets').getPublicUrl(path).data.publicUrl;
      cutRows.push({ project_id: project.id, order_index: i, text: texts[i] || '', image_url: imageUrl, status: 'done' });
    }
    const { error: cutsError } = await supabase.from('uos_cutdaeri_cuts').insert(cutRows);
    if (cutsError) throw new Error(cutsError.message);

    return NextResponse.json({ project });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
