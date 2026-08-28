import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/supabaseServerAuth';
import { generateShortDaeriScripts } from '../../../../../lib/generateScript';

// 숏대리: 이미 만들어진 롱대리 원고를 1분 분량 숏폼 대본 여러 편으로 재분할한다.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;

  const supabase = getSupabaseServerClient();
  const { data: project } = await supabase.from('uos_longdaeri_projects').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
  if (!project.content) return NextResponse.json({ error: '원고 내용이 없습니다.' }, { status: 400 });

  try {
    const shorts = await generateShortDaeriScripts(project.content);

    // 다시 분할하면 기존 결과를 대체한다.
    await supabase.from('uos_shortdaeri_items').delete().eq('project_id', id);

    const rows = shorts.map((s, i) => ({ project_id: id, order_index: i, title: s.title, content: s.content }));
    const { data: inserted, error } = await supabase.from('uos_shortdaeri_items').insert(rows).select();
    if (error) throw new Error(error.message);

    return NextResponse.json({ shorts: inserted || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
