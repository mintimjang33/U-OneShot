import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../../lib/supabaseServerAuth';

// 원본 재실측(2026-08-30): 3/4단계에서 컷마다 "업로드"로 이미지뿐 아니라 동영상 파일도 직접 넣을 수
// 있다(정지 이미지 대신 이 컷의 소스로 쓰임). upload-image와 대칭되는 동영상 전용 업로드 라우트.
export async function POST(request: Request, { params }: { params: Promise<{ cutId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { cutId } = await params;

  const supabase = getSupabaseServerClient();
  const { data: cut } = await supabase.from('uos_cutdaeri_cuts').select('*, uos_cutdaeri_projects!inner(user_id)').eq('id', cutId).maybeSingle();
  if (!cut || cut.uos_cutdaeri_projects.user_id !== user.id) {
    return NextResponse.json({ error: '컷을 찾을 수 없습니다.' }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('video');
  if (!(file instanceof File)) return NextResponse.json({ error: '동영상 파일을 첨부해주세요.' }, { status: 400 });

  const ext = file.name.split('.').pop() || 'mp4';
  const path = `${user.id}/cut-${cutId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('cutdaeri-assets').upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
  const videoUrl = supabase.storage.from('cutdaeri-assets').getPublicUrl(path).data.publicUrl;

  const { error } = await supabase.from('uos_cutdaeri_cuts').update({ video_url: videoUrl, status: 'done' }).eq('id', cutId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ videoUrl });
}
