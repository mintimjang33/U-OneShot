import { getRemoteConfig } from './remoteConfig';

const STYLE_LABEL: Record<string, string> = {
  portrait: '인물 중심',
  natural: '내추럴(배경 중심)',
  editorial: '에디토리얼(제품 중심)',
};

const TONE_LABEL: Record<string, string> = {
  info: '정보 전달(객관적 사실 위주)',
  story: '스토리텔링(경험담·서사 구조)',
  persuade: '설득(주장과 근거 중심)',
};

// Claude에 JSON 응답을 요청하고 파싱까지 처리하는 공용 헬퍼. 롱대리/숏대리/컷대리가 전부 이 형태를 쓴다.
async function callClaudeForJSON(systemPrompt: string, userMessage: string, maxTokens: number): Promise<unknown> {
  const apiKey = await getRemoteConfig('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되어 있지 않습니다.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`생성 요청 실패 (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const rawText = (json.content || []).map((c: { text?: string }) => c.text || '').join('');

  try {
    const match = rawText.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : rawText);
  } catch {
    throw new Error('생성 응답을 파싱하지 못했습니다: ' + rawText.slice(0, 200));
  }
}

// 컷대리 1단계: 주제 → 대본 → 6~10개 컷(장면)으로 분할. Claude가 컷 분할까지 한 번에 JSON으로
// 반환하게 해서, 문장 단위로 대충 쪼개는 휴리스틱보다 훨씬 자연스러운 장면 전환을 얻는다.
export async function generateCutDaeriScript(topic: string, style: string): Promise<{ script: string; cuts: string[] }> {
  const systemPrompt = `너는 숏폼 영상 나레이션 대본 작가다. 주제와 스타일을 받아서 30~60초 분량의 몰입감 있는
나레이션 대본을 쓰고, 영상 컷(장면) 단위로 6~10개로 나눠라.

규칙:
- 첫 문장은 호기심을 자극하는 훅으로 시작한다.
- 문장은 짧고 리듬감 있게 쓴다.
- 각 컷은 1~2문장, 화면 전환이 자연스러운 지점에서 끊는다.
- 결과는 JSON만 출력한다: {"script": "전체 대본 텍스트", "cuts": ["컷1 텍스트", "컷2 텍스트", ...]}`;

  const parsed = (await callClaudeForJSON(
    systemPrompt,
    `주제: ${topic}\n스타일: ${STYLE_LABEL[style] || style}`,
    2048
  )) as { script?: string; cuts?: string[] };

  if (!parsed.script || !Array.isArray(parsed.cuts) || parsed.cuts.length === 0) {
    throw new Error('대본 생성 응답 형식이 올바르지 않습니다.');
  }
  return { script: parsed.script, cuts: parsed.cuts };
}

// 롱대리: 주제 → 롱폼 원고(영상 나레이션 또는 아티클로 쓸 수 있는 긴 글). 숏대리가 이 원고를 재료로 쓴다.
export async function generateLongDaeriScript(topic: string, tone: string): Promise<{ title: string; content: string }> {
  const systemPrompt = `너는 롱폼 콘텐츠(유튜브 영상 나레이션 또는 블로그 아티클) 작가다. 주제 하나를 받아서
1500~2500자 분량의 완성된 원고를 쓴다.

규칙:
- 도입(호기심을 자극하는 훅) → 본론(단계별 전개, 구체적 근거·사례 포함) → 결론(요약 또는 행동 촉구) 구조를 지킨다.
- 문단을 나눠서 쓰고, 각 문단은 하나의 소주제만 다룬다.
- 나중에 이 원고를 여러 개의 1분 분량 짧은 글로 재분할할 것이므로, 문단마다 독립적으로도 이해되게 쓴다.
- 결과는 JSON만 출력한다: {"title": "원고 제목", "content": "전체 원고 텍스트(문단은 \\n\\n으로 구분)"}`;

  const parsed = (await callClaudeForJSON(
    systemPrompt,
    `주제: ${topic}\n톤: ${TONE_LABEL[tone] || tone}`,
    4096
  )) as { title?: string; content?: string };

  if (!parsed.title || !parsed.content) {
    throw new Error('원고 생성 응답 형식이 올바르지 않습니다.');
  }
  return { title: parsed.title, content: parsed.content };
}

// 숏대리: 롱대리 원고(또는 임의의 긴 글) → 1분 분량(약 200~280자) 숏폼 대본 여러 편으로 분할.
export async function generateShortDaeriScripts(longContent: string): Promise<{ title: string; content: string }[]> {
  const systemPrompt = `너는 숏폼 영상 대본 작가다. 긴 원고 하나를 받아서, 그 안에 담긴 소주제들을 뽑아
각각 독립적으로 완결되는 1분 분량(약 200~280자) 숏폼 나레이션 대본 여러 편으로 재구성한다.

규칙:
- 원고에 담긴 소주제 개수에 맞춰 4~8편을 만든다(원고가 짧으면 4편, 풍부하면 8편까지).
- 각 편은 원문을 그대로 잘라내지 말고, 훅으로 시작해서 그 소주제 하나만 완결되게 새로 쓴다.
- 각 편에 짧고 클릭을 부르는 제목을 붙인다.
- 결과는 JSON만 출력한다: {"shorts": [{"title": "제목1", "content": "대본1"}, {"title": "제목2", "content": "대본2"}, ...]}`;

  const parsed = (await callClaudeForJSON(systemPrompt, `원고:\n${longContent}`, 4096)) as {
    shorts?: { title: string; content: string }[];
  };

  if (!Array.isArray(parsed.shorts) || parsed.shorts.length === 0) {
    throw new Error('숏폼 분할 응답 형식이 올바르지 않습니다.');
  }
  return parsed.shorts;
}
