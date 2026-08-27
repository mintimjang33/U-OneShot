'use client';

import { useEffect, useState, use as usePromise } from 'react';

type Cut = { id: string; order_index: number; text: string; image_url: string | null; status: string };
type Project = { id: string; topic: string; script: string; style: string; aspect_ratio: string };

export default function CutDaeriProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [project, setProject] = useState<Project | null>(null);
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  function load() {
    fetch(`/api/cutdaeri/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProject(d.project);
        setCuts(d.cuts || []);
      });
  }

  useEffect(load, [id]);

  async function generateImage(cutId: string) {
    setGeneratingId(cutId);
    const res = await fetch(`/api/cutdaeri/cuts/${cutId}/generate-image`, { method: 'POST' });
    const data = await res.json();
    setGeneratingId(null);
    if (res.ok) {
      setCuts((prev) => prev.map((c) => (c.id === cutId ? { ...c, image_url: data.imageUrl, status: 'done' } : c)));
    } else {
      alert(`이미지 생성 실패: ${data.error}`);
      setCuts((prev) => prev.map((c) => (c.id === cutId ? { ...c, status: 'failed' } : c)));
    }
  }

  async function generateAllImages() {
    for (const cut of cuts) {
      if (!cut.image_url) await generateImage(cut.id);
    }
  }

  if (!project) return <div className="text-sm text-muted">불러오는 중...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-1">{project.topic}</h1>
      <p className="text-xs text-muted mb-6">
        {project.style} · {project.aspect_ratio} · 컷 {cuts.length}개
      </p>

      <details className="mb-6 border border-border rounded-[var(--radius-card)] p-4">
        <summary className="text-sm font-bold cursor-pointer">전체 대본 보기</summary>
        <p className="text-sm text-muted mt-3 whitespace-pre-wrap">{project.script}</p>
      </details>

      <button
        type="button"
        onClick={generateAllImages}
        disabled={generatingId !== null}
        className="mb-6 bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-5 py-2 text-sm disabled:opacity-40"
      >
        전체 이미지 생성
      </button>

      <div className="space-y-4">
        {cuts.map((cut) => (
          <div key={cut.id} className="border border-border rounded-[var(--radius-card)] p-4 flex gap-4">
            <div className={`shrink-0 bg-neutral-100 rounded-[var(--radius-card-sm)] overflow-hidden ${project.aspect_ratio === '9:16' ? 'w-24 h-40' : 'w-40 h-24'} flex items-center justify-center`}>
              {cut.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cut.image_url} alt={`컷 ${cut.order_index + 1}`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-muted">
                  {generatingId === cut.id ? '생성 중...' : cut.status === 'failed' ? '생성 실패' : '이미지 없음'}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-muted mb-1">컷 {cut.order_index + 1}</div>
              <p className="text-sm mb-2">{cut.text}</p>
              <button
                type="button"
                onClick={() => generateImage(cut.id)}
                disabled={generatingId !== null}
                className="text-xs font-bold border border-border rounded-[var(--radius-pill)] px-3 py-1 hover:bg-neutral-50 disabled:opacity-40"
              >
                {cut.image_url ? '다시 생성' : '이미지 생성'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted mt-8">
        다음 단계(음성 생성 · 자막 · 최종 렌더링)는 아직 준비 중이에요.
      </p>
    </div>
  );
}
