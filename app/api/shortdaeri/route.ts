import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { generateShortDaeriScripts } from '../../../lib/generateScript';
import { checkFeatureGate } from '../../../lib/subscription';

// 숏폼비서는 독립 도구다(원본 8-5절) — 롱폼비서 프로젝트 없이 아무 긴 글이나 바로 붙여넣어 쓴다.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_shortdaeri_projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ projects: data || [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const gateError = await checkFeatureGate(user.id, 'longformShortform', '숏폼비서');
  if (gateError) return NextResponse.json({ error: gateError }, { status: 403 });

  const body = await request.json().catch(() => null);
  const sourceText: string = body?.sourceText;
  if (!sourceText?.trim()) return NextResponse.json({ error: '변환할 원고를 입력해주세요.' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  try {
    const { data: project, error: projectError } = await supabase
      .from('uos_shortdaeri_projects')
      .insert({ user_id: user.id, source_text: sourceText })
      .select()
      .single();
    if (projectError || !project) throw new Error(projectError?.message || '프로젝트 생성 실패');

    const shorts = await generateShortDaeriScripts(sourceText);
    const rows = shorts.map((s, i) => ({ project_id: project.id, order_index: i, title: s.title, content: s.content }));
    const { data: inserted, error: itemsError } = await supabase.from('uos_shortdaeri_items').insert(rows).select();
    if (itemsError) throw new Error(itemsError.message);

    return NextResponse.json({ project, shorts: inserted || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
