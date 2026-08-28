import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase';
import { getCurrentUser } from '../../../../lib/supabaseServerAuth';
import { generateReadingBoxVoice } from '../../../../lib/generateVoice';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('uos_readingbox_scripts').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// 클릭하면 재생 — 처음 재생할 때만 TTS를 생성하고 audio_url에 캐싱해, 다음부터는 바로 재생한다.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { data: script, error: fetchError } = await supabase
    .from('uos_readingbox_scripts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (fetchError || !script) return NextResponse.json({ error: '원고를 찾을 수 없습니다.' }, { status: 404 });

  if (script.audio_url) return NextResponse.json({ audioUrl: script.audio_url });

  try {
    const { audioUrl } = await generateReadingBoxVoice(id, script.content);
    const { error: updateError } = await supabase.from('uos_readingbox_scripts').update({ audio_url: audioUrl }).eq('id', id);
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ audioUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
