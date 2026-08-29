'use client';

import { useEffect, useState, useRef, use as usePromise } from 'react';
import { CAPTION_FONTS, CAPTION_COLOR_SWATCHES, CAPTION_BACKGROUND_MODES, DEFAULT_CAPTION_STYLE, type CaptionStyle } from '../../../../lib/captionPresets';

type Cut = { id: string; order_index: number; text: string; image_url: string | null; audio_url: string | null; status: string };
type Project = {
  id: string;
  topic: string | null;
  script: string;
  style: string | null;
  aspect_ratio: string;
  character_image_url: string | null;
  direction_prompt: string | null;
  status: string;
  video_url: string | null;
  caption_style: CaptionStyle | null;
};

// lib/generateImage.ts의 CUTDAERI_STYLES와 순서를 맞춘 목록(UI 표시용).
const STYLE_OPTIONS = [
  { value: 'portrait', label: '인물 중심' },
  { value: 'natural', label: '내추럴' },
  { value: 'editorial', label: '에디토리얼' },
  { value: 'illustration', label: '일러스트' },
  { value: '3d_character', label: '3D 캐릭터' },
  { value: 'risograph', label: '리소그래프' },
  { value: 'pixel_art', label: '픽셀아트' },
  { value: 'oil_painting', label: '유화' },
  { value: 'korean_traditional', label: '한국 전통화' },
  { value: 'cartoon', label: '카툰' },
  { value: 'pop_surreal', label: '팝 초현실' },
  { value: 'vibrant_film', label: '비브런트 필름' },
  { value: 'fashion_photo', label: '패션 포토' },
  { value: 'glitch_collage', label: '글리치 콜라주' },
  { value: 'retro_film', label: '레트로 필름' },
  { value: 'cross_process', label: '크로스프로세스' },
  { value: 'film_landscape', label: '필름 풍경' },
  { value: 'bold_line', label: '볼드 라인' },
  { value: 'watercolor', label: '수채화' },
];

const ASPECT_RATIOS = [
  { value: '9:16', label: '9:16 (숏폼)' },
  { value: '16:9', label: '16:9 (유튜브)' },
  { value: '1:1', label: '1:1 (정사각형)' },
  { value: '4:3', label: '4:3 (클래식)' },
  { value: '3:4', label: '3:4 (포트레이트)' },
];

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <span className="text-xs font-bold text-accent bg-accent-soft rounded-[var(--radius-pill)] px-2 py-0.5">
      {n}. {label}
    </span>
  );
}

export default function CutDaeriProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [project, setProject] = useState<Project | null>(null);
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<'image' | 'voice' | 'upload' | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [style, setStyle] = useState('natural');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [directionPrompt, setDirectionPrompt] = useState('');
  const [settingStyle, setSettingStyle] = useState(false);
  const characterFileRef = useRef<HTMLInputElement>(null);
  const uploadFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 4단계(자막 스타일) — 프로젝트가 처음 로드되면 저장된 값(또는 기본값)으로 초기화한다.
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(DEFAULT_CAPTION_STYLE);
  const [savingCaptionStyle, setSavingCaptionStyle] = useState(false);
  const [captionStyleInitialized, setCaptionStyleInitialized] = useState(false);

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
    if (project && !captionStyleInitialized) {
      if (project.caption_style) setCaptionStyle(project.caption_style);
      setCaptionStyleInitialized(true);
    }
  }, [project, captionStyleInitialized]);

  useEffect(() => {
    if (project?.status === 'rendering') {
      pollRef.current = setInterval(load, 5000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [project?.status, id]);

  async function confirmStyle() {
    setSettingStyle(true);
    const formData = new FormData();
    formData.append('style', style);
    formData.append('aspectRatio', aspectRatio);
    if (directionPrompt) formData.append('directionPrompt', directionPrompt);
    const characterFile = characterFileRef.current?.files?.[0];
    if (characterFile) formData.append('characterImage', characterFile);

    const res = await fetch(`/api/cutdaeri/${id}`, { method: 'PATCH', body: formData });
    const data = await res.json();
    setSettingStyle(false);
    if (res.ok) setProject(data.project);
  }

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

  async function uploadImage(cutId: string, file: File) {
    setBusyId(cutId);
    setBusyKind('upload');
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`/api/cutdaeri/cuts/${cutId}/upload-image`, { method: 'POST', body: formData });
    const data = await res.json();
    setBusyId(null);
    setBusyKind(null);
    if (res.ok) {
      setCuts((prev) => prev.map((c) => (c.id === cutId ? { ...c, image_url: data.imageUrl, status: 'done' } : c)));
    } else {
      alert(`이미지 업로드 실패: ${data.error}`);
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

  async function saveCaptionStyle() {
    setSavingCaptionStyle(true);
    const res = await fetch(`/api/cutdaeri/${id}/caption-style`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(captionStyle),
    });
    const data = await res.json();
    setSavingCaptionStyle(false);
    if (res.ok) setProject(data.project);
    return res.ok;
  }

  async function startRender() {
    setRenderError(null);
    const styleSaved = await saveCaptionStyle();
    if (!styleSaved) {
      setRenderError('자막 스타일 저장에 실패했습니다.');
      return;
    }
    const res = await fetch(`/api/cutdaeri/${id}/render`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      load();
    } else {
      setRenderError(data.error);
    }
  }

  if (!project) return <div className="text-sm text-muted">불러오는 중...</div>;

  // 2단계: 스타일을 아직 안 정했으면 컷 생성을 막고 스타일/화면비율/캐릭터/디렉션 선택 화면을 먼저 보여준다.
  if (!project.style) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-black">컷비서</h1>
          <StepBadge n={2} label="이미지 스타일" />
        </div>
        <p className="text-sm text-muted mb-8">이 프로젝트에 쓸 이미지 스타일을 골라주세요. 컷 {cuts.length}개 준비됨.</p>

        <div className="border border-border rounded-[var(--radius-card)] p-6 space-y-6">
          <div>
            <div className="text-xs font-bold text-muted mb-2">스타일</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {STYLE_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  className={`text-xs font-bold rounded-[var(--radius-card-sm)] border px-2 py-2.5 ${
                    style === s.value ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-muted mb-2">화면 비율</div>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setAspectRatio(r.value)}
                  className={`text-xs font-bold rounded-[var(--radius-pill)] border px-3 py-1.5 ${
                    aspectRatio === r.value ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-muted mb-1">이미지 모델</div>
            <p className="text-xs border border-border rounded-[var(--radius-card-sm)] px-3 py-2 inline-block">Google Nano Banana 2</p>
          </div>

          <div>
            <label className="text-xs font-bold text-muted block mb-1">추가 디렉션 프롬프트 (선택)</label>
            <textarea
              value={directionPrompt}
              onChange={(e) => setDirectionPrompt(e.target.value)}
              placeholder="배경, 인물, 분위기 등 추가 디렉션을 입력하세요 (비워두면 자동 생성)"
              rows={2}
              className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted block mb-1">캐릭터 (선택)</label>
            <p className="text-[11px] text-muted mb-1">레퍼런스 이미지를 업로드하면 모든 컷에 동일 인물이 등장합니다.</p>
            <input ref={characterFileRef} type="file" accept="image/*" className="text-sm block" />
          </div>

          <button
            type="button"
            onClick={confirmStyle}
            disabled={settingStyle}
            className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40"
          >
            {settingStyle ? '적용 중...' : '다음: 생성 →'}
          </button>
        </div>
      </div>
    );
  }

  const busy = busyId !== null;
  const allReady = cuts.length > 0 && cuts.every((c) => c.image_url && c.audio_url);
  const stepDone = project.status === 'done';
  const showCaptionStep = allReady && (project.status === 'draft' || project.status === 'done');
  const stepLabel = stepDone ? '완료' : project.status === 'rendering' ? '렌더링 중' : showCaptionStep ? '자막 스타일' : '생성';

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-black">{project.topic || '컷비서 프로젝트'}</h1>
        <StepBadge n={allReady ? 4 : 3} label={stepLabel} />
      </div>
      <p className="text-xs text-muted mb-6">
        {STYLE_OPTIONS.find((s) => s.value === project.style)?.label} · {project.aspect_ratio} · 컷 {cuts.length}개
        {project.character_image_url && ' · 캐릭터 고정'}
      </p>

      <details className="mb-6 border border-border rounded-[var(--radius-card)] p-4">
        <summary className="text-sm font-bold cursor-pointer">전체 원고 보기</summary>
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
              className={`shrink-0 bg-white/5 rounded-[var(--radius-card-sm)] overflow-hidden ${
                project.aspect_ratio === '9:16' || project.aspect_ratio === '3:4' ? 'w-24 h-40' : 'w-40 h-24'
              } flex items-center justify-center`}
            >
              {cut.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cut.image_url} alt={`컷 ${cut.order_index + 1}`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-muted">
                  {busyId === cut.id && (busyKind === 'image' || busyKind === 'upload') ? '처리 중...' : '이미지 없음'}
                </span>
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
                  className="text-xs font-bold border border-border rounded-[var(--radius-pill)] px-3 py-1 hover:bg-white/10 disabled:opacity-40"
                >
                  {cut.image_url ? 'AI 다시 생성' : 'AI 생성'}
                </button>
                <button
                  type="button"
                  onClick={() => uploadFileRefs.current[cut.id]?.click()}
                  disabled={busy}
                  className="text-xs font-bold border border-border rounded-[var(--radius-pill)] px-3 py-1 hover:bg-white/10 disabled:opacity-40"
                >
                  업로드
                </button>
                <input
                  ref={(el) => {
                    uploadFileRefs.current[cut.id] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(cut.id, file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => generateVoice(cut.id)}
                  disabled={busy}
                  className="text-xs font-bold border border-border rounded-[var(--radius-pill)] px-3 py-1 hover:bg-white/10 disabled:opacity-40"
                >
                  {busyId === cut.id && busyKind === 'voice' ? '생성 중...' : cut.audio_url ? '음성 다시 생성' : '음성 생성'}
                </button>
                {cut.audio_url && <audio controls src={cut.audio_url} className="h-8" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCaptionStep && (
        <div className="mt-8 border-t border-border pt-6">
          <div className="flex items-center gap-3 mb-1">
            <StepBadge n={4} label="자막 스타일" />
          </div>
          <p className="text-xs text-muted mb-4">영상에 들어갈 자막 모양과 위치를 골라주세요.</p>

          <div className="border border-border rounded-[var(--radius-card)] p-6 space-y-6 mb-6">
            <div className="w-full h-32 bg-black rounded-[var(--radius-card-sm)] relative overflow-hidden">
              <div
                className="absolute left-0 right-0 flex justify-center px-4"
                style={{ top: `${captionStyle.position}%`, transform: 'translateY(-50%)' }}
              >
                <span
                  style={{
                    fontFamily: captionStyle.fontFamily,
                    fontSize: captionStyle.fontSize,
                    color: captionStyle.color,
                    WebkitTextStroke: captionStyle.outlineEnabled ? `${captionStyle.outlineWidth}px #000000` : undefined,
                    paintOrder: 'stroke fill',
                    padding: captionStyle.background === 'none' ? 0 : captionStyle.background === 'thin' ? '2px 8px' : '8px 16px',
                    backgroundColor: captionStyle.background === 'none' ? 'transparent' : 'rgba(0,0,0,0.75)',
                    borderRadius: captionStyle.background === 'none' ? 0 : 6,
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: captionStyle.lineCount,
                    overflow: 'hidden',
                    textAlign: 'center',
                  }}
                >
                  자막 미리보기 텍스트입니다
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-muted mb-2">줄수</div>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCaptionStyle((prev) => ({ ...prev, lineCount: n as 1 | 2 | 3 }))}
                    className={`text-xs font-bold rounded-[var(--radius-pill)] border w-9 h-9 ${
                      captionStyle.lineCount === n ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-xs">
              <span className="font-bold text-muted">크기 ({captionStyle.fontSize}px)</span>
              <input
                type="range"
                min={12}
                max={80}
                value={captionStyle.fontSize}
                onChange={(e) => setCaptionStyle((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
                className="w-full mt-1"
              />
            </label>

            <label className="block text-xs">
              <span className="font-bold text-muted">위치 ({captionStyle.position}%)</span>
              <input
                type="range"
                min={0}
                max={100}
                value={captionStyle.position}
                onChange={(e) => setCaptionStyle((prev) => ({ ...prev, position: Number(e.target.value) }))}
                className="w-full mt-1"
              />
            </label>

            <label className="block text-xs">
              <span className="font-bold text-muted block mb-1">폰트</span>
              <select
                value={captionStyle.fontFamily}
                onChange={(e) => setCaptionStyle((prev) => ({ ...prev, fontFamily: e.target.value }))}
                className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
              >
                {CAPTION_FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="text-xs font-bold text-muted mb-2">색상</div>
              <div className="flex items-center gap-2 flex-wrap">
                {CAPTION_COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCaptionStyle((prev) => ({ ...prev, color: c }))}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full border-2 ${captionStyle.color === c ? 'border-accent' : 'border-border'}`}
                  />
                ))}
                <input
                  type="color"
                  value={captionStyle.color}
                  onChange={(e) => setCaptionStyle((prev) => ({ ...prev, color: e.target.value }))}
                  className="w-7 h-7 rounded-full border border-border overflow-hidden p-0"
                  title="커스텀 색상"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-muted mb-2">
                <input
                  type="checkbox"
                  checked={captionStyle.outlineEnabled}
                  onChange={(e) => setCaptionStyle((prev) => ({ ...prev, outlineEnabled: e.target.checked }))}
                />
                윤곽선
              </label>
              {captionStyle.outlineEnabled && (
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={captionStyle.outlineWidth}
                  onChange={(e) => setCaptionStyle((prev) => ({ ...prev, outlineWidth: Number(e.target.value) }))}
                  className="w-full"
                />
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-muted mb-2">배경</div>
              <div className="flex gap-2">
                {CAPTION_BACKGROUND_MODES.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setCaptionStyle((prev) => ({ ...prev, background: b.value }))}
                    className={`text-xs font-bold rounded-[var(--radius-pill)] border px-3 py-1.5 ${
                      captionStyle.background === b.value ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={saveCaptionStyle}
              disabled={savingCaptionStyle}
              className="border border-border font-bold rounded-[var(--radius-card-sm)] px-5 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
            >
              {savingCaptionStyle ? '저장 중...' : '스타일만 저장'}
            </button>
          </div>
        </div>
      )}

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
        ) : null}

        {(project.status === 'draft' || (project.status === 'done' && project.video_url)) && (
          <button
            type="button"
            onClick={startRender}
            disabled={!allReady}
            className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-2.5 text-sm disabled:opacity-40 mt-3"
          >
            {project.status === 'done' ? '이 스타일로 다시 렌더링' : '영상 만들기'}
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
