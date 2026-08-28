'use client';

import { useEffect, useState } from 'react';

type Case = {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  title: string;
  channel_name: string;
  subscriber_count: number | null;
  view_count: number;
  insight: string;
};

function formatCount(n: number | null) {
  if (n === null) return '비공개';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  return n.toLocaleString();
}

export default function ButenaPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/butena')
      .then((r) => r.json())
      .then((d) => setCases(d.cases || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-1">떡상레이더</h1>
      <p className="text-sm text-muted mb-8">우연히 터진 게 아닙니다 — 무명에서 성장한 영상들의 공통점을 사례로 살펴보세요.</p>

      {loading && <p className="text-sm text-muted">불러오는 중...</p>}
      {!loading && cases.length === 0 && <p className="text-sm text-muted">아직 큐레이션된 사례가 없어요.</p>}

      <div className="space-y-5">
        {cases.map((c) => (
          <a
            key={c.id}
            href={c.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-border rounded-[var(--radius-card)] p-5 hover:border-accent"
          >
            <div className="flex gap-4 mb-3">
              {c.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.thumbnail_url} alt={c.title} className="w-32 h-20 object-cover rounded-[var(--radius-card-sm)] shrink-0" />
              )}
              <div>
                <div className="font-bold text-sm mb-1">{c.title}</div>
                <div className="text-xs text-muted">
                  {c.channel_name} · 구독자 {formatCount(c.subscriber_count)} · 조회수 {formatCount(c.view_count)}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted whitespace-pre-wrap">{c.insight}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
