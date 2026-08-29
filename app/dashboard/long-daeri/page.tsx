'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Project = { id: string; topic: string; title: string | null; category: string | null; created_at: string };

// 원본(8-4절) 실측 카테고리 그대로.
const CATEGORIES = ['서양철학', '동양철학', '건강/운동', '운세/사주', '생활/꿀팁', '부처님 말씀', '성경', '인간관계/처세', '전통 야담'];

export default function LongDaeriPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch('/api/longdaeri')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }

  useEffect(load, []);

  async function handleCreate() {
    if (!topic.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch('/api/longdaeri', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, category }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    window.location.href = `/dashboard/long-daeri/${data.project.id}`;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-black">롱폼비서</h1>
        <span className="text-xs font-bold text-accent bg-accent-soft rounded-[var(--radius-pill)] px-2 py-0.5">1. 분류</span>
      </div>
      <p className="text-sm text-muted mb-8">뇌리에 박히는 첫 문장, 심장에 남는 엔딩 — 글쓰기의 고통은 롱폼비서에게.</p>

      <div className="border border-border rounded-[var(--radius-card)] p-6 mb-10">
        <div className="text-xs font-bold text-muted mb-2">분류</div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`text-xs font-bold rounded-[var(--radius-card-sm)] border px-3 py-2.5 ${
                category === c ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="text-xs font-bold text-muted mb-2">2. 주제</div>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="직접 기획한 주제를 입력하세요 (예: 60세에 깨달은 관계의 본질)"
          rows={2}
          className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4 resize-none"
        />

        {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !topic.trim()}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
        >
          {creating ? '집필 중...' : '3. 집필 →'}
        </button>
      </div>

      <h2 className="font-bold mb-3">내 원고</h2>
      <div className="space-y-2">
        {projects.length === 0 && <p className="text-sm text-muted">아직 만든 원고가 없어요.</p>}
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/long-daeri/${p.id}`}
            className="flex items-center justify-between border border-border rounded-[var(--radius-card)] px-4 py-3 hover:border-accent"
          >
            <div>
              <div className="text-sm font-bold">{p.title || p.topic}</div>
              <div className="text-xs text-muted">{p.category}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
