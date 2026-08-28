'use client';

import { useEffect, useState, use as usePromise } from 'react';

type Project = { id: string; source_image_url: string; status: string };
type Angle = { id: string; order_index: number; angle_label: string; image_url: string | null; status: string };

export default function SabangpalbangProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [project, setProject] = useState<Project | null>(null);
  const [angles, setAngles] = useState<Angle[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    fetch(`/api/sabangpalbang/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProject(d.project);
        setAngles(d.angles || []);
      });
  }

  useEffect(load, [id]);

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

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-4">사방팔방</h1>

      <div className="flex gap-6 mb-6">
        <div className="shrink-0">
          <div className="text-xs font-bold text-muted mb-2">원본</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={project.source_image_url} alt="원본" className="w-32 h-32 object-cover rounded-[var(--radius-card)]" />
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
            <div className="w-full aspect-square bg-neutral-100 flex items-center justify-center">
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
                className="w-full text-[11px] font-bold border border-border rounded-[var(--radius-pill)] py-1 hover:bg-neutral-50 disabled:opacity-40"
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
