'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Project = { id: string; topic: string; title: string | null; tone: string; created_at: string };

const TONE_LABEL: Record<string, string> = { info: '정보 전달', story: '스토리텔링', persuade: '설득' };

export default function LongDaeriPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('info');
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
      body: JSON.stringify({ topic, tone }),
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
      <h1 className="text-2xl font-black mb-1">롱폼비서 · 숏폼비서</h1>
      <p className="text-sm text-muted mb-8">주제 하나로 롱폼 원고를 쓰고, 그 원고를 숏폼 대본 여러 편으로 나눠보세요.</p>

      <div className="border border-border rounded-[var(--radius-card)] p-6 mb-10">
        <h2 className="font-bold mb-4">새 원고</h2>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="주제를 입력하세요 (예: 퇴근 후 30분 홈트레이닝 루틴)"
          rows={2}
          className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-3 resize-none"
        />
        <div className="flex gap-3 mb-4">
          <select value={tone} onChange={(e) => setTone(e.target.value)} className="border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
            <option value="info">정보 전달</option>
            <option value="story">스토리텔링</option>
            <option value="persuade">설득</option>
          </select>
        </div>
        {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !topic.trim()}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
        >
          {creating ? '원고 생성 중...' : '원고 생성하기'}
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
              <div className="text-xs text-muted">{TONE_LABEL[p.tone] || p.tone}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
