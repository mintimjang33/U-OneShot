import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../../lib/supabaseServerAuth';
import { generateCutVoice } from '../../../../../../lib/generateVoice';
import { checkCutdaeriVoiceQuota } from '../../../../../../lib/subscription';

export async function POST(request: Request, { params }: { params: Promise<{ cutId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { cutId } = await params;

  const supabase = getSupabaseServerClient();
  const { data: cut } = await supabase.from('uos_cutdaeri_cuts').select('*, uos_cutdaeri_projects!inner(user_id)').eq('id', cutId).maybeSingle();
  if (!cut || cut.uos_cutdaeri_projects.user_id !== user.id) {
    return NextResponse.json({ error: '컷을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 이미 음성이 있는 컷을 다시 생성하는 경우는 한도 체크에서 건너뛴다.
  if (!cut.audio_url) {
    const quotaError = await checkCutdaeriVoiceQuota(user.id, cut.text.length);
    if (quotaError) return NextResponse.json({ error: quotaError }, { status: 403 });
  }

  try {
    const { audioUrl } = await generateCutVoice(cutId, cut.text);
    await supabase.from('uos_cutdaeri_cuts').update({ audio_url: audioUrl }).eq('id', cutId);
    return NextResponse.json({ audioUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
