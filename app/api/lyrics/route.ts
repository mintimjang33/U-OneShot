import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { generateLyrics } from '../../../lib/generateScript';
import { checkFeatureGate } from '../../../lib/subscription';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_lyrics_projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ projects: data || [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const theme: string = body?.theme;
  const genre: string = body?.genre;
  const vocalType: string = body?.vocalType || '여성';
  const language: string = body?.language || '한국어';
  const mood: string | null = body?.mood || null;
  const structure: string | null = body?.structure || null;
  if (!theme?.trim() || !genre?.trim()) return NextResponse.json({ error: '주제와 장르를 입력해주세요.' }, { status: 400 });

  const gateError = await checkFeatureGate(user.id, 'lyrics', '가사비서');
  if (gateError) return NextResponse.json({ error: gateError }, { status: 403 });

  const supabase = getSupabaseServerClient();

  try {
    const { title, lyrics, sunoPrompt } = await generateLyrics(theme, genre, vocalType, language, mood || undefined, structure || undefined);
    const { data: project, error } = await supabase
      .from('uos_lyrics_projects')
      .insert({
        user_id: user.id,
        language,
        theme,
        genre,
        vocal_type: vocalType,
        mood,
        structure,
        title,
        lyrics_content: lyrics,
        suno_prompt: sunoPrompt,
      })
      .select()
      .single();
    if (error || !project) throw new Error(error?.message || '저장 실패');

    return NextResponse.json({ project });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
