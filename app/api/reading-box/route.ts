import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const q = new URL(request.url).searchParams.get('q')?.trim();
  const supabase = getSupabaseServerClient();
  let query = supabase.from('uos_readingbox_scripts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ scripts: data || [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const title: string = body?.title;
  const content: string = body?.content;
  if (!title?.trim() || !content?.trim()) return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data: script, error } = await supabase
    .from('uos_readingbox_scripts')
    .insert({ user_id: user.id, title, content })
    .select()
    .single();
  if (error || !script) return NextResponse.json({ error: error?.message || '저장 실패' }, { status: 500 });

  return NextResponse.json({ script });
}
