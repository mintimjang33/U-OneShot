import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase';
import { getCurrentUser } from '../../../../lib/supabaseServerAuth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;

  const supabase = getSupabaseServerClient();
  const { data: project } = await supabase.from('uos_thumbarena_projects').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  return NextResponse.json({ project });
}

// 브라켓 진행은 클라이언트 상태로 처리하고, 최종 우승 썸네일만 여기로 저장한다.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const winnerUrl: string = body?.winnerUrl;
  if (!winnerUrl) return NextResponse.json({ error: 'winnerUrl이 필요합니다.' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data: project, error } = await supabase
    .from('uos_thumbarena_projects')
    .update({ winner_url: winnerUrl, status: 'done' })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error || !project) return NextResponse.json({ error: error?.message || '프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  return NextResponse.json({ project });
}
