import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/supabaseServerAuth';
import { CAPTION_FONTS, CAPTION_BACKGROUND_MODES, DEFAULT_CAPTION_STYLE, type CaptionStyle } from '../../../../../lib/captionPresets';

const FONT_VALUES = CAPTION_FONTS.map((f) => f.value);
const BACKGROUND_VALUES = CAPTION_BACKGROUND_MODES.map((b) => b.value);

// 컷비서 4단계(자막 스타일): 줄수/크기/위치/폰트/색상/윤곽선/배경을 독립적으로 저장한다(2026-08-30
// 재실측으로 프리셋 묶음 방식에서 독립 조절 방식으로 재설계함). 실제 렌더링 반영은 U-Short 워커
// (lib/cutDaeriPipeline.js, remotion/src/CaptionText.jsx)가 이 값을 읽어서 처리한다.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const lineCount = [1, 2, 3].includes(body?.lineCount) ? body.lineCount : DEFAULT_CAPTION_STYLE.lineCount;
  const fontSize = Number.isFinite(body?.fontSize) ? Math.min(80, Math.max(12, Number(body.fontSize))) : DEFAULT_CAPTION_STYLE.fontSize;
  const position = Number.isFinite(body?.position) ? Math.min(100, Math.max(0, Number(body.position))) : DEFAULT_CAPTION_STYLE.position;
  const fontFamily = FONT_VALUES.includes(body?.fontFamily) ? body.fontFamily : DEFAULT_CAPTION_STYLE.fontFamily;
  const color = typeof body?.color === 'string' ? body.color : DEFAULT_CAPTION_STYLE.color;
  const outlineEnabled = !!body?.outlineEnabled;
  const outlineWidth = Number.isFinite(body?.outlineWidth) ? Math.min(10, Math.max(0, Number(body.outlineWidth))) : DEFAULT_CAPTION_STYLE.outlineWidth;
  const background = BACKGROUND_VALUES.includes(body?.background) ? body.background : DEFAULT_CAPTION_STYLE.background;

  const captionStyle: CaptionStyle = { lineCount, fontSize, position, fontFamily, color, outlineEnabled, outlineWidth, background };

  const supabase = getSupabaseServerClient();
  const { data: project, error } = await supabase
    .from('uos_cutdaeri_projects')
    .update({ caption_style: captionStyle })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error || !project) return NextResponse.json({ error: error?.message || '프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  return NextResponse.json({ project });
}
