import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../../lib/supabaseServerAuth';

// 원본(10-3절) 실측: 3단계(생성)에서 컷마다 "AI 생성"뿐 아니라 "업로드"로 직접 이미지를 넣을 수 있다.
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
  const file = formData?.get('image');
  if (!(file instanceof File)) return NextResponse.json({ error: '이미지 파일을 첨부해주세요.' }, { status: 400 });

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/cut-${cutId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('cutdaeri-assets').upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
  const imageUrl = supabase.storage.from('cutdaeri-assets').getPublicUrl(path).data.publicUrl;

  const { error } = await supabase.from('uos_cutdaeri_cuts').update({ image_url: imageUrl, status: 'done' }).eq('id', cutId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ imageUrl });
}
