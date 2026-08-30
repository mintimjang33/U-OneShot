import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../../lib/supabaseServerAuth';
import { generateCutVideo } from '../../../../../../lib/generateImage';
import { checkCutdaeriCutVideoQuota } from '../../../../../../lib/subscription';

// 원본(2026-08-30 재실측) 컷비서 3단계 컷별 액션: TTS/이미지/동영상/업로드 4버튼 중 "동영상".
// 정지 이미지 대신 짧은 AI 영상클립을 이 컷의 소스로 쓴다 — 먼저 image_url이 있어야 한다(그 이미지를
// 애니메이션시키는 방식이라, 컷 대본만으로 바로 영상을 만들지 않는다).
export async function POST(request: Request, { params }: { params: Promise<{ cutId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { cutId } = await params;

  const body = await request.json().catch(() => ({}));
  const durationSeconds = body?.durationSeconds === '10' ? '10' : '5';
  const multiShot = body?.multiShot === true;

  const supabase = getSupabaseServerClient();
  const { data: cut } = await supabase
    .from('uos_cutdaeri_cuts')
    .select('*, uos_cutdaeri_projects!inner(user_id, aspect_ratio)')
    .eq('id', cutId)
    .maybeSingle();
  if (!cut || cut.uos_cutdaeri_projects.user_id !== user.id) {
    return NextResponse.json({ error: '컷을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (!cut.image_url) {
    return NextResponse.json({ error: '먼저 이 컷의 이미지를 생성하거나 업로드해주세요.' }, { status: 400 });
  }

  // 이미 동영상이 있는 컷을 다시 생성하는 경우는 한도 체크에서 건너뛴다(재생성까지 막으면 너무 가혹함).
  if (!cut.video_url) {
    const quotaError = await checkCutdaeriCutVideoQuota(user.id);
    if (quotaError) return NextResponse.json({ error: quotaError }, { status: 403 });
  }

  await supabase.from('uos_cutdaeri_cuts').update({ status: 'generating' }).eq('id', cutId);

  try {
    const project = cut.uos_cutdaeri_projects;
    const { videoUrl } = await generateCutVideo(cut.image_url, project.aspect_ratio, durationSeconds, multiShot);
    await supabase.from('uos_cutdaeri_cuts').update({ video_url: videoUrl, status: 'done' }).eq('id', cutId);
    return NextResponse.json({ videoUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from('uos_cutdaeri_cuts').update({ status: 'failed' }).eq('id', cutId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
