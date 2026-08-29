import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase';
import { getCurrentUser } from '../../../../lib/supabaseServerAuth';
import { CUTDAERI_STYLES } from '../../../../lib/generateImage';

const CUTDAERI_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;

  const supabase = getSupabaseServerClient();
  const { data: project } = await supabase.from('uos_cutdaeri_projects').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  const { data: cuts } = await supabase.from('uos_cutdaeri_cuts').select('*').eq('project_id', id).order('order_index', { ascending: true });

  return NextResponse.json({ project, cuts: cuts || [] });
}

// 2단계(이미지 스타일) 완료 처리: 스타일을 정하면 그때부터 컷 이미지 생성이 가능해진다.
// 2026-08-29 재로그인 실측(10-3절)으로 화면비율/캐릭터 레퍼런스/추가 디렉션 프롬프트도 이 단계에서
// 같이 받도록 확장함(원래도 aspect_ratio/character_image_url 컬럼은 있었는데 안 쓰이고 있었음).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;

  const formData = await request.formData().catch(() => null);
  const style = String(formData?.get('style') || '');
  if (!CUTDAERI_STYLES.some((s) => s.value === style)) return NextResponse.json({ error: '스타일을 선택해주세요.' }, { status: 400 });

  const requestedAspectRatio = String(formData?.get('aspectRatio') || '9:16');
  const aspectRatio = CUTDAERI_ASPECT_RATIOS.includes(requestedAspectRatio) ? requestedAspectRatio : '9:16';
  const directionPrompt = String(formData?.get('directionPrompt') || '').trim() || null;

  const supabase = getSupabaseServerClient();
  const update: Record<string, unknown> = { style, aspect_ratio: aspectRatio, direction_prompt: directionPrompt };

  const characterFile = formData?.get('characterImage');
  if (characterFile instanceof File) {
    const ext = characterFile.name.split('.').pop() || 'jpg';
    const path = `${user.id}/character-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('cutdaeri-assets').upload(path, await characterFile.arrayBuffer(), { contentType: characterFile.type });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    update.character_image_url = supabase.storage.from('cutdaeri-assets').getPublicUrl(path).data.publicUrl;
  }

  const { data: project, error } = await supabase.from('uos_cutdaeri_projects').update(update).eq('id', id).eq('user_id', user.id).select().single();
  if (error || !project) return NextResponse.json({ error: error?.message || '프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  return NextResponse.json({ project });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('uos_cutdaeri_projects').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
