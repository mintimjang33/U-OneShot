'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type CountInfo = { label: string; count: number };
type RecentItem = {
  tool: string;
  toolLabel: string;
  id: string;
  title: string;
  link: string;
  createdAt: string;
  mediaType: 'image' | 'video' | 'text';
  origin: 'original' | 'edited';
};
type StorageInfo = { usedBytes: number; limitBytes: number; tier: string };

const PAGE_SIZE = 20;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

export default function MyStoragePage() {
  const [counts, setCounts] = useState<Record<string, CountInfo>>({});
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [toolFilter, setToolFilter] = useState<string | null>(null);
  const [mediaFilter, setMediaFilter] = useState<'image' | 'video' | null>(null);
  const [originFilter, setOriginFilter] = useState<'all' | 'original' | 'edited'>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function load() {
    setLoading(true);
    fetch('/api/my-storage')
      .then((r) => r.json())
      .then((d) => {
        setCounts(d.counts || {});
        setRecent(d.recent || []);
        setStorage(d.storage || null);
        setLoading(false);
      });
  }

  useEffect(load, []);

  const filtered = recent.filter((item) => {
    if (toolFilter && item.tool !== toolFilter) return false;
    if (mediaFilter && item.mediaType !== mediaFilter) return false;
    if (originFilter !== 'all' && item.origin !== originFilter) return false;
    if (query.trim() && !item.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });
  const visible = filtered.slice(0, visibleCount);

  function itemKey(item: RecentItem) {
    return `${item.tool}-${item.id}`;
  }

  function toggleSelected(item: RecentItem) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = itemKey(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}개 항목을 삭제할까요?`)) return;
    const items = visible
      .filter((item) => selected.has(itemKey(item)))
      .map((item) => ({ tool: item.tool, id: item.id }));
    const res = await fetch('/api/my-storage', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (res.ok) {
      setSelected(new Set());
      setEditMode(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`삭제 실패: ${data.error || '알 수 없는 오류'}`);
    }
  }

  const storagePct = storage && storage.limitBytes > 0 ? Math.min(100, (storage.usedBytes / storage.limitBytes) * 100) : 0;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black mb-1">내 저장소</h1>
      <p className="text-sm text-muted mb-6">모든 도구에서 만든 결과물을 한 곳에서 찾아보세요.</p>

      {storage && (
        <div className="border border-border rounded-[var(--radius-card)] p-4 mb-6">
          <div className="flex items-center justify-between text-sm font-bold mb-2">
            <span>클라우드 저장소</span>
            <span className="text-muted font-normal">
              {formatBytes(storage.usedBytes)} / {formatBytes(storage.limitBytes)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${storagePct}%` }} />
          </div>
          <div className="text-[11px] text-muted mt-1 uppercase">
            {storage.tier} 플랜 · {storagePct.toFixed(1)}%
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
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

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목, 키워드로 검색..."
          className="flex-1 min-w-[160px] border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setMediaFilter((prev) => (prev === 'image' ? null : 'image'))}
          title="이미지만"
          className={`w-9 h-9 shrink-0 rounded-full border flex items-center justify-center ${
            mediaFilter === 'image' ? 'border-accent bg-accent-soft text-accent' : 'border-border'
          }`}
        >
          🖼
        </button>
        <button
          type="button"
          onClick={() => setMediaFilter((prev) => (prev === 'video' ? null : 'video'))}
          title="영상만"
          className={`w-9 h-9 shrink-0 rounded-full border flex items-center justify-center ${
            mediaFilter === 'video' ? 'border-accent bg-accent-soft text-accent' : 'border-border'
          }`}
        >
          🎬
        </button>
        <div className="flex border border-border rounded-[var(--radius-pill)] overflow-hidden shrink-0">
          {(['all', 'original', 'edited'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setOriginFilter(v)}
              className={`px-3 py-2 text-xs font-bold ${originFilter === v ? 'bg-accent text-white' : 'hover:bg-white/10'}`}
            >
              {v === 'all' ? '전체' : v === 'original' ? '원본' : '편집본'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          title="새로고침"
          className="w-9 h-9 shrink-0 rounded-full border border-border flex items-center justify-center hover:bg-white/10"
        >
          ↻
        </button>
        <button
          type="button"
          onClick={() => {
            setEditMode((prev) => !prev);
            setSelected(new Set());
          }}
          className={`shrink-0 text-xs font-bold rounded-[var(--radius-pill)] px-3 py-2 border ${
            editMode ? 'border-accent bg-accent-soft text-accent' : 'border-border hover:bg-white/10'
          }`}
        >
          편집
        </button>
      </div>

      {editMode && selected.size > 0 && (
        <div className="flex items-center justify-between border border-accent bg-accent-soft rounded-[var(--radius-card)] px-4 py-2 mb-4 text-sm">
          <span>{selected.size}개 선택됨</span>
          <button type="button" onClick={deleteSelected} className="font-bold text-red-400 hover:underline">
            선택 삭제
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted">결과물이 없어요.</p>
      ) : (
        <>
          <div className="space-y-2">
            {visible.map((item) => {
              const key = itemKey(item);
              const row = (
                <div className="flex items-center justify-between border border-border rounded-[var(--radius-card)] px-4 py-3 hover:border-accent">
                  <div className="min-w-0 flex items-center gap-3">
                    {editMode && (
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggleSelected(item)}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{item.title}</div>
                      <div className="text-xs text-muted">{item.toolLabel}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted shrink-0 ml-3">{new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              );
              return editMode ? (
                <div key={key} onClick={() => toggleSelected(item)} className="cursor-pointer">
                  {row}
                </div>
              ) : (
                <Link key={key} href={item.link}>
                  {row}
                </Link>
              );
            })}
          </div>
          {visibleCount < filtered.length && (
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="text-xs font-bold border border-border rounded-[var(--radius-pill)] px-4 py-2 hover:bg-white/10"
              >
                더 보기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
