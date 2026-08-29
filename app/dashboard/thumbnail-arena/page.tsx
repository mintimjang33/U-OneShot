'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Project = {
  id: string;
  mode: string;
  source_image_url: string | null;
  copy_text: string | null;
  image_urls: string[] | null;
  status: string;
  created_at: string;
};

const COPY_LAYOUTS = ['텍스트좌측', '텍스트우측', '중앙집중', '분할화면', '풀블리드', '대각선분할'];
const COPY_LAYOUT_LABELS: Record<string, string> = {
  텍스트좌측: '텍스트 좌측',
  텍스트우측: '텍스트 우측',
  중앙집중: '중앙 집중',
  분할화면: '분할 화면',
  풀블리드: '풀 블리드',
  대각선분할: '대각선 분할',
};
const COPY_STYLES = ['드라마틱', '시네마틱', '팝/컬러풀', '클린/미니멀'];

export default function ThumbnailRemixPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [mode, setMode] = useState<'variation' | 'copywriting'>('variation');
  const [prompt, setPrompt] = useState('');
  const [variantCount, setVariantCount] = useState(2);
  const [copyText, setCopyText] = useState('');
  const [mood, setMood] = useState('');
  const [layout, setLayout] = useState('텍스트좌측');
  const [visualStyle, setVisualStyle] = useState('드라마틱');
  const [extraPrompt, setExtraPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const subjectFileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch('/api/thumbarena')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }

  useEffect(load, []);

  async function handleSubmit() {
    setGenerating(true);
    setError(null);

    const formData = new FormData();
    formData.append('mode', mode);

    if (mode === 'copywriting') {
      if (!copyText.trim()) {
        setGenerating(false);
        setError('썸네일 텍스트를 입력해주세요.');
        return;
      }
      formData.append('copyText', copyText);
      if (mood) formData.append('mood', mood);
      formData.append('layout', layout);
      formData.append('visualStyle', visualStyle);
      if (extraPrompt) formData.append('extraPrompt', extraPrompt);
    } else {
      formData.append('variantCount', String(variantCount));
      const file = fileRef.current?.files?.[0];
      if (!file) {
        setGenerating(false);
        setError('원본 썸네일을 첨부해주세요.');
        return;
      }
      formData.append('image', file);
      if (prompt) formData.append('prompt', prompt);
      const subjectFile = subjectFileRef.current?.files?.[0];
      if (subjectFile) formData.append('subjectImage', subjectFile);
    }

    const res = await fetch('/api/thumbarena', { method: 'POST', body: formData });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    window.location.href = `/dashboard/thumbnail-arena/${data.project.id}`;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-1">썸네일 리믹스</h1>
      <p className="text-sm text-muted mb-8">썸네일 이미지와 문구를 여러 버전으로 뽑아 비교해보세요.</p>

      <div className="border border-border rounded-[var(--radius-card)] p-6 mb-10">
        <div className="text-xs font-bold text-muted mb-2">입력 모드</div>
        <div className="flex gap-2 mb-4">
          {(['variation', 'copywriting'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`text-xs font-bold rounded-[var(--radius-pill)] px-4 py-1.5 border ${
                mode === m ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
              }`}
            >
              {m === 'variation' ? '썸네일 변형' : '카피라이팅'}
            </button>
          ))}
        </div>

        {mode === 'variation' ? (
          <>
            <label className="text-xs font-bold text-muted block mb-1">원본 썸네일</label>
            <input ref={fileRef} type="file" accept="image/*" className="text-sm mb-4 block" />

            <label className="text-xs font-bold text-muted block mb-1">카피 수량</label>
            <div className="flex gap-2 mb-4">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setVariantCount(n)}
                  className={`text-xs font-bold rounded-[var(--radius-pill)] px-4 py-1.5 border ${
                    variantCount === n ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
                  }`}
                >
                  {n}개
                </button>
              ))}
            </div>

            <label className="text-xs font-bold text-muted block mb-1">프롬프트 (선택)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="원하는 카피 방향이나 스타일을 설명해주세요..."
              rows={2}
              className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4"
            />

            <label className="text-xs font-bold text-muted block mb-1">피사체 (선택)</label>
            <p className="text-[11px] text-muted mb-1">피사체를 업로드하면 썸네일 속 인물을 교체합니다.</p>
            <input ref={subjectFileRef} type="file" accept="image/*" className="text-sm mb-4 block" />
          </>
        ) : (
          <>
            <label className="text-xs font-bold text-muted block mb-1">썸네일 텍스트</label>
            <textarea
              value={copyText}
              onChange={(e) => setCopyText(e.target.value)}
              placeholder="썸네일에 표시할 텍스트를 입력하세요..."
              rows={2}
              className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4"
            />

            <label className="text-xs font-bold text-muted block mb-1">텍스트 분위기</label>
            <input
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="예: 자극적, 감성, 유머..."
              className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4"
            />

            <label className="text-xs font-bold text-muted block mb-1">레이아웃 선택</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {COPY_LAYOUTS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLayout(l)}
                  className={`text-xs font-bold rounded-[var(--radius-card-sm)] px-3 py-1.5 border ${
                    layout === l ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
                  }`}
                >
                  {COPY_LAYOUT_LABELS[l]}
                </button>
              ))}
            </div>

            <label className="text-xs font-bold text-muted block mb-1">스타일 선택</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {COPY_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setVisualStyle(s)}
                  className={`text-xs font-bold rounded-[var(--radius-card-sm)] px-3 py-1.5 border ${
                    visualStyle === s ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <label className="text-xs font-bold text-muted block mb-1">추가 프롬프트 (선택)</label>
            <textarea
              value={extraPrompt}
              onChange={(e) => setExtraPrompt(e.target.value)}
              placeholder="배경, 소품 등 추가로 반영하고 싶은 내용을 입력하세요..."
              rows={2}
              className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4"
            />
          </>
        )}

        {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={generating}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
        >
          {generating ? '생성 중...' : '생성하기'}
        </button>
      </div>

      <h2 className="font-bold mb-3">내 프로젝트</h2>
      <div className="grid grid-cols-3 gap-3">
        {projects.length === 0 && <p className="text-sm text-muted col-span-3">아직 만든 프로젝트가 없어요.</p>}
        {projects.map((p) => (
          <Link key={p.id} href={`/dashboard/thumbnail-arena/${p.id}`} className="border border-border rounded-[var(--radius-card)] overflow-hidden hover:border-accent">
            {p.mode === 'copywriting' && p.image_urls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_urls[0]} alt={p.copy_text || '카피라이팅'} className="w-full h-24 object-cover" />
            ) : p.source_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.source_image_url} alt="원본" className="w-full h-24 object-cover" />
            ) : (
              <div className="w-full h-24 bg-white/5 flex items-center justify-center text-[10px] text-muted p-2 text-center">{p.copy_text || '카피라이팅'}</div>
            )}
            <div className="text-xs font-bold p-2 text-center">{p.status}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
