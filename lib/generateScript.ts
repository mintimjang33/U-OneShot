import { getRemoteConfig } from './remoteConfig';

const STYLE_LABEL: Record<string, string> = {
  portrait: '인물 중심',
  natural: '내추럴(배경 중심)',
  editorial: '에디토리얼(제품 중심)',
};

// 컷대리 1단계: 주제 → 대본 → 6~10개 컷(장면)으로 분할. Claude가 컷 분할까지 한 번에 JSON으로
// 반환하게 해서, 문장 단위로 대충 쪼개는 휴리스틱보다 훨씬 자연스러운 장면 전환을 얻는다.
export async function generateCutDaeriScript(topic: string, style: string): Promise<{ script: string; cuts: string[] }> {
  const apiKey = await getRemoteConfig('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되어 있지 않습니다.');

  const systemPrompt = `너는 숏폼 영상 나레이션 대본 작가다. 주제와 스타일을 받아서 30~60초 분량의 몰입감 있는
나레이션 대본을 쓰고, 영상 컷(장면) 단위로 6~10개로 나눠라.

규칙:
- 첫 문장은 호기심을 자극하는 훅으로 시작한다.
- 문장은 짧고 리듬감 있게 쓴다.
- 각 컷은 1~2문장, 화면 전환이 자연스러운 지점에서 끊는다.
- 결과는 JSON만 출력한다: {"script": "전체 대본 텍스트", "cuts": ["컷1 텍스트", "컷2 텍스트", ...]}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: `주제: ${topic}\n스타일: ${STYLE_LABEL[style] || style}` }],
    }),
  });
  if (!res.ok) throw new Error(`대본 생성 요청 실패 (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const rawText = (json.content || []).map((c: { text?: string }) => c.text || '').join('');

  let parsed: { script: string; cuts: string[] };
  try {
    const match = rawText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : rawText);
  } catch {
    throw new Error('대본 생성 응답을 파싱하지 못했습니다: ' + rawText.slice(0, 200));
  }
  if (!parsed.script || !Array.isArray(parsed.cuts) || parsed.cuts.length === 0) {
    throw new Error('대본 생성 응답 형식이 올바르지 않습니다.');
  }
  return parsed;
}
