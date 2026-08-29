'use client';

import { useEffect, useState, use as usePromise } from 'react';

type Project = {
  id: string;
  mode: string;
  source_image_url: string | null;
  prompt_text: string | null;
  copy_text: string | null;
  mood: string | null;
  layout: string | null;
  visual_style: string | null;
  image_urls: string[] | null;
  status: string;
};

export default function ThumbnailRemixProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    fetch(`/api/thumbarena/${id}`)
      .then((r) => r.json())
      .then((d) => setProject(d.project));
  }, [id]);

  if (!project) return <div className="text-sm text-muted">불러오는 중...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-1">{project.mode === 'copywriting' ? project.copy_text : '썸네일 변형 결과'}</h1>
      <p className="text-sm text-muted mb-8">{project.status === 'done' ? '완료' : '생성 중...'}</p>

      {project.mode === 'variation' && (
        <>
          {project.source_image_url && (
            <div className="mb-6">
              <div className="text-xs font-bold text-muted mb-2">원본</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={project.source_image_url} alt="원본" className="w-48 rounded-[var(--radius-card)] border border-border" />
            </div>
          )}
          <div className="text-xs font-bold text-muted mb-2">변형 결과</div>
          <div className="grid grid-cols-2 gap-4">
            {(project.image_urls || []).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`변형 ${i + 1}`} className="w-full rounded-[var(--radius-card)] border border-border" />
            ))}
          </div>
          {project.status === 'draft' && <p className="text-sm text-muted mt-4">생성 중이에요...</p>}
        </>
      )}

      {project.mode === 'copywriting' && (
        <div>
          {project.image_urls?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.image_urls[0]} alt={project.copy_text || '썸네일'} className="w-full max-w-xl rounded-[var(--radius-card)] border border-border mb-4" />
          ) : (
            <p className="text-sm text-muted mb-4">생성 중이에요...</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            {project.mood && <span className="border border-border rounded-[var(--radius-pill)] px-3 py-1">분위기: {project.mood}</span>}
            {project.layout && <span className="border border-border rounded-[var(--radius-pill)] px-3 py-1">레이아웃: {project.layout}</span>}
            {project.visual_style && <span className="border border-border rounded-[var(--radius-pill)] px-3 py-1">스타일: {project.visual_style}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
