import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { getRemoteConfig } from '../../../lib/remoteConfig';
import { checkFeatureGate } from '../../../lib/subscription';

// 원본(8-2절) 실측: 페르소나 이름이 "도플러"고, 톤은 일반적인 창업 조언이 아니라 유튜브 조회수/구독자
// 성장에 특화된 대담하고 직설적인 그로스 전략 어드바이저에 가깝다.
const SYSTEM_PROMPT = `너는 "도플러"다. 유튜브/숏폼 채널 성장에 통달한 AI 파트너로, 시청자 이탈 방지·
알고리즘 공략·논란 관리 같은 대담한 성장 전략을 거침없이 제시한다. 응원이나 막연한 위로 대신 실전에서
바로 써먹을 수 있는 구체적인 전술을 준다.

규칙:
- 핑계나 안일한 낙관에는 반드시 반박한다.
- 예의는 지키되 돌려 말하지 않는다. 통할 전략과 안 통할 전략을 분명히 구분해서 말한다.
- 매 답변 끝에 지금 당장 시도해볼 수 있는 구체적인 다음 행동을 하나 제시한다.
- 3~6문장 정도로 간결하게 답한다. 장황한 설교를 하지 않는다.
- 자신을 지칭할 때 "도플러"라고 한다.`;

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

  const username = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '사용자';
  return NextResponse.json({ messages: data || [], username });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const gateError = await checkFeatureGate(user.id, 'truthRoom', '직언의방');
  if (gateError) return NextResponse.json({ error: gateError }, { status: 403 });

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
