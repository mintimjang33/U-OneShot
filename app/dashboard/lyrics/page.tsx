'use client';

import { useEffect, useState } from 'react';

type LyricsProject = {
  id: string;
  language: string;
  theme: string;
  genre: string;
  vocal_type: string;
  mood: string | null;
  structure: string | null;
  title: string;
  lyrics_content: string;
  suno_prompt: string;
  created_at: string;
};

// 2026-08-29 고급모드 실측: 언어 15개, 테마 9개(기본모드는 앞 6개만), 장르 32개(기본모드는 앞 9개만),
// 보컬타입 7종(기본/고급 공통), 무드 9종·가사 구성 10종은 고급모드 전용 신규 필드.
const LANGUAGES = [
  '한국어', 'English', '日本語', '中文', 'Español', 'Tiếng Việt', 'ไทย', 'Français',
  'Deutsch', 'Italiano', 'Português', 'Русский', 'हिन्दी', 'Bahasa Indonesia', 'Nederlands',
];
const THEMES = ['사랑', '이별', '우정', '꿈', '청춘', '가족', '희망', '추억', '자유'];
const GENRES = [
  'K-Pop', 'Pop', 'Rock', 'Jazz', 'R&B', 'Ballad', 'Hip-hop', 'Trot', 'EDM',
  'Soul', 'Funk', 'Disco', 'Synthwave', 'Lo-fi', 'Acoustic', 'Metal', 'Country', 'Reggae',
  'Folk', 'Latin', 'City Pop', 'New Age', 'Phonk', 'Gospel', 'Indie', 'Classic', 'Techno',
  'Trap', 'House', 'Future Bass', 'Afrobeats', 'Chillhop',
];
const VOCAL_TYPES = ['여성', '남성', '남녀 듀엣', '여성 허스키', '남성 허스키', '여성 맑은', '남성 맑은'];
const MOODS = ['경쾌한', '슬픈', '강렬한', '몽환적인', '웅장한', '차분한', '치명적인', '서늘한', '음성거리는'];
const STRUCTURES = [
  '1 감정 점층형 (몰입 최강)',
  '2 후렴 반복 중독형 (바이럴용)',
  '3 스토리텔링 영화형',
  '4 A/B 후렴 대비형',
  '5 EDM 댄스 빌드업형',
  '6 트로트/민요 계열 반복형',
  '7 감정 반전형 (힘숨찐 구조)',
  '8 대화 콜앤리스폰스형',
  '9 명상/찬불가/로파이형',
  '10 쇼츠 확장 고려형 (모듈 구조)',
];

export default function LyricsPage() {
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [theme, setTheme] = useState(THEMES[0]);
  const [customTheme, setCustomTheme] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [vocalType, setVocalType] = useState(VOCAL_TYPES[0]);
  const [mood, setMood] = useState(MOODS[0]);
  const [structure, setStructure] = useState(STRUCTURES[0]);

  const [projects, setProjects] = useState<LyricsProject[]>([]);
  const [result, setResult] = useState<LyricsProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/lyrics')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    const finalTheme = customTheme.trim() || theme;

    const res = await fetch('/api/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: finalTheme,
        genre,
        vocalType,
        language,
        ...(mode === 'advanced' ? { mood, structure } : {}),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setResult(data.project);
    setProjects((prev) => [data.project, ...prev]);
  }

  const visibleThemes = mode === 'advanced' ? THEMES : THEMES.slice(0, 6);
  const visibleGenres = mode === 'advanced' ? GENRES : GENRES.slice(0, 9);

  function copyPrompt() {
    if (!result) return;
    navigator.clipboard.writeText(result.suno_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-1">가사비서</h1>
      <p className="text-sm text-muted mb-6">주제와 장르만 정하면 가사와 SUNO AI 스타일 프롬프트를 함께 만들어드립니다.</p>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMode('basic')}
          className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
            mode === 'basic' ? 'bg-accent text-white border-accent' : 'border-border'
          }`}
        >
          기본모드
        </button>
        <button
          type="button"
          onClick={() => setMode('advanced')}
          className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
            mode === 'advanced' ? 'bg-accent text-white border-accent' : 'border-border'
          }`}
        >
          고급모드
        </button>
      </div>

      <div className="space-y-5 mb-6">
        <div>
          <label className="text-sm font-bold block mb-1.5">언어</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-bold block mb-1.5">테마</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {visibleThemes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTheme(t);
                  setCustomTheme('');
                }}
                className={`px-3 py-1.5 rounded-[var(--radius-card-sm)] text-sm border ${
                  theme === t && !customTheme ? 'bg-accent text-white border-accent' : 'border-border'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            value={customTheme}
            onChange={(e) => setCustomTheme(e.target.value)}
            placeholder="직접 입력 (선택)"
            className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-bold block mb-1.5">장르</label>
          <div className="flex flex-wrap gap-2">
            {visibleGenres.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenre(g)}
                className={`px-3 py-1.5 rounded-[var(--radius-card-sm)] text-sm border ${
                  genre === g ? 'bg-accent text-white border-accent' : 'border-border'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {mode === 'advanced' && (
          <div>
            <label className="text-sm font-bold block mb-1.5">곡의 무드 (MOOD)</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`px-3 py-1.5 rounded-[var(--radius-card-sm)] text-sm border ${
                    mood === m ? 'bg-accent text-white border-accent' : 'border-border'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'advanced' && (
          <div>
            <label className="text-sm font-bold block mb-1.5">가사 구성</label>
            <select
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
              className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
            >
              {STRUCTURES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-sm font-bold block mb-1.5">보컬 타입 및 음색</label>
          <select
            value={vocalType}
            onChange={(e) => setVocalType(e.target.value)}
            className="border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
          >
            {VOCAL_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-5 py-2.5 text-sm disabled:opacity-40"
        >
          {loading ? '가사 만드는 중...' : '가사 만들기'}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {result && (
        <div className="border border-border rounded-[var(--radius-card)] p-5 mb-8">
          <h2 className="font-black text-lg mb-3">{result.title}</h2>
          <pre className="whitespace-pre-wrap text-sm mb-4 font-sans">{result.lyrics_content}</pre>
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-muted">SUNO AI 프롬프트</span>
              <button type="button" onClick={copyPrompt} className="text-xs font-bold text-accent">
                {copied ? '복사됨!' : '복사하기'}
              </button>
            </div>
            <p className="text-xs bg-white/5 rounded-[var(--radius-card-sm)] px-3 py-2 font-mono">{result.suno_prompt}</p>
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-muted mb-2">이전 작업</h3>
          <div className="space-y-2">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setResult(p)}
                className="w-full text-left border border-border rounded-[var(--radius-card-sm)] px-4 py-2.5 text-sm hover:border-accent flex items-center justify-between"
              >
                <span className="font-bold">{p.title}</span>
                <span className="text-xs text-muted">
                  {p.genre} · {p.theme}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
