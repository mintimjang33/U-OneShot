'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Project = { id: string; source_image_url: string; status: string; created_at: string };

export default function SabangpalbangPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch('/api/sabangpalbang')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }

  useEffect(load, []);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/sabangpalbang', { method: 'POST', body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    window.location.href = `/dashboard/sabangpalbang/${data.project.id}`;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-1">사방팔방</h1>
      <p className="text-sm text-muted mb-8">한 장의 원본으로 8개의 다양한 앵글을 자동 생성합니다.</p>

      <div className="border border-border rounded-[var(--radius-card)] p-6 mb-10">
        <h2 className="font-bold mb-4">원본 이미지 업로드</h2>
        <input ref={fileRef} type="file" accept="image/*" className="text-sm mb-3 block" />
        {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
        >
          {uploading ? '업로드 중...' : '업로드하고 시작하기'}
        </button>
      </div>

      <h2 className="font-bold mb-3">내 프로젝트</h2>
      <div className="grid grid-cols-3 gap-3">
        {projects.length === 0 && <p className="text-sm text-muted col-span-3">아직 만든 프로젝트가 없어요.</p>}
        {projects.map((p) => (
          <Link key={p.id} href={`/dashboard/sabangpalbang/${p.id}`} className="border border-border rounded-[var(--radius-card)] overflow-hidden hover:border-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.source_image_url} alt="원본" className="w-full h-24 object-cover" />
            <div className="text-xs font-bold p-2 text-center">{p.status}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
