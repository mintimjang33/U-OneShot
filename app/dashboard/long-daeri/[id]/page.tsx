'use client';

import { useEffect, useState, use as usePromise } from 'react';
import Link from 'next/link';

type Project = { id: string; topic: string; title: string | null; content: string; category: string | null };

export default function LongDaeriProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    fetch(`/api/longdaeri/${id}`)
      .then((r) => r.json())
      .then((d) => setProject(d.project));
  }, [id]);

  if (!project) return <div className="text-sm text-muted">불러오는 중...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-1">{project.title || project.topic}</h1>
      <p className="text-xs text-muted mb-6">{project.category}</p>
      <p className="text-sm whitespace-pre-wrap mb-8">{project.content}</p>

      <div className="border-t border-border pt-6">
        <p className="text-sm text-muted mb-3">이 원고를 숏폼 대본 여러 편으로 나누고 싶다면, 숏폼비서에 붙여넣어보세요.</p>
        <Link
          href={{ pathname: '/dashboard/short-daeri', query: { source: project.content } }}
          className="inline-block bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm"
        >
          숏폼비서로 보내기 →
        </Link>
      </div>
    </div>
  );
}
