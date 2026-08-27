'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Project = { id: string; topic: string; style: string; aspect_ratio: string; status: string; created_at: string };

const STYLE_LABEL: Record<string, string> = { portrait: '인물 중심', natural: '내추럴', editorial: '에디토리얼' };

export default function CutDaeriPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('natural');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch('/api/cutdaeri')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }

  useEffect(load, []);

  async function handleCreate() {
    if (!topic.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch('/api/cutdaeri', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, style, aspectRatio }),
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
      <h1 className="text-2xl font-black mb-1">컷대리</h1>
      <p className="text-sm text-muted mb-8">주제 하나로 대본부터 영상까지 — 편집 기술이 없어도 괜찮습니다.</p>

      <div className="border border-border rounded-[var(--radius-card)] p-6 mb-10">
        <h2 className="font-bold mb-4">새 프로젝트</h2>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="주제를 입력하세요 (예: 겨울철 난방비 아끼는 법)"
          rows={2}
          className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-3 resize-none"
        />
        <div className="flex gap-3 mb-4">
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
            <option value="portrait">인물 중심</option>
            <option value="natural">내추럴</option>
            <option value="editorial">에디토리얼</option>
          </select>
          <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
            <option value="9:16">쇼츠 (9:16)</option>
            <option value="16:9">일반 (16:9)</option>
          </select>
        </div>
        {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !topic.trim()}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
        >
          {creating ? '대본 생성 중...' : '대본 생성하기'}
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
              <div className="text-sm font-bold">{p.topic}</div>
              <div className="text-xs text-muted">
                {STYLE_LABEL[p.style]} · {p.aspect_ratio}
              </div>
            </div>
            <span className="text-xs font-bold text-muted">{p.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
