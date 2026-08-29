import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../../lib/supabaseServerAuth';
import { generateCutImage } from '../../../../../../lib/generateImage';
import { checkCutdaeriImageQuota } from '../../../../../../lib/subscription';

export async function POST(request: Request, { params }: { params: Promise<{ cutId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { cutId } = await params;

  const supabase = getSupabaseServerClient();
  const { data: cut } = await supabase
    .from('uos_cutdaeri_cuts')
    .select('*, uos_cutdaeri_projects!inner(user_id, style, aspect_ratio, character_image_url, direction_prompt)')
    .eq('id', cutId)
    .maybeSingle();
  if (!cut || cut.uos_cutdaeri_projects.user_id !== user.id) {
    return NextResponse.json({ error: '컷을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 이미 이미지가 있는 컷을 다시 생성하는 경우는 한도 체크에서 건너뛴다(재생성까지 막으면 너무 가혹함).
  if (!cut.image_url) {
    const quotaError = await checkCutdaeriImageQuota(user.id);
    if (quotaError) return NextResponse.json({ error: quotaError }, { status: 403 });
  }

  await supabase.from('uos_cutdaeri_cuts').update({ status: 'generating' }).eq('id', cutId);

  try {
    const project = cut.uos_cutdaeri_projects;
    const { imageUrl } = await generateCutImage(
      cut.text,
      project.style,
      project.aspect_ratio,
      project.character_image_url || undefined,
      project.direction_prompt || undefined
    );
    // 이미지가 바뀌면 그 이미지를 소스로 만들었던 기존 동영상 클립은 더 이상 안 맞으므로 같이 지운다.
    await supabase.from('uos_cutdaeri_cuts').update({ image_url: imageUrl, video_url: null, status: 'done' }).eq('id', cutId);
    return NextResponse.json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from('uos_cutdaeri_cuts').update({ status: 'failed' }).eq('id', cutId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
