import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../../lib/supabaseServerAuth';
import { SABANGPALBANG_ANGLES, generateAngleImage, generateAngleImageFromPrompt } from '../../../../../../lib/generateImage';

export async function POST(request: Request, { params }: { params: Promise<{ angleId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { angleId } = await params;

  const supabase = getSupabaseServerClient();
  const { data: angle } = await supabase
    .from('uos_sabangpalbang_angles')
    .select('*, uos_sabangpalbang_projects!inner(user_id, source_image_url, input_mode, prompt_text)')
    .eq('id', angleId)
    .maybeSingle();
  if (!angle || angle.uos_sabangpalbang_projects.user_id !== user.id) {
    return NextResponse.json({ error: '앵글을 찾을 수 없습니다.' }, { status: 404 });
  }

  await supabase.from('uos_sabangpalbang_angles').update({ status: 'generating' }).eq('id', angleId);

  try {
    const anglePrompt = SABANGPALBANG_ANGLES[angle.order_index]?.prompt || angle.angle_label;
    const project = angle.uos_sabangpalbang_projects;
    const { imageUrl } =
      project.input_mode === 'prompt'
        ? await generateAngleImageFromPrompt(project.prompt_text, anglePrompt)
        : await generateAngleImage(project.source_image_url, anglePrompt);
    await supabase.from('uos_sabangpalbang_angles').update({ image_url: imageUrl, status: 'done' }).eq('id', angleId);
    return NextResponse.json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from('uos_sabangpalbang_angles').update({ status: 'failed' }).eq('id', angleId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
