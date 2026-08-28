import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { getRemoteConfig } from '../../../lib/remoteConfig';

const SYSTEM_PROMPT = `너는 산전수전 다 겪은 창업 멘토다. 사용자가 사업 아이디어, 마케팅, 콘텐츠 전략에 대해
고민을 털어놓으면, 응원이나 막연한 위로 대신 냉정하고 현실적인 피드백을 준다.

규칙:
- 핑계나 자기합리화를 그냥 넘기지 않는다. 근거 없는 낙관에는 반드시 반박한다.
- 예의는 지키되 돌려 말하지 않는다. 문제를 문제라고 분명히 말한다.
- 매 답변 끝에 지금 당장 시도해볼 수 있는 구체적인 다음 행동을 하나 제시한다.
- 3~6문장 정도로 간결하게 답한다. 장황한 설교를 하지 않는다.`;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_truthroom_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: data || [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const content: string = body?.content;
  if (!content?.trim()) return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  try {
    const { data: history } = await supabase
      .from('uos_truthroom_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(20);

    const apiKey = await getRemoteConfig('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되어 있지 않습니다.');

    const messages = [...(history || []), { role: 'user', content }];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 1024, system: SYSTEM_PROMPT, messages }),
    });
    if (!res.ok) throw new Error(`응답 생성 실패 (${res.status}): ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    const reply = (json.content || []).map((c: { text?: string }) => c.text || '').join('');
    if (!reply) throw new Error('응답이 비어 있습니다.');

    const { error: insertError } = await supabase.from('uos_truthroom_messages').insert([
      { user_id: user.id, role: 'user', content },
      { user_id: user.id, role: 'assistant', content: reply },
    ]);
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
