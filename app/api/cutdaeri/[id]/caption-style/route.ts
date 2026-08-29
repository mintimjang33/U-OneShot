import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/supabaseServerAuth';
import { CAPTION_PRESETS, CAPTION_POSITIONS } from '../../../../../lib/captionPresets';

// 컷비서 4단계(자막 스타일): 프리셋 8종 중 하나 또는 커스텀 오버라이드 + 위치를 저장한다.
// 실제 렌더링에 반영하는 건 U-Short 워커(lib/cutDaeriPipeline.js)가 이 컬럼들을 읽어서 처리한다.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const presetId: string = body?.presetId || 'existing-preset-bold-white-outline';
  const position: string = body?.position || 'bottom';
  const custom = body?.custom || null;

  if (!CAPTION_PRESETS.some((p) => p.id === presetId)) {
    return NextResponse.json({ error: '올바른 자막 프리셋을 선택해주세요.' }, { status: 400 });
  }
  if (!CAPTION_POSITIONS.some((p) => p.value === position)) {
    return NextResponse.json({ error: '올바른 자막 위치를 선택해주세요.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: project, error } = await supabase
    .from('uos_cutdaeri_projects')
    .update({ caption_preset_id: presetId, caption_position: position, caption_custom: custom })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error || !project) return NextResponse.json({ error: error?.message || '프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  return NextResponse.json({ project });
}
