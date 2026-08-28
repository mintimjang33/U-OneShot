import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { generateLongDaeriScript } from '../../../lib/generateScript';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_longdaeri_projects')
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
  const tone: string = ['info', 'story', 'persuade'].includes(body?.tone) ? body.tone : 'info';
  if (!topic?.trim()) return NextResponse.json({ error: '주제를 입력해주세요.' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  try {
    const { title, content } = await generateLongDaeriScript(topic, tone);

    const { data: project, error: projectError } = await supabase
      .from('uos_longdaeri_projects')
      .insert({ user_id: user.id, topic, tone, title, content, status: 'done' })
      .select()
      .single();
    if (projectError || !project) throw new Error(projectError?.message || '프로젝트 생성 실패');

    return NextResponse.json({ project });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
