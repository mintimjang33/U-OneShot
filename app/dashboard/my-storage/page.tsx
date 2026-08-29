'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type CountInfo = { label: string; count: number };
type RecentItem = { tool: string; toolLabel: string; id: string; title: string; link: string; createdAt: string };

export default function MyStoragePage() {
  const [counts, setCounts] = useState<Record<string, CountInfo>>({});
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [toolFilter, setToolFilter] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/my-storage')
      .then((r) => r.json())
      .then((d) => {
        setCounts(d.counts || {});
        setRecent(d.recent || []);
        setLoading(false);
      });
  }, []);

  const filtered = recent.filter((item) => {
    if (toolFilter && item.tool !== toolFilter) return false;
    if (query.trim() && !item.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black mb-1">내 저장소</h1>
      <p className="text-sm text-muted mb-8">모든 도구에서 만든 결과물을 한 곳에서 찾아보세요.</p>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-8">
        {Object.entries(counts).map(([key, info]) => (
          <button
            key={key}
            type="button"
            onClick={() => setToolFilter((prev) => (prev === key ? null : key))}
            className={`border rounded-[var(--radius-card)] p-3 text-center ${
              toolFilter === key ? 'border-accent bg-accent-soft' : 'border-border hover:bg-white/10'
            }`}
          >
            <div className="text-xl font-black">{info.count}</div>
            <div className="text-[11px] text-muted">{info.label}</div>
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="제목, 키워드로 검색..."
        className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-6"
      />

      {loading ? (
        <p className="text-sm text-muted">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted">결과물이 없어요.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Link
              key={`${item.tool}-${item.id}`}
              href={item.link}
              className="flex items-center justify-between border border-border rounded-[var(--radius-card)] px-4 py-3 hover:border-accent"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{item.title}</div>
                <div className="text-xs text-muted">{item.toolLabel}</div>
              </div>
              <span className="text-[11px] text-muted shrink-0 ml-3">{new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
