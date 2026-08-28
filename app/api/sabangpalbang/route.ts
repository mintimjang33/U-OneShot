import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { SABANGPALBANG_ANGLES } from '../../../lib/generateImage';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_sabangpalbang_projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ projects: data || [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('image');
  if (!(file instanceof File)) return NextResponse.json({ error: '이미지 파일을 첨부해주세요.' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/${Date.now()}.${ext}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('sabangpalbang-assets')
      .upload(path, await file.arrayBuffer(), { contentType: file.type });
    if (uploadError) throw new Error(uploadError.message);

    const { data: pub } = supabase.storage.from('sabangpalbang-assets').getPublicUrl(path);

    const { data: project, error: projectError } = await supabase
      .from('uos_sabangpalbang_projects')
      .insert({ user_id: user.id, source_image_url: pub.publicUrl, status: 'draft' })
      .select()
      .single();
    if (projectError || !project) throw new Error(projectError?.message || '프로젝트 생성 실패');

    const angleRows = SABANGPALBANG_ANGLES.map((a, i) => ({ project_id: project.id, order_index: i, angle_label: a.label }));
    const { error: anglesError } = await supabase.from('uos_sabangpalbang_angles').insert(angleRows);
    if (anglesError) throw new Error(anglesError.message);

    return NextResponse.json({ project });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
