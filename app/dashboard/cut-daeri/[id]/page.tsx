'use client';

import { useEffect, useState, useRef, use as usePromise } from 'react';

type Cut = { id: string; order_index: number; text: string; image_url: string | null; audio_url: string | null; status: string };
type Project = { id: string; topic: string; script: string; style: string; aspect_ratio: string; status: string; video_url: string | null };

export default function CutDaeriProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [project, setProject] = useState<Project | null>(null);
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<'image' | 'voice' | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function load() {
    fetch(`/api/cutdaeri/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProject(d.project);
        setCuts(d.cuts || []);
      });
  }

  useEffect(load, [id]);

  useEffect(() => {
    if (project?.status === 'rendering') {
      pollRef.current = setInterval(load, 5000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [project?.status, id]);

  async function generateImage(cutId: string) {
    setBusyId(cutId);
    setBusyKind('image');
    const res = await fetch(`/api/cutdaeri/cuts/${cutId}/generate-image`, { method: 'POST' });
    const data = await res.json();
    setBusyId(null);
    setBusyKind(null);
    if (res.ok) {
      setCuts((prev) => prev.map((c) => (c.id === cutId ? { ...c, image_url: data.imageUrl, status: 'done' } : c)));
    } else {
      alert(`이미지 생성 실패: ${data.error}`);
    }
  }

  async function generateVoice(cutId: string) {
    setBusyId(cutId);
    setBusyKind('voice');
    const res = await fetch(`/api/cutdaeri/cuts/${cutId}/generate-voice`, { method: 'POST' });
    const data = await res.json();
    setBusyId(null);
    setBusyKind(null);
    if (res.ok) {
      setCuts((prev) => prev.map((c) => (c.id === cutId ? { ...c, audio_url: data.audioUrl } : c)));
    } else {
      alert(`음성 생성 실패: ${data.error}`);
    }
  }

  async function generateAll(kind: 'image' | 'voice') {
    for (const cut of cuts) {
      const already = kind === 'image' ? cut.image_url : cut.audio_url;
      if (!already) await (kind === 'image' ? generateImage(cut.id) : generateVoice(cut.id));
    }
  }

  async function startRender() {
    setRenderError(null);
    const res = await fetch(`/api/cutdaeri/${id}/render`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      load();
    } else {
      setRenderError(data.error);
    }
  }

  if (!project) return <div className="text-sm text-muted">불러오는 중...</div>;

  const busy = busyId !== null;
  const allReady = cuts.length > 0 && cuts.every((c) => c.image_url && c.audio_url);

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

      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => generateAll('image')}
          disabled={busy}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-5 py-2 text-sm disabled:opacity-40"
        >
          전체 이미지 생성
        </button>
        <button
          type="button"
          onClick={() => generateAll('voice')}
          disabled={busy}
          className="border border-border font-bold rounded-[var(--radius-card-sm)] px-5 py-2 text-sm disabled:opacity-40"
        >
          전체 음성 생성
        </button>
      </div>

      <div className="space-y-4">
        {cuts.map((cut) => (
          <div key={cut.id} className="border border-border rounded-[var(--radius-card)] p-4 flex gap-4">
            <div
              className={`shrink-0 bg-neutral-100 rounded-[var(--radius-card-sm)] overflow-hidden ${
                project.aspect_ratio === '9:16' ? 'w-24 h-40' : 'w-40 h-24'
              } flex items-center justify-center`}
            >
              {cut.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cut.image_url} alt={`컷 ${cut.order_index + 1}`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-muted">{busyId === cut.id && busyKind === 'image' ? '생성 중...' : '이미지 없음'}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-muted mb-1">컷 {cut.order_index + 1}</div>
              <p className="text-sm mb-2">{cut.text}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => generateImage(cut.id)}
                  disabled={busy}
                  className="text-xs font-bold border border-border rounded-[var(--radius-pill)] px-3 py-1 hover:bg-neutral-50 disabled:opacity-40"
                >
                  {cut.image_url ? '이미지 다시 생성' : '이미지 생성'}
                </button>
                <button
                  type="button"
                  onClick={() => generateVoice(cut.id)}
                  disabled={busy}
                  className="text-xs font-bold border border-border rounded-[var(--radius-pill)] px-3 py-1 hover:bg-neutral-50 disabled:opacity-40"
                >
                  {busyId === cut.id && busyKind === 'voice' ? '생성 중...' : cut.audio_url ? '음성 다시 생성' : '음성 생성'}
                </button>
                {cut.audio_url && <audio controls src={cut.audio_url} className="h-8" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <h2 className="font-bold mb-3">최종 영상</h2>

        {project.status === 'done' && project.video_url ? (
          <video controls src={project.video_url} className={`rounded-[var(--radius-card)] ${project.aspect_ratio === '9:16' ? 'w-64' : 'w-full max-w-lg'}`} />
        ) : project.status === 'rendering' ? (
          <p className="text-sm text-muted">
            렌더링 중이에요... (유쇼츠 로컬 워커가 처리 중 — 워커가 꺼져있으면 여기서 멈춰있을 수 있어요)
          </p>
        ) : project.status === 'failed' ? (
          <p className="text-sm text-red-500">렌더링에 실패했어요. 컷별 이미지/음성을 확인하고 다시 시도해주세요.</p>
        ) : (
          <button
            type="button"
            onClick={startRender}
            disabled={!allReady}
            className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
          >
            영상 만들기
          </button>
        )}
        {!allReady && project.status === 'draft' && (
          <p className="text-xs text-muted mt-2">모든 컷의 이미지·음성을 먼저 생성해야 영상을 만들 수 있어요.</p>
        )}
        {renderError && <p className="text-xs text-red-500 mt-2">{renderError}</p>}
      </div>
    </div>
  );
}
