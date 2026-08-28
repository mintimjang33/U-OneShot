import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_thumbarena_projects')
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
  const files = formData?.getAll('images').filter((f): f is File => f instanceof File) || [];
  if (files.length < 2) return NextResponse.json({ error: '썸네일을 2장 이상 첨부해주세요.' }, { status: 400 });
  // 토너먼트는 2의 거듭제곱 개수여야 라운드가 딱 떨어진다.
  if ((files.length & (files.length - 1)) !== 0) {
    return NextResponse.json({ error: '썸네일 개수는 2, 4, 8, 16개처럼 2의 거듭제곱이어야 합니다.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  try {
    const imageUrls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}-${imageUrls.length}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('thumbarena-assets')
        .upload(path, await file.arrayBuffer(), { contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);
      const { data: pub } = supabase.storage.from('thumbarena-assets').getPublicUrl(path);
      imageUrls.push(pub.publicUrl);
    }

    const { data: project, error: projectError } = await supabase
      .from('uos_thumbarena_projects')
      .insert({ user_id: user.id, image_urls: imageUrls, status: 'voting' })
      .select()
      .single();
    if (projectError || !project) throw new Error(projectError?.message || '프로젝트 생성 실패');

    return NextResponse.json({ project });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
