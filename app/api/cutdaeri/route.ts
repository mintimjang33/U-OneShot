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
