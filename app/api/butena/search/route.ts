import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase';
import { getCurrentUser } from '../../../../lib/supabaseServerAuth';
import { searchViralVideos } from '../../../../lib/searchViral';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const query: string = body?.query;
  if (!query?.trim()) return NextResponse.json({ error: '키워드나 유튜브 링크를 입력해주세요.' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  try {
    const results = await searchViralVideos(query);
    await supabase.from('uos_butena_search_history').insert({ user_id: user.id, query });
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
