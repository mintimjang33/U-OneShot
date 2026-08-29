import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/supabaseServerAuth';
import { generateSabangpalbangVideo } from '../../../../../lib/generateImage';
import { checkSabangpalbangVideoQuota } from '../../../../../lib/subscription';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;

  const gateError = await checkSabangpalbangVideoQuota(user.id);
  if (gateError) return NextResponse.json({ error: gateError }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data: project } = await supabase.from('uos_sabangpalbang_projects').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!project || project.input_mode !== 'video' || !project.source_image_url) {
    return NextResponse.json({ error: '동영상 프로젝트를 찾을 수 없습니다.' }, { status: 404 });
  }

  await supabase.from('uos_sabangpalbang_projects').update({ status: 'generating' }).eq('id', id);

  try {
    const { videoUrl } = await generateSabangpalbangVideo(project.source_image_url, project.aspect_ratio, project.extra_prompt || undefined);
    const { data: updated, error } = await supabase
      .from('uos_sabangpalbang_projects')
      .update({ output_video_url: videoUrl, status: 'done' })
      .eq('id', id)
      .select()
      .single();
    if (error || !updated) throw new Error(error?.message || '저장 실패');
    return NextResponse.json({ project: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from('uos_sabangpalbang_projects').update({ status: 'failed' }).eq('id', id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
