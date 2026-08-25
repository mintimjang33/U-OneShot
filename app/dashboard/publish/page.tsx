'use client';

import { useEffect, useState } from 'react';

type ThreadsAccount = { id: string; threads_user_id: string; username: string | null };

type PlatformKey = 'threads' | 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x';

const PLATFORM_META: Record<PlatformKey, { label: string; limit: number; ready: boolean }> = {
  threads: { label: 'Threads', limit: 500, ready: true },
  youtube: { label: 'YouTube', limit: 5000, ready: false },
  tiktok: { label: 'TikTok', limit: 2200, ready: false },
  instagram: { label: 'Instagram', limit: 2200, ready: false },
  facebook: { label: 'Facebook', limit: 63000, ready: false },
  x: { label: 'X', limit: 280, ready: false },
};

export default function PublishPage() {
  const [threadsAccounts, setThreadsAccounts] = useState<ThreadsAccount[]>([]);
  const [enabled, setEnabled] = useState<Record<PlatformKey, boolean>>({
    threads: true,
    youtube: false,
    tiktok: false,
    instagram: false,
    facebook: false,
    x: false,
  });
  const [body, setBody] = useState<Record<PlatformKey, string>>({
    threads: '',
    youtube: '',
    tiktok: '',
    instagram: '',
    facebook: '',
    x: '',
  });
  const [threadsAccountId, setThreadsAccountId] = useState('');
  const [casualTone, setCasualTone] = useState(false);
  const [shareToInstagram, setShareToInstagram] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<Record<string, { status: string; postId?: string; error?: string }> | null>(null);

  useEffect(() => {
    fetch('/api/threads-accounts')
      .then((r) => r.json())
      .then((d) => {
        setThreadsAccounts(d.accounts || []);
        if (d.accounts?.[0]) setThreadsAccountId(d.accounts[0].id);
      });

    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'threads') {
      // 새로 연동 직후 — URL 정리만 하고 계정 목록은 위 fetch가 이미 가져옴
      window.history.replaceState({}, '', '/dashboard/publish');
    }
  }, []);

  function connectThreads() {
    const appId = process.env.NEXT_PUBLIC_THREADS_APP_ID;
    const redirectUri = 'https://u-one-shot.vercel.app/api/auth/threads/callback';
    const scope = 'threads_basic,threads_content_publish';
    const url = `https://threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
    window.location.href = url;
  }

  async function handlePublish() {
    setPublishing(true);
    setResult(null);
    const targets = (Object.keys(enabled) as PlatformKey[])
      .filter((k) => enabled[k])
      .map((platform) => ({
        platform,
        accountId: platform === 'threads' ? threadsAccountId : undefined,
        body: body[platform],
        options: platform === 'threads' ? { casualTone, shareToInstagram } : {},
      }));

    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets }),
    });
    const data = await res.json();
    setResult(data.results || {});
    setPublishing(false);
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black mb-1">한방살포</h1>
      <p className="text-sm text-muted mb-8">딸깍 한 번으로 6개 SNS 동시 업로드 — Threads부터 실제 발행됩니다.</p>

      <div className="grid md:grid-cols-2 gap-5">
        {(Object.keys(PLATFORM_META) as PlatformKey[]).map((platform) => {
          const meta = PLATFORM_META[platform];
          return (
            <div
              key={platform}
              className={`border rounded-[var(--radius-card)] p-5 ${enabled[platform] ? 'border-accent' : 'border-border opacity-60'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 font-bold text-sm">
                  <input
                    type="checkbox"
                    checked={enabled[platform]}
                    disabled={!meta.ready}
                    onChange={(e) => setEnabled((prev) => ({ ...prev, [platform]: e.target.checked }))}
                  />
                  {meta.label}
                </label>
                {!meta.ready && (
                  <span className="text-[10px] font-bold text-white bg-neutral-400 rounded-[var(--radius-pill)] px-2 py-0.5">
                    OAuth 앱 등록 필요 · 준비중
                  </span>
                )}
                {meta.ready && platform === 'threads' && (
                  <span className="text-[10px] font-bold text-white bg-accent rounded-[var(--radius-pill)] px-2 py-0.5">실발행</span>
                )}
              </div>

              {platform === 'threads' && meta.ready && threadsAccounts.length === 0 && (
                <button
                  type="button"
                  onClick={connectThreads}
                  className="w-full border border-border rounded-[var(--radius-card-sm)] py-2 text-xs font-bold mb-3 hover:bg-neutral-50"
                >
                  Threads 계정 연동하기
                </button>
              )}
              {platform === 'threads' && threadsAccounts.length > 0 && (
                <select
                  value={threadsAccountId}
                  onChange={(e) => setThreadsAccountId(e.target.value)}
                  className="w-full border border-border rounded-[var(--radius-card-sm)] px-2 py-1.5 text-xs mb-3"
                >
                  {threadsAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      @{a.username || a.threads_user_id}
                    </option>
                  ))}
                </select>
              )}

              <textarea
                value={body[platform]}
                onChange={(e) => setBody((prev) => ({ ...prev, [platform]: e.target.value }))}
                disabled={!meta.ready}
                placeholder={`${meta.label} 본문`}
                rows={4}
                className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm resize-none disabled:bg-neutral-50"
              />
              <div className="text-right text-[10px] text-muted mt-1">
                {body[platform].length}/{meta.limit}
              </div>

              {platform === 'threads' && meta.ready && (
                <div className="flex gap-4 mt-2 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={casualTone} onChange={(e) => setCasualTone(e.target.checked)} /> 반말
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={shareToInstagram} onChange={(e) => setShareToInstagram(e.target.checked)} />{' '}
                    인스타그램 스토리 공유
                  </label>
                </div>
              )}

              {result?.[platform] && (
                <div
                  className={`mt-3 text-xs font-bold ${
                    result[platform].status === 'posted' ? 'text-green-600' : result[platform].status === 'failed' ? 'text-red-500' : 'text-muted'
                  }`}
                >
                  {result[platform].status === 'posted' && `발행 완료 (post id: ${result[platform].postId})`}
                  {result[platform].status === 'failed' && `발행 실패: ${result[platform].error}`}
                  {result[platform].status === 'not_configured' && 'OAuth 앱 등록 후 발행 가능'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handlePublish}
        disabled={publishing || !Object.values(enabled).some(Boolean)}
        className="mt-8 bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-8 py-3 disabled:opacity-40"
      >
        {publishing ? '발행 중...' : '지금 발행하기'}
      </button>
    </div>
  );
}
