'use client';

import { useEffect, useState } from 'react';

type Item = { id: string; keyword: string; titles: string[]; description: string; hashtags: string[]; created_at: string };

function ResultCard({ item }: { item: Item }) {
  return (
    <div className="border border-border rounded-[var(--radius-card)] p-5">
      <div className="text-xs font-bold text-muted mb-3">키워드: {item.keyword}</div>

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
  const [keyword, setKeyword] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch('/api/upload-rx')
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }

  useEffect(load, []);

  async function handleGenerate() {
    if (!keyword.trim()) return;
    setGenerating(true);
    setError(null);
    const res = await fetch('/api/upload-rx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setItems((prev) => [data.item, ...prev]);
    setKeyword('');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black mb-1">업로드 처방전</h1>
      <p className="text-sm text-muted mb-8">키워드만 입력하면 클릭을 부르는 제목·설명·해시태그를 만들어 드립니다.</p>

      <div className="border border-border rounded-[var(--radius-card)] p-6 mb-10">
        <h2 className="font-bold mb-4">새로 만들기</h2>
        <div className="flex gap-3 mb-3">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="키워드를 입력하세요 (예: 자취 요리)"
            className="flex-1 border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !keyword.trim()}
            className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2 text-sm disabled:opacity-40"
          >
            {generating ? '생성 중...' : '생성하기'}
          </button>
        </div>
        {error && <div className="text-xs text-red-500">{error}</div>}
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
