import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';

// 떡상레이더 "보관함" — 검색 결과 중 사용자가 저장해둔 것.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_butena_cases')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ cases: data || [] });
}

// 검색 결과 카드 하나를 보관함에 저장한다.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { videoUrl, thumbnailUrl, title, channelName, subscriberCount, viewCount, insight } = body || {};
  if (!videoUrl || !title || !channelName || viewCount === undefined) {
    return NextResponse.json({ error: '저장할 항목 정보가 부족합니다.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: item, error } = await supabase
    .from('uos_butena_cases')
    .insert({
      user_id: user.id,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl || null,
      title,
      channel_name: channelName,
      subscriber_count: subscriberCount ?? null,
      view_count: viewCount,
      insight: insight || '구독자 대비 조회수가 높은 영상입니다.',
    })
    .select()
    .single();
  if (error || !item) return NextResponse.json({ error: error?.message || '저장 실패' }, { status: 500 });

  return NextResponse.json({ item });
}
