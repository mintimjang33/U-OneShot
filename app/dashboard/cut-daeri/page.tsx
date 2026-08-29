'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Project = { id: string; topic: string | null; script: string | null; cut_count: number | null; status: string; created_at: string };

const CUT_PRESETS = [3, 5, 8, 10, 12, 16, 20];

export default function CutDaeriPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [mode, setMode] = useState<'script' | 'image'>('script');
  const [script, setScript] = useState('');
  const [cutCount, setCutCount] = useState<number>(8);
  const [customCutCount, setCustomCutCount] = useState('');
  const [useCustomCount, setUseCustomCount] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [suggestedTopic, setSuggestedTopic] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [parallelScript, setParallelScript] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch('/api/cutdaeri')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }

  useEffect(load, []);

  async function handleSuggestTopic() {
    setSuggesting(true);
    setSuggestedTopic(null);
    const res = await fetch('/api/cutdaeri/suggest-topic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: keyword || undefined }),
    });
    const data = await res.json();
    setSuggesting(false);
    if (res.ok) setSuggestedTopic(data.topic);
  }

  async function handleCreate() {
    if (!script.trim()) return;
    const finalCutCount = useCustomCount ? Number(customCutCount) : cutCount;
    if (!finalCutCount || finalCutCount < 2) {
      setError('컷 수를 확인해주세요.');
      return;
    }
    setCreating(true);
    setError(null);
    const res = await fetch('/api/cutdaeri', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script, cutCount: finalCutCount, topic: suggestedTopic || undefined }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    window.location.href = `/dashboard/cut-daeri/${data.project.id}`;
  }

  async function handleCreateFromImages() {
    if (images.length === 0) return;
    setCreating(true);
    setError(null);
    const formData = new FormData();
    images.forEach((f) => formData.append('images', f));
    if (parallelScript.trim()) formData.append('script', parallelScript);
    if (suggestedTopic) formData.append('topic', suggestedTopic);
    const res = await fetch('/api/cutdaeri', { method: 'POST', body: formData });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    window.location.href = `/dashboard/cut-daeri/${data.project.id}`;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-black">컷비서</h1>
        <span className="text-xs font-bold text-accent bg-accent-soft rounded-[var(--radius-pill)] px-2 py-0.5">1. 원본 스크립트 입력</span>
      </div>
      <p className="text-sm text-muted mb-8">대본만 있으면 컷 나누기부터 나레이션까지 AI가 이어받습니다.</p>

      <div className="border border-border rounded-[var(--radius-card)] p-6 mb-10">
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('script')}
            className={`text-xs font-bold rounded-[var(--radius-pill)] px-4 py-1.5 border ${
              mode === 'script' ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
            }`}
          >
            원고 입력
          </button>
          <button
            type="button"
            onClick={() => setMode('image')}
            className={`text-xs font-bold rounded-[var(--radius-pill)] px-4 py-1.5 border ${
              mode === 'image' ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
            }`}
          >
            이미지 입력
          </button>
        </div>

        {mode === 'script' ? (
          <>
            <div className="text-xs font-bold text-muted mb-2">컷 수 기반 분할</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {CUT_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setUseCustomCount(false);
                    setCutCount(n);
                  }}
                  className={`text-xs font-bold rounded-[var(--radius-pill)] px-3 py-1.5 border ${
                    !useCustomCount && cutCount === n ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustomCount(true)}
                className={`text-xs font-bold rounded-[var(--radius-pill)] px-3 py-1.5 border ${
                  useCustomCount ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
                }`}
              >
                직접 입력
              </button>
              {useCustomCount && (
                <input
                  type="number"
                  min={2}
                  max={30}
                  value={customCutCount}
                  onChange={(e) => setCustomCutCount(e.target.value)}
                  placeholder="컷 수"
                  className="w-20 border border-border rounded-[var(--radius-pill)] px-3 py-1.5 text-xs"
                />
              )}
            </div>

            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="원고를 붙여넣기 하거나 직접 입력하세요."
              rows={8}
              className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4"
            />
          </>
        ) : (
          <>
            <div className="text-xs font-bold text-muted mb-1">이미지 입력</div>
            <p className="text-[11px] text-muted mb-3">이미지를 업로드하면 이미지 수만큼 씬이 생성됩니다.</p>
            <div
              onClick={() => imageInputRef.current?.click()}
              className="border border-dashed border-border rounded-[var(--radius-card-sm)] px-4 py-8 text-center cursor-pointer hover:border-accent mb-4"
            >
              <p className="text-sm font-bold">
                {images.length > 0 ? `이미지 ${images.length}장 선택됨` : '이미지를 선택하거나 끌어다 놓으세요 (여러 장 가능)'}
              </p>
              <p className="text-[11px] text-muted mt-1">이미지 1장 = 씬 1컷 · 장당 최대 100MB</p>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => setImages(Array.from(e.target.files || []))}
            />

            <label className="text-xs font-bold text-muted block mb-1">원고 병행 입력 (선택)</label>
            <p className="text-[11px] text-muted mb-2">원고를 입력하면 씬 수만큼 자동 분배됩니다. 비워두면 대사 없이 진행됩니다.</p>
            <textarea
              value={parallelScript}
              onChange={(e) => setParallelScript(e.target.value)}
              placeholder="원고를 입력하면 씬별 대사로 자동 분배됩니다. (선택)"
              rows={5}
              className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-4"
            />
          </>
        )}

        <div className="flex gap-2 mb-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="추천 받고 싶은 주제 키워드 입력 (선택)"
            className="flex-1 border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSuggestTopic}
            disabled={suggesting}
            className="border border-border font-bold rounded-[var(--radius-card-sm)] px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40 shrink-0"
          >
            {suggesting ? '추천 중...' : '추천글감받기'}
          </button>
        </div>
        {suggestedTopic && <p className="text-xs text-accent mb-4">💡 추천 소재: {suggestedTopic}</p>}

        {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
        {mode === 'script' ? (
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !script.trim()}
            className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
          >
            {creating ? '분할 중...' : '다음: 스타일 →'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreateFromImages}
            disabled={creating || images.length === 0}
            className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
          >
            {creating ? '생성 중...' : '다음: 스타일 →'}
          </button>
        )}
      </div>

      <h2 className="font-bold mb-3">내 프로젝트</h2>
      <div className="space-y-2">
        {projects.length === 0 && <p className="text-sm text-muted">아직 만든 프로젝트가 없어요.</p>}
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/cut-daeri/${p.id}`}
            className="flex items-center justify-between border border-border rounded-[var(--radius-card)] px-4 py-3 hover:border-accent"
          >
            <div>
              <div className="text-sm font-bold">{p.topic || (p.script ? p.script.slice(0, 30) + '...' : '(제목 없음)')}</div>
              <div className="text-xs text-muted">{p.cut_count}컷</div>
            </div>
            <span className="text-xs font-bold text-muted">{p.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
