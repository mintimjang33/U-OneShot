import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { generateUploadRx } from '../../../lib/generateScript';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_uploadrx_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data || [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const keyword: string = body?.keyword;
  if (!keyword?.trim()) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  try {
    const { titles, description, hashtags } = await generateUploadRx(keyword);

    const { data: item, error: insertError } = await supabase
      .from('uos_uploadrx_items')
      .insert({ user_id: user.id, keyword, titles, description, hashtags })
      .select()
      .single();
    if (insertError || !item) throw new Error(insertError?.message || '저장 실패');

    return NextResponse.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
