import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';

// 부테나는 사용자별 데이터가 아니라 관리자가 큐레이션한 공유 갤러리다(uos_butena_cases에 user_id 없음).
// 생성/수정은 MCP(upsert_row)로만 하고, 이 라우트는 로그인한 사용자에게 조회만 제공한다.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('uos_butena_cases').select('*').order('view_count', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ cases: data || [] });
}
