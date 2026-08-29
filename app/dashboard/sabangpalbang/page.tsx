'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Project = { id: string; source_image_url: string | null; input_mode: string; status: string; created_at: string };

// lib/generateImage.ts의 SABANGPALBANG_ANGLES와 순서를 맞춘 목록(UI 표시용).
const ANGLES = ['정면', '3/4 앵글', '좌측면', '우측면', '후면', '탑다운', '로우앵글', '클로즈업'];

export default function SabangpalbangPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [mode, setMode] = useState<'image' | 'prompt' | 'video'>('image');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [selectedAngles, setSelectedAngles] = useState<Set<number>>(new Set(ANGLES.map((_, i) => i)));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch('/api/sabangpalbang')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }

  useEffect(load, []);

  function toggleAngle(i: number) {
    setSelectedAngles((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function toggleAll() {
    setSelectedAngles((prev) => (prev.size === ANGLES.length ? new Set() : new Set(ANGLES.map((_, i) => i))));
  }

  async function handleSubmit() {
    if (selectedAngles.size === 0) {
      setError('앵글을 1개 이상 선택해주세요.');
      return;
    }
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('mode', mode);
    formData.append('aspectRatio', aspectRatio);
    formData.append('angleIndexes', Array.from(selectedAngles).join(','));
    if (mode === 'prompt') {
      formData.append('prompt', prompt);
    } else {
      const file = fileRef.current?.files?.[0];
      if (!file) {
        setUploading(false);
        setError('이미지 파일을 첨부해주세요.');
        return;
      }
      formData.append('image', file);
    }

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
      <h1 className="text-2xl font-black mb-1">요모조모</h1>
      <p className="text-sm text-muted mb-8">단 하나의 DNA, 여덟 가지 시선.</p>

      <div className="border border-border rounded-[var(--radius-card)] p-6 mb-10">
        <div className="text-xs font-bold text-muted mb-2">입력 모드</div>
        <div className="flex gap-2 mb-4">
          {(['image', 'prompt', 'video'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`text-xs font-bold rounded-[var(--radius-pill)] px-4 py-1.5 border ${
                mode === m ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
              }`}
            >
              {m === 'image' ? '이미지' : m === 'prompt' ? '프롬프트' : '동영상'}
            </button>
          ))}
        </div>

        {mode === 'video' && <p className="text-xs text-muted mb-4">동영상 입력모드는 아직 준비 중이에요. 이미지나 프롬프트를 이용해주세요.</p>}

        {mode === 'image' && <input ref={fileRef} type="file" accept="image/*" className="text-sm mb-4 block" />}

        {mode === 'prompt' && (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="원본 대신 쓸 피사체를 설명해주세요 (예: 은색 스니커즈 한 켤레, 스튜디오 조명)"
            rows={3}
            className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4"
          />
        )}

        <div className="flex items-center gap-2 mb-4 text-xs">
          <span className="text-muted">화면 비율</span>
          <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="border border-border rounded-[var(--radius-card-sm)] px-2 py-1">
            <option value="9:16">9:16 (Portrait)</option>
            <option value="16:9">16:9 (Landscape)</option>
          </select>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-muted">카메라 앵글</span>
          <button type="button" onClick={toggleAll} className="text-xs font-bold text-accent">
            전체 선택
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {ANGLES.map((label, i) => (
            <label key={label} className="flex items-center gap-1.5 text-xs border border-border rounded-[var(--radius-card-sm)] px-2 py-1.5">
              <input type="checkbox" checked={selectedAngles.has(i)} onChange={() => toggleAngle(i)} />
              {label}
            </label>
          ))}
        </div>

        {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={uploading || mode === 'video'}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
        >
          {uploading ? '시작하는 중...' : '시작하기'}
        </button>
      </div>

      <h2 className="font-bold mb-3">내 프로젝트</h2>
      <div className="grid grid-cols-3 gap-3">
        {projects.length === 0 && <p className="text-sm text-muted col-span-3">아직 만든 프로젝트가 없어요.</p>}
        {projects.map((p) => (
          <Link key={p.id} href={`/dashboard/sabangpalbang/${p.id}`} className="border border-border rounded-[var(--radius-card)] overflow-hidden hover:border-accent">
            {p.source_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.source_image_url} alt="원본" className="w-full h-24 object-cover" />
            ) : (
              <div className="w-full h-24 bg-white/5 flex items-center justify-center text-[10px] text-muted">프롬프트 생성</div>
            )}
            <div className="text-xs font-bold p-2 text-center">{p.status}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
