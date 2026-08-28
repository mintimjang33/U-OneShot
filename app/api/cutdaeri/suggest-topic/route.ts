import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/supabaseServerAuth';
import { suggestCutDaeriTopic } from '../../../../lib/generateScript';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const keyword: string | undefined = body?.keyword || undefined;

  try {
    const { topic } = await suggestCutDaeriTopic(keyword);
    return NextResponse.json({ topic });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
