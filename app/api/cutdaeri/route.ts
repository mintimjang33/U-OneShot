import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { generateCutDaeriScript } from '../../../lib/generateScript';

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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const topic: string = body?.topic;
  const style: string = ['portrait', 'natural', 'editorial'].includes(body?.style) ? body.style : 'natural';
  const aspectRatio: string = body?.aspectRatio === '16:9' ? '16:9' : '9:16';
  if (!topic?.trim()) return NextResponse.json({ error: '주제를 입력해주세요.' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  try {
    const { script, cuts } = await generateCutDaeriScript(topic, style);

    const { data: project, error: projectError } = await supabase
      .from('uos_cutdaeri_projects')
      .insert({ user_id: user.id, topic, script, style, aspect_ratio: aspectRatio, status: 'draft' })
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
