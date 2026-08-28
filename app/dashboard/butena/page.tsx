'use client';

import { useState } from 'react';

type SearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  viewCount: number;
  subscriberCount: number | null;
  publishedAt: string;
};
type SavedCase = { id: string; video_url: string; thumbnail_url: string | null; title: string; channel_name: string; subscriber_count: number | null; view_count: number };
type HistoryItem = { id: string; query: string; created_at: string };

// 원본(8-3절) 실측: 검색창 아래 뜨는 추천 토픽 카드. 클릭하면 바로 그 주제로 검색된다.
const TOPIC_SUGGESTIONS = ['직장인 부업 추천', '좋은 사람 곁에 두는 법', '마흔 이후 인맥 정리법', '집착 버리는 법', '집중력 높이는 방법', '인생 후회 안 하는 법'];

function formatCount(n: number | null) {
  if (n === null) return '비공개';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  return n.toLocaleString();
}

export default function ButenaPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'search' | 'history' | 'archive'>('search');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [archive, setArchive] = useState<SavedCase[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setSearching(true);
    setError(null);
    setView('search');
    const res = await fetch('/api/butena/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    });
    const data = await res.json();
    setSearching(false);
    if (!res.ok) {
      setError(data.error);
      setResults(null);
      return;
    }
    setResults(data.results || []);
  }

  function loadHistory() {
    fetch('/api/butena/history')
      .then((r) => r.json())
      .then((d) => setHistory(d.history || []));
    setView('history');
  }

  function loadArchive() {
    fetch('/api/butena')
      .then((r) => r.json())
      .then((d) => setArchive(d.cases || []));
    setView('archive');
  }

  async function saveResult(r: SearchResult) {
    const res = await fetch('/api/butena', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrl: `https://youtube.com/watch?v=${r.videoId}`,
        thumbnailUrl: r.thumbnailUrl,
        title: r.title,
        channelName: r.channelTitle,
        subscriberCount: r.subscriberCount,
        viewCount: r.viewCount,
      }),
    });
    if (res.ok) setSavedIds((prev) => new Set(prev).add(r.videoId));
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-black">떡상레이더</h1>
        <div className="flex gap-2">
          <button type="button" onClick={loadHistory} className="text-xs font-bold text-muted hover:text-accent">
            검색 이력
          </button>
          <button type="button" onClick={loadArchive} className="text-xs font-bold text-muted hover:text-accent">
            보관함
          </button>
        </div>
      </div>
      <p className="text-sm text-muted mb-6">무명에서 터진 데는 이유가 있습니다 — '소재+썸네일' 실시간 탐지.</p>

      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
          placeholder="탐사하고 싶은 키워드 또는 유튜브 링크를 입력해보세요"
          className="flex-1 border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => runSearch(query)}
          disabled={searching || !query.trim()}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2 text-sm disabled:opacity-40"
        >
          {searching ? '탐지 중...' : '탐지'}
        </button>
      </div>

      {view === 'search' && !results && !searching && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
          {TOPIC_SUGGESTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => runSearch(t)}
              className="text-xs font-medium border border-border rounded-[var(--radius-card-sm)] px-3 py-3 text-center hover:border-accent"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

      {view === 'search' && results && (
        <div className="space-y-3">
          {results.length === 0 && <p className="text-sm text-muted">검색 결과가 없어요.</p>}
          {results.map((r) => (
            <div key={r.videoId} className="border border-border rounded-[var(--radius-card)] p-4 flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.thumbnailUrl && <img src={r.thumbnailUrl} alt={r.title} className="w-32 h-20 object-cover rounded-[var(--radius-card-sm)] shrink-0" />}
              <div className="flex-1 min-w-0">
                <a href={`https://youtube.com/watch?v=${r.videoId}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold hover:underline line-clamp-2">
                  {r.title}
                </a>
                <div className="text-xs text-muted mt-1">
                  {r.channelTitle} · 구독자 {formatCount(r.subscriberCount)} · 조회수 {formatCount(r.viewCount)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => saveResult(r)}
                disabled={savedIds.has(r.videoId)}
                className="self-start text-xs font-bold border border-border rounded-[var(--radius-pill)] px-3 py-1.5 hover:bg-neutral-50 disabled:opacity-40 shrink-0"
              >
                {savedIds.has(r.videoId) ? '저장됨' : '보관함에 저장'}
              </button>
            </div>
          ))}
        </div>
      )}

      {view === 'history' && (
        <div className="space-y-2">
          <h2 className="font-bold text-sm mb-2">검색 이력</h2>
          {history.length === 0 && <p className="text-sm text-muted">검색 이력이 없어요.</p>}
          {history.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => runSearch(h.query)}
              className="w-full text-left border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm hover:border-accent"
            >
              {h.query}
            </button>
          ))}
        </div>
      )}

      {view === 'archive' && (
        <div className="space-y-3">
          <h2 className="font-bold text-sm mb-2">보관함</h2>
          {archive.length === 0 && <p className="text-sm text-muted">저장한 항목이 없어요.</p>}
          {archive.map((c) => (
            <a
              key={c.id}
              href={c.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 border border-border rounded-[var(--radius-card)] p-4 hover:border-accent"
            >
              {c.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.thumbnail_url} alt={c.title} className="w-32 h-20 object-cover rounded-[var(--radius-card-sm)] shrink-0" />
              )}
              <div>
                <div className="text-sm font-bold">{c.title}</div>
                <div className="text-xs text-muted mt-1">
                  {c.channel_name} · 구독자 {formatCount(c.subscriber_count)} · 조회수 {formatCount(c.view_count)}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
