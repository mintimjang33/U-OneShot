'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Project = { id: string; image_urls: string[]; winner_url: string | null; status: string };

export default function ThumbnailArenaPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch('/api/thumbarena')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }

  useEffect(load, []);

  async function handleUpload() {
    const files = fileRef.current?.files;
    if (!files || files.length < 2) {
      setError('썸네일을 2장 이상 선택해주세요.');
      return;
    }
    setUploading(true);
    setError(null);

    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('images', f));
    const res = await fetch('/api/thumbarena', { method: 'POST', body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    window.location.href = `/dashboard/thumbnail-arena/${data.project.id}`;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-1">썸네일 리믹스</h1>
      <p className="text-sm text-muted mb-8">후보 썸네일을 올리고 토너먼트로 골라 가장 반응 좋을 것 같은 걸 찾아보세요.</p>

      <div className="border border-border rounded-[var(--radius-card)] p-6 mb-10">
        <h2 className="font-bold mb-4">새 토너먼트</h2>
        <input ref={fileRef} type="file" accept="image/*" multiple className="text-sm mb-2 block" />
        <p className="text-xs text-muted mb-3">2, 4, 8, 16장처럼 2의 거듭제곱 개수로 선택하세요.</p>
        {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
        >
          {uploading ? '업로드 중...' : '토너먼트 시작하기'}
        </button>
      </div>

      <h2 className="font-bold mb-3">내 토너먼트</h2>
      <div className="space-y-2">
        {projects.length === 0 && <p className="text-sm text-muted">아직 만든 토너먼트가 없어요.</p>}
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/thumbnail-arena/${p.id}`}
            className="flex items-center justify-between border border-border rounded-[var(--radius-card)] px-4 py-3 hover:border-accent"
          >
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.winner_url || p.image_urls[0]} alt="썸네일" className="w-16 h-9 object-cover rounded-[var(--radius-card-sm)]" />
              <span className="text-sm font-bold">{p.image_urls.length}강 토너먼트</span>
            </div>
            <span className="text-xs font-bold text-muted">{p.status === 'done' ? '완료' : '진행 중'}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
