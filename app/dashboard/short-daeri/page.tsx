'use client';

import { useEffect, useState } from 'react';

type ShortItem = { id: string; order_index: number; title: string; content: string };
type Project = { id: string; source_text: string; created_at: string };

export default function ShortDaeriPage() {
  const [sourceText, setSourceText] = useState('');
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    if (source) setSourceText(source);

    fetch('/api/shortdaeri')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }, []);

  async function handleGenerate() {
    if (!sourceText.trim()) return;
    setGenerating(true);
    setError(null);
    setShorts([]);
    const res = await fetch('/api/shortdaeri', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceText }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setShorts(data.shorts || []);
    setProjects((prev) => [data.project, ...prev]);
  }

  async function loadProject(id: string) {
    const res = await fetch(`/api/shortdaeri/${id}`);
    const data = await res.json();
    if (res.ok) {
      setSourceText(data.project.source_text);
      setShorts(data.shorts || []);
    }
  }

  const withSpaces = sourceText.length;
  const withoutSpaces = sourceText.replace(/\s/g, '').length;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-1">숏폼비서</h1>
      <p className="text-sm text-muted mb-8">긴 영상 하나로 숏폼 10개, 클릭 한 번에 쏟아집니다.</p>

      <div className="border border-border rounded-[var(--radius-card)] p-6 mb-10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-muted">원본 스크립트 입력</div>
          <div className="text-xs text-muted">
            공백포함 {withSpaces} | 공백제외 {withoutSpaces}
          </div>
        </div>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="변환할 긴 원고를 입력하세요. (권장: 800~1,500자)"
          rows={10}
          className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4"
        />

        {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !sourceText.trim()}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
        >
          {generating ? '추출 중...' : '숏폼 스크립트 추출 시작'}
        </button>
      </div>

      {shorts.length > 0 && (
        <div className="mb-10">
          <h2 className="font-bold mb-3">숏폼 대본 ({shorts.length}편)</h2>
          <div className="space-y-3">
            {shorts.map((s) => (
              <div key={s.id} className="border border-border rounded-[var(--radius-card)] p-4">
                <div className="text-xs font-bold text-muted mb-1">
                  {s.order_index + 1}편 · {s.title}
                </div>
                <p className="text-sm whitespace-pre-wrap">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-bold mb-3">이력</h2>
      <div className="space-y-2">
        {projects.length === 0 && <p className="text-sm text-muted">아직 만든 게 없어요.</p>}
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => loadProject(p.id)}
            className="w-full text-left border border-border rounded-[var(--radius-card)] px-4 py-3 text-sm hover:border-accent"
          >
            {p.source_text.slice(0, 60)}...
          </button>
        ))}
      </div>
    </div>
  );
}
