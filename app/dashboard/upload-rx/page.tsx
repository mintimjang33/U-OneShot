'use client';

import { useEffect, useState } from 'react';

type Item = {
  id: string;
  topic: string;
  style: string;
  script: string | null;
  benchmark_url: string | null;
  titles: string[];
  description: string;
  hashtags: string[];
  created_at: string;
};

const STYLES = ['자극적', '정보전달', '감성형', '유머러스'];

function ResultCard({ item }: { item: Item }) {
  return (
    <div className="border border-border rounded-[var(--radius-card)] p-5">
      <div className="text-xs font-bold text-muted mb-3">
        {item.topic} · {item.style}
      </div>

      <div className="mb-4">
        <div className="text-xs font-bold mb-2">제목 후보</div>
        <ul className="space-y-1.5">
          {item.titles.map((t, i) => (
            <li key={i} className="text-sm border border-border rounded-[var(--radius-card-sm)] px-3 py-1.5">
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <div className="text-xs font-bold mb-2">설명 (더보기)</div>
        <p className="text-sm text-muted whitespace-pre-wrap">{item.description}</p>
      </div>

      <div>
        <div className="text-xs font-bold mb-2">해시태그</div>
        <div className="flex flex-wrap gap-1.5">
          {item.hashtags.map((h, i) => (
            <span key={i} className="text-xs bg-accent-soft text-accent rounded-[var(--radius-pill)] px-2 py-1">
              #{h}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UploadRxPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [benchmarkMode, setBenchmarkMode] = useState<'url' | 'img'>('url');
  const [benchmarkUrl, setBenchmarkUrl] = useState('');
  const [style, setStyle] = useState(STYLES[0]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch('/api/upload-rx')
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }

  useEffect(load, []);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setGenerating(true);
    setError(null);
    const res = await fetch('/api/upload-rx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, style, script: script || undefined, benchmarkUrl: benchmarkUrl || undefined }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setItems((prev) => [data.item, ...prev]);
    setTopic('');
    setScript('');
    setBenchmarkUrl('');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black mb-1">업로드 클리닉</h1>
      <p className="text-sm text-muted mb-8">조회수를 보장하는 최후의 알고리즘 튜닝.</p>

      <div className="border border-border rounded-[var(--radius-card)] p-6 mb-10">
        <div className="text-xs font-bold text-muted mb-1">1. 영상 주제 또는 가제</div>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예: 갤럭시 S25 울트라 일주일 사용기"
          className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4"
        />

        <div className="text-xs font-bold text-muted mb-1">2. 영상 원고 (SCRIPT)</div>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="원고 내용을 입력하면 더 정밀한 처방이 가능합니다."
          rows={4}
          className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4"
        />

        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-bold text-muted">3. 벤치마킹 레퍼런스</div>
          <div className="flex gap-1">
            {(['url', 'img'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setBenchmarkMode(m)}
                className={`text-[10px] font-bold rounded-[var(--radius-pill)] px-2 py-0.5 border ${
                  benchmarkMode === m ? 'bg-accent text-white border-accent' : 'border-border'
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {benchmarkMode === 'url' ? (
          <input
            value={benchmarkUrl}
            onChange={(e) => setBenchmarkUrl(e.target.value)}
            placeholder="유튜브 영상 링크를 입력하세요"
            className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4"
          />
        ) : (
          <p className="text-xs text-muted mb-4">이미지 업로드 방식은 아직 준비 중이에요 — URL을 이용해주세요.</p>
        )}

        <div className="text-xs font-bold text-muted mb-2">4. 알고리즘 전략 스타일</div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(s)}
              className={`text-xs font-bold rounded-[var(--radius-card-sm)] border px-2 py-2 ${
                style === s ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !topic.trim()}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2 text-sm disabled:opacity-40"
        >
          {generating ? '처방 중...' : '알고리즘 처방 받기'}
        </button>
      </div>

      <h2 className="font-bold mb-3">지난 결과</h2>
      <div className="space-y-4">
        {items.length === 0 && <p className="text-sm text-muted">아직 만든 결과가 없어요.</p>}
        {items.map((item) => (
          <ResultCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
