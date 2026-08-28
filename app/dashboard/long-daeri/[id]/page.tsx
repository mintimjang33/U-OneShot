'use client';

import { useEffect, useState, use as usePromise } from 'react';

type Project = { id: string; topic: string; title: string | null; content: string; tone: string };
type ShortItem = { id: string; order_index: number; title: string; content: string };

export default function LongDaeriProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [project, setProject] = useState<Project | null>(null);
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [splitting, setSplitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/longdaeri/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProject(d.project);
        setShorts(d.shorts || []);
      });
  }

  useEffect(load, [id]);

  async function handleSplit() {
    setSplitting(true);
    setError(null);
    const res = await fetch(`/api/longdaeri/${id}/split`, { method: 'POST' });
    const data = await res.json();
    setSplitting(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setShorts(data.shorts || []);
  }

  if (!project) return <div className="text-sm text-muted">불러오는 중...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-1">{project.title || project.topic}</h1>
      <p className="text-xs text-muted mb-6 whitespace-pre-wrap">{project.content}</p>

      <div className="border-t border-border pt-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">숏폼 대본 ({shorts.length}편)</h2>
          <button
            type="button"
            onClick={handleSplit}
            disabled={splitting}
            className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-5 py-2 text-sm disabled:opacity-40"
          >
            {splitting ? '분할 중...' : shorts.length > 0 ? '숏폼 다시 분할하기' : '숏폼으로 분할하기'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {shorts.length === 0 && !splitting && <p className="text-sm text-muted">아직 분할된 숏폼 대본이 없어요.</p>}

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
    </div>
  );
}
