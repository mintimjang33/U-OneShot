'use client';

import { useEffect, useState, use as usePromise } from 'react';

type Project = {
  id: string;
  source_image_url: string | null;
  input_mode: string;
  prompt_text: string | null;
  status: string;
  output_video_url: string | null;
};
type Angle = { id: string; order_index: number; angle_label: string; image_url: string | null; status: string };

export default function SabangpalbangProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [project, setProject] = useState<Project | null>(null);
  const [angles, setAngles] = useState<Angle[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  function load() {
    fetch(`/api/sabangpalbang/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProject(d.project);
        setAngles(d.angles || []);
      });
  }

  useEffect(load, [id]);

  async function regenerateVideo() {
    setVideoBusy(true);
    setVideoError(null);
    const res = await fetch(`/api/sabangpalbang/${id}/generate-video`, { method: 'POST' });
    const data = await res.json();
    setVideoBusy(false);
    if (res.ok) setProject(data.project);
    else setVideoError(data.error);
  }

  async function generateAngle(angleId: string) {
    setBusyId(angleId);
    const res = await fetch(`/api/sabangpalbang/angles/${angleId}/generate`, { method: 'POST' });
    const data = await res.json();
    setBusyId(null);
    if (res.ok) {
      setAngles((prev) => prev.map((a) => (a.id === angleId ? { ...a, image_url: data.imageUrl, status: 'done' } : a)));
    } else {
      alert(`생성 실패: ${data.error}`);
      setAngles((prev) => prev.map((a) => (a.id === angleId ? { ...a, status: 'failed' } : a)));
    }
  }

  async function generateAll() {
    for (const angle of angles) {
      if (!angle.image_url) await generateAngle(angle.id);
    }
  }

  if (!project) return <div className="text-sm text-muted">불러오는 중...</div>;

  if (project.input_mode === 'video') {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-black mb-4">요모조모 — 이미지 → 동영상</h1>
        <div className="flex gap-6 mb-6 flex-wrap">
          <div className="shrink-0">
            <div className="text-xs font-bold text-muted mb-2">원본</div>
            {project.source_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.source_image_url} alt="원본" className="w-32 h-32 object-cover rounded-[var(--radius-card)]" />
            )}
          </div>
          <div className="flex-1 min-w-[240px]">
            <div className="text-xs font-bold text-muted mb-2">결과 동영상</div>
            {project.status === 'done' && project.output_video_url ? (
              <video controls src={project.output_video_url} className="rounded-[var(--radius-card)] max-w-full w-64" />
            ) : project.status === 'generating' ? (
              <p className="text-sm text-muted">동영상 생성 중이에요...</p>
            ) : project.status === 'failed' ? (
              <p className="text-sm text-red-500">생성에 실패했어요.</p>
            ) : (
              <p className="text-sm text-muted">대기 중</p>
            )}
            <button
              type="button"
              onClick={regenerateVideo}
              disabled={videoBusy || project.status === 'generating'}
              className="mt-3 bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-5 py-2 text-sm disabled:opacity-40"
            >
              {videoBusy ? '생성 중...' : project.output_video_url ? '다시 생성' : '동영상 생성하기'}
            </button>
            {videoError && <p className="text-xs text-red-500 mt-2">{videoError}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-4">요모조모</h1>

      <div className="flex gap-6 mb-6">
        <div className="shrink-0">
          <div className="text-xs font-bold text-muted mb-2">원본</div>
          {project.source_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.source_image_url} alt="원본" className="w-32 h-32 object-cover rounded-[var(--radius-card)]" />
          ) : (
            <div className="w-32 h-32 bg-white/5 rounded-[var(--radius-card)] flex items-center justify-center p-2 text-center">
              <span className="text-[10px] text-muted">{project.prompt_text}</span>
            </div>
          )}
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={generateAll}
            disabled={busyId !== null}
            className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-5 py-2 text-sm disabled:opacity-40"
          >
            {busyId !== null ? '생성 중...' : '전체 앵글 생성'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {angles.map((angle) => (
          <div key={angle.id} className="border border-border rounded-[var(--radius-card)] overflow-hidden">
            <div className="w-full aspect-square bg-white/5 flex items-center justify-center">
              {angle.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={angle.image_url} alt={angle.angle_label} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-muted">{busyId === angle.id ? '생성 중...' : '대기 중'}</span>
              )}
            </div>
            <div className="p-2">
              <div className="text-xs font-bold mb-1.5">{angle.angle_label}</div>
              <button
                type="button"
                onClick={() => generateAngle(angle.id)}
                disabled={busyId !== null}
                className="w-full text-[11px] font-bold border border-border rounded-[var(--radius-pill)] py-1 hover:bg-white/10 disabled:opacity-40"
              >
                {angle.image_url ? '다시 생성' : '생성'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
