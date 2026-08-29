'use client';

import { useEffect, useRef, useState } from 'react';

type Script = {
  id: string;
  title: string;
  content: string;
  audio_url: string | null;
  created_at: string;
};

export default function ReadingBoxPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function load(q?: string) {
    const url = q ? `/api/reading-box?q=${encodeURIComponent(q)}` : '/api/reading-box';
    const res = await fetch(url);
    const data = await res.json();
    setScripts(data.scripts || []);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function save() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch('/api/reading-box', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setScripts((prev) => [data.script, ...prev]);
    setTitle('');
    setContent('');
    setShowForm(false);
  }

  async function play(script: Script) {
    setError(null);
    if (script.audio_url) {
      audioRef.current?.pause();
      const audio = new Audio(script.audio_url);
      audioRef.current = audio;
      audio.play();
      setPlayingId(script.id);
      return;
    }
    setPlayingId(script.id);
    const res = await fetch(`/api/reading-box/${script.id}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setPlayingId(null);
      return;
    }
    setScripts((prev) => prev.map((s) => (s.id === script.id ? { ...s, audio_url: data.audioUrl } : s)));
    const audio = new Audio(data.audioUrl);
    audioRef.current = audio;
    audio.play();
  }

  async function remove(id: string) {
    await fetch(`/api/reading-box/${id}`, { method: 'DELETE' });
    setScripts((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black mb-1">리딩박스</h1>
      <p className="text-sm text-muted mb-6">원고를 저장해두고 필요할 때 클릭 한 번으로 들어보세요.</p>

      <div className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="원고 검색..."
          className="flex-1 border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] w-10 h-10 flex items-center justify-center text-lg"
        >
          +
        </button>
      </div>

      {showForm && (
        <div className="border border-border rounded-[var(--radius-card)] p-4 mb-4 space-y-2">
          <p className="text-sm font-bold">원고 추가</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용"
            rows={5}
            className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="button"
            onClick={save}
            disabled={saving || !title.trim() || !content.trim()}
            className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-4 py-2 text-sm disabled:opacity-40"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      )}

      {!showForm && error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      <div className="space-y-2">
        {scripts.length === 0 && <p className="text-sm text-muted">저장된 원고가 없습니다.</p>}
        {scripts.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between border border-border rounded-[var(--radius-card-sm)] px-4 py-3"
          >
            <button type="button" onClick={() => play(s)} className="flex-1 text-left">
              <p className="font-bold text-sm">{s.title}</p>
              <p className="text-xs text-muted truncate">{s.content}</p>
            </button>
            <div className="flex items-center gap-3 pl-3">
              {playingId === s.id ? <span className="text-xs text-accent font-bold">재생중</span> : null}
              <button type="button" onClick={() => remove(s.id)} className="text-muted hover:text-red-500 text-sm" aria-label="삭제">
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
