import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../../lib/supabaseServerAuth';
import { generateCutImage } from '../../../../../../lib/generateImage';

export async function POST(request: Request, { params }: { params: Promise<{ cutId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { cutId } = await params;

  const supabase = getSupabaseServerClient();
  const { data: cut } = await supabase.from('uos_cutdaeri_cuts').select('*, uos_cutdaeri_projects!inner(user_id, style)').eq('id', cutId).maybeSingle();
  if (!cut || cut.uos_cutdaeri_projects.user_id !== user.id) {
    return NextResponse.json({ error: '컷을 찾을 수 없습니다.' }, { status: 404 });
  }

  await supabase.from('uos_cutdaeri_cuts').update({ status: 'generating' }).eq('id', cutId);

  try {
    const { imageUrl } = await generateCutImage(cut.text, cut.uos_cutdaeri_projects.style);
    await supabase.from('uos_cutdaeri_cuts').update({ image_url: imageUrl, status: 'done' }).eq('id', cutId);
    return NextResponse.json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from('uos_cutdaeri_cuts').update({ status: 'failed' }).eq('id', cutId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
