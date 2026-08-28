'use client';

import { useEffect, useState } from 'react';

type LyricsProject = {
  id: string;
  language: string;
  theme: string;
  genre: string;
  vocal_type: string;
  title: string;
  lyrics_content: string;
  suno_prompt: string;
  created_at: string;
};

// 8-9절 실측: 언어 드롭다운, 테마 프리셋 6개, 장르 버튼 9개, 보컬타입 드롭다운.
const LANGUAGES = ['한국어', '영어', '일본어'];
const THEMES = ['사랑', '이별', '우정', '꿈', '청춘', '가족'];
const GENRES = ['K-Pop', 'Pop', 'Rock', 'Jazz', 'R&B', 'Ballad', 'Hip-hop', 'Trot', 'EDM'];
const VOCAL_TYPES = ['여성', '남성', '혼성'];

export default function LyricsPage() {
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [theme, setTheme] = useState(THEMES[0]);
  const [customTheme, setCustomTheme] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [vocalType, setVocalType] = useState(VOCAL_TYPES[0]);

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
      body: JSON.stringify({ theme: finalTheme, genre, vocalType, language }),
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

      {mode === 'advanced' ? (
        <div className="border border-dashed border-border rounded-[var(--radius-card)] p-6 text-sm text-muted mb-6">
          고급모드는 원본 실측이 아직 확인되지 않아 준비 중입니다. 우선 기본모드를 이용해주세요.
        </div>
      ) : (
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
              {THEMES.map((t) => (
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
              {GENRES.map((g) => (
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

          <div>
            <label className="text-sm font-bold block mb-1.5">보컬 타입</label>
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
      )}

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
            <p className="text-xs bg-black/5 rounded-[var(--radius-card-sm)] px-3 py-2 font-mono">{result.suno_prompt}</p>
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
