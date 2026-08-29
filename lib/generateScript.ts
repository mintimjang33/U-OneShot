import { getRemoteConfig } from './remoteConfig';

// 원본(8-4절) 실측: 롱폼비서는 톤이 아니라 장르 카테고리로 먼저 분류한다.
export const LONGDAERI_CATEGORIES = ['서양철학', '동양철학', '건강/운동', '운세/사주', '생활/꿀팁', '부처님 말씀', '성경', '인간관계/처세', '전통 야담'];

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

// 컷비서 1단계 "추천글감받기": 아직 원고가 없는 사용자를 위해 소재(주제)만 추천한다 — 원고 자체는
// 사용자가 직접 쓰거나 붙여넣는다(원본 실측: 메인 입력은 "완성된 원고"이지 주제가 아니다).
export async function suggestCutDaeriTopic(keyword?: string): Promise<{ topic: string }> {
  const systemPrompt = `너는 숏폼 영상 소재 기획자다. 키워드가 주어지면 그 키워드와 관련된, 키워드가
없으면 요즘 반응이 좋을 만한 숏폼 영상 소재를 하나 제안한다. 소재는 한 문장으로, 후킹 포인트가 뭔지
알 수 있게 구체적으로 쓴다.

결과는 JSON만 출력한다: {"topic": "제안 소재 한 문장"}`;

  const parsed = (await callClaudeForJSON(systemPrompt, keyword ? `키워드: ${keyword}` : '키워드 없음 — 트렌디한 소재 하나 제안', 512)) as {
    topic?: string;
  };
  if (!parsed.topic) throw new Error('소재 추천 응답 형식이 올바르지 않습니다.');
  return { topic: parsed.topic };
}

// 컷비서 1단계 본 기능: 사용자가 직접 쓴/붙여넣은 원고를 지정한 컷 수로 분할한다(원본은 대본을 AI가
// 새로 쓰지 않는다 — 이미 있는 원고를 컷 단위로 나누기만 한다).
export async function splitCutDaeriScript(script: string, cutCount: number): Promise<string[]> {
  const systemPrompt = `너는 영상 편집 콘티 작가다. 완성된 나레이션 원고 하나를 받아서, 정확히 ${cutCount}개의
컷(장면)으로 나눈다.

규칙:
- 원문의 문장·단어를 그대로 쓴다 — 새로 쓰거나 요약하지 않는다.
- 정확히 ${cutCount}개로 나눈다. 분량이 고르지 않아도 되지만, 화면 전환이 자연스러운 지점에서 끊는다.
- 결과는 JSON만 출력한다: {"cuts": ["컷1 텍스트", "컷2 텍스트", ...]} (배열 길이는 반드시 ${cutCount})`;

  const parsed = (await callClaudeForJSON(systemPrompt, `원고:\n${script}`, 2048)) as { cuts?: string[] };
  if (!Array.isArray(parsed.cuts) || parsed.cuts.length === 0) {
    throw new Error('컷 분할 응답 형식이 올바르지 않습니다.');
  }
  return parsed.cuts;
}

// 롱폼비서: 카테고리(장르)+주제 → 롱폼 원고(영상 나레이션 또는 아티클로 쓸 수 있는 긴 글).
export async function generateLongDaeriScript(topic: string, category: string): Promise<{ title: string; content: string }> {
  const systemPrompt = `너는 ${category} 장르의 인생 조언·자기계발형 롱폼 콘텐츠(유튜브 영상 나레이션) 작가다.
주제 하나를 받아서 1500~2500자 분량의 완성된 원고를 쓴다.

규칙:
- 도입(뇌리에 박히는 첫 문장) → 본론(단계별 전개, 구체적 근거·사례 포함) → 결론(마음에 남는 엔딩) 구조를 지킨다.
- ${category} 장르의 관점과 어휘를 살려서 쓴다.
- 문단을 나눠서 쓰고, 각 문단은 하나의 소주제만 다룬다.
- 결과는 JSON만 출력한다: {"title": "원고 제목", "content": "전체 원고 텍스트(문단은 \\n\\n으로 구분)"}`;

  const parsed = (await callClaudeForJSON(systemPrompt, `주제: ${topic}\n카테고리: ${category}`, 4096)) as {
    title?: string;
    content?: string;
  };

  if (!parsed.title || !parsed.content) {
    throw new Error('원고 생성 응답 형식이 올바르지 않습니다.');
  }
  return { title: parsed.title, content: parsed.content };
}

// 숏폼비서: 아무 긴 글(800~1,500자 권장, 롱폼비서 원고일 필요 없음) → 정확히 10편의 1분 분량
// 숏폼 대본으로 분할. 원본(8-5절)은 고정 10개를 만든다.
export async function generateShortDaeriScripts(longContent: string): Promise<{ title: string; content: string }[]> {
  const systemPrompt = `너는 숏폼 영상 대본 작가다. 긴 원고 하나를 받아서, 그 안에 담긴 소주제들을 뽑아
각각 독립적으로 완결되는 1분 분량(약 200~280자) 숏폼 나레이션 대본 정확히 10편으로 재구성한다.

규칙:
- 반드시 10편을 만든다. 원고가 짧으면 같은 소주제를 다른 각도로 풀어서라도 10편을 채운다.
- 각 편은 원문을 그대로 잘라내지 말고, 훅으로 시작해서 그 소주제 하나만 완결되게 새로 쓴다.
- 각 편에 짧고 클릭을 부르는 제목을 붙인다.
- 결과는 JSON만 출력한다: {"shorts": [{"title": "제목1", "content": "대본1"}, ...]} (배열 길이는 반드시 10)`;

  const parsed = (await callClaudeForJSON(systemPrompt, `원고:\n${longContent}`, 4096)) as {
    shorts?: { title: string; content: string }[];
  };

  if (!Array.isArray(parsed.shorts) || parsed.shorts.length === 0) {
    throw new Error('숏폼 분할 응답 형식이 올바르지 않습니다.');
  }
  return parsed.shorts;
}

// 원본(8-7절) 실측: 업로드 클리닉은 키워드 하나가 아니라 주제/가제+원고(선택)+벤치마킹 레퍼런스(선택)+
// 전략 스타일 4개를 조합해서 "처방"을 만든다.
export const UPLOADRX_STYLES = ['자극적', '정보전달', '감성형', '유머러스'] as const;

export async function generateUploadRx(
  topic: string,
  style: string,
  script?: string,
  benchmarkUrl?: string
): Promise<{ titles: string[]; description: string; hashtags: string[] }> {
  const systemPrompt = `너는 유튜브·쇼츠 업로드 최적화 전문가다. 영상 주제(또는 가제)를 받아서, 선택된
전략 스타일(자극적/정보전달/감성형/유머러스)에 맞춰 타깃 시청자의 클릭을 부르는 제목 후보, 영상 설명
(더보기), 해시태그를 만든다. 원고나 벤치마킹 레퍼런스가 함께 주어지면 그 내용을 반영해서 더 정밀하게
처방한다.

규칙:
- 제목은 서로 다른 후킹 방식(숫자/궁금증/반전/이득 강조)으로 5개를 만든다. 각 30자 이내. 선택된 전략
  스타일의 톤을 따른다.
- 설명은 영상 내용 요약 2~3문장 + 시청자에게 도움이 되는 추가 정보로 구성한다(150~300자).
- 해시태그는 검색 유입에 도움되는 것으로 8~12개, # 없이 단어만 준다.
- 결과는 JSON만 출력한다: {"titles": ["제목1", ...], "description": "설명 텍스트", "hashtags": ["태그1", ...]}`;

  const userParts = [`주제: ${topic}`, `전략 스타일: ${style}`];
  if (script?.trim()) userParts.push(`영상 원고:\n${script}`);
  if (benchmarkUrl?.trim()) userParts.push(`벤치마킹 레퍼런스: ${benchmarkUrl}`);

  const parsed = (await callClaudeForJSON(systemPrompt, userParts.join('\n\n'), 2048)) as {
    titles?: string[];
    description?: string;
    hashtags?: string[];
  };

  if (!Array.isArray(parsed.titles) || parsed.titles.length === 0 || !parsed.description || !Array.isArray(parsed.hashtags)) {
    throw new Error('업로드 클리닉 응답 형식이 올바르지 않습니다.');
  }
  return { titles: parsed.titles, description: parsed.description, hashtags: parsed.hashtags };
}


// 가사비서 (신규, 8-9절 실측 기반): 주제+장르+보컬타입 → 가사 + SUNO AI 프롬프트(스타일 태그 문자열).
export const LYRICS_THEMES = ['사랑', '이별', '우정', '꿈', '청춘', '가족'];
export const LYRICS_GENRES = ['K-Pop', 'Pop', 'Rock', 'Jazz', 'R&B', 'Ballad', 'Hip-hop', 'Trot', 'EDM'];
export const LYRICS_VOCAL_TYPES = ['여성', '남성', '혼성'];

export async function generateLyrics(
  theme: string,
  genre: string,
  vocalType: string,
  language: string
): Promise<{ title: string; lyrics: string; sunoPrompt: string }> {
  const systemPrompt = `너는 작사가다. 주제·장르·보컬 타입을 받아서 노래 가사를 쓰고, SUNO AI(AI 작곡 서비스)에
바로 붙여넣을 수 있는 스타일 프롬프트도 함께 만든다.

규칙:
- 가사는 ${language}로 쓴다. 벌스(verse) 2개 + 후렴(chorus) 구조를 갖춘다. 섹션 이름([Verse 1], [Chorus] 등)을
  표시하고 줄바꿈으로 구분한다.
- SUNO 프롬프트는 영어로, 장르/무드/보컬타입/템포/악기 등을 쉼표로 나열한 짧은 태그 형식으로 쓴다
  (예: "K-pop, female vocal, upbeat, synth-pop, emotional bridge").
- 결과는 JSON만 출력한다: {"title": "곡 제목", "lyrics": "가사 전체", "sunoPrompt": "SUNO 스타일 프롬프트"}`;

  const parsed = (await callClaudeForJSON(systemPrompt, `주제: ${theme}\n장르: ${genre}\n보컬 타입: ${vocalType}\n언어: ${language}`, 2048)) as {
    title?: string;
    lyrics?: string;
    sunoPrompt?: string;
  };
  if (!parsed.title || !parsed.lyrics || !parsed.sunoPrompt) {
    throw new Error('가사 생성 응답 형식이 올바르지 않습니다.');
  }
  return { title: parsed.title, lyrics: parsed.lyrics, sunoPrompt: parsed.sunoPrompt };
}
