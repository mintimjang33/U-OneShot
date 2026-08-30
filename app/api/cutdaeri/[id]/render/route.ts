import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/supabaseServerAuth';

// 실제 렌더링은 여기서 하지 않는다 — status를 'rendering'으로 바꿔두기만 하면, 유쇼츠(U-Short)의
// 로컬 워커(scripts/worker.js, 같은 Supabase 프로젝트를 공유)가 폴링해서 가져가 처리한다.
// 이 API 라우트가 하는 일은 "대기열에 올리기"뿐이다.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;

  const supabase = getSupabaseServerClient();
  const { data: project } = await supabase.from('uos_cutdaeri_projects').select('id, user_id').eq('id', id).maybeSingle();
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
  }

  const { data: cuts } = await supabase.from('uos_cutdaeri_cuts').select('image_url, video_url, audio_url').eq('project_id', id);
  const missing = (cuts || []).some((c) => !(c.image_url || c.video_url) || !c.audio_url);
  if (missing) {
    return NextResponse.json({ error: '아직 이미지/동영상 또는 음성이 없는 컷이 있어요. 전부 생성한 뒤 다시 시도해주세요.' }, { status: 400 });
  }

  // 요금제표 재실측(2026-08-30) 결과 "컷대리 내보내기"는 Free 포함 전 플랜 무제한(all_inclusive) —
  // 월간 한도는 컷별 이미지/TTS/동영상 생성에만 걸리고 최종 렌더링 자체엔 걸리지 않는다.
  const { error } = await supabase.from('uos_cutdaeri_projects').update({ status: 'rendering' }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
