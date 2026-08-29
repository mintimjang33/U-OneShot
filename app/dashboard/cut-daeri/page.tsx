'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Project = { id: string; topic: string | null; script: string | null; cut_count: number | null; status: string; created_at: string };

const CUT_PRESETS = [3, 5, 8, 10, 12, 16, 20];

export default function CutDaeriPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [script, setScript] = useState('');
  const [cutCount, setCutCount] = useState<number>(8);
  const [customCutCount, setCustomCutCount] = useState('');
  const [useCustomCount, setUseCustomCount] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [suggestedTopic, setSuggestedTopic] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch('/api/cutdaeri')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }

  useEffect(load, []);

  async function handleSuggestTopic() {
    setSuggesting(true);
    setSuggestedTopic(null);
    const res = await fetch('/api/cutdaeri/suggest-topic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: keyword || undefined }),
    });
    const data = await res.json();
    setSuggesting(false);
    if (res.ok) setSuggestedTopic(data.topic);
  }

  async function handleCreate() {
    if (!script.trim()) return;
    const finalCutCount = useCustomCount ? Number(customCutCount) : cutCount;
    if (!finalCutCount || finalCutCount < 2) {
      setError('컷 수를 확인해주세요.');
      return;
    }
    setCreating(true);
    setError(null);
    const res = await fetch('/api/cutdaeri', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script, cutCount: finalCutCount, topic: suggestedTopic || undefined }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    window.location.href = `/dashboard/cut-daeri/${data.project.id}`;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-black">컷비서</h1>
        <span className="text-xs font-bold text-accent bg-accent-soft rounded-[var(--radius-pill)] px-2 py-0.5">1. 원본 스크립트 입력</span>
      </div>
      <p className="text-sm text-muted mb-8">AI가 만드는 영상, 크리에이터의 비전을 현실로.</p>

      <div className="border border-border rounded-[var(--radius-card)] p-6 mb-10">
        <div className="text-xs font-bold text-muted mb-2">컷 수 기반 분할</div>
        <div className="flex flex-wrap gap-2 mb-4">
          {CUT_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setUseCustomCount(false);
                setCutCount(n);
              }}
              className={`text-xs font-bold rounded-[var(--radius-pill)] px-3 py-1.5 border ${
                !useCustomCount && cutCount === n ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUseCustomCount(true)}
            className={`text-xs font-bold rounded-[var(--radius-pill)] px-3 py-1.5 border ${
              useCustomCount ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
            }`}
          >
            직접 입력
          </button>
          {useCustomCount && (
            <input
              type="number"
              min={2}
              max={30}
              value={customCutCount}
              onChange={(e) => setCustomCutCount(e.target.value)}
              placeholder="컷 수"
              className="w-20 border border-border rounded-[var(--radius-pill)] px-3 py-1.5 text-xs"
            />
          )}
        </div>

        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="원고를 붙여넣기 하거나 직접 입력하세요."
          rows={8}
          className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4"
        />

        <div className="flex gap-2 mb-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="추천 받고 싶은 주제 키워드 입력 (선택)"
            className="flex-1 border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSuggestTopic}
            disabled={suggesting}
            className="border border-border font-bold rounded-[var(--radius-card-sm)] px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40 shrink-0"
          >
            {suggesting ? '추천 중...' : '추천글감받기'}
          </button>
        </div>
        {suggestedTopic && <p className="text-xs text-accent mb-4">💡 추천 소재: {suggestedTopic}</p>}

        {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !script.trim()}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
        >
          {creating ? '분할 중...' : '다음: 스타일 →'}
        </button>
      </div>

      <h2 className="font-bold mb-3">내 프로젝트</h2>
      <div className="space-y-2">
        {projects.length === 0 && <p className="text-sm text-muted">아직 만든 프로젝트가 없어요.</p>}
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/cut-daeri/${p.id}`}
            className="flex items-center justify-between border border-border rounded-[var(--radius-card)] px-4 py-3 hover:border-accent"
          >
            <div>
              <div className="text-sm font-bold">{p.topic || (p.script ? p.script.slice(0, 30) + '...' : '(제목 없음)')}</div>
              <div className="text-xs text-muted">{p.cut_count}컷</div>
            </div>
            <span className="text-xs font-bold text-muted">{p.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
