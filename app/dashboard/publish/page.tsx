'use client';

import { useEffect, useState } from 'react';

type SocialAccount = { id: string; platform: string; external_account_id: string; username: string | null; extra?: Record<string, unknown> };

type PlatformKey = 'threads' | 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x';

const PLATFORM_META: Record<PlatformKey, { label: string; limit: number; needsVideo: boolean; needsTitle: boolean }> = {
  threads: { label: 'Threads', limit: 500, needsVideo: false, needsTitle: false },
  youtube: { label: 'YouTube', limit: 5000, needsVideo: true, needsTitle: true },
  tiktok: { label: 'TikTok', limit: 2200, needsVideo: true, needsTitle: false },
  instagram: { label: 'Instagram', limit: 2200, needsVideo: true, needsTitle: false },
  facebook: { label: 'Facebook', limit: 63000, needsVideo: false, needsTitle: false },
  x: { label: 'X', limit: 280, needsVideo: false, needsTitle: false },
};

const ORIGIN = 'https://u-one-shot.vercel.app';

export default function PublishPage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [accountsByPlatform, setAccountsByPlatform] = useState<Record<string, SocialAccount[]>>({});
  const [selectedAccount, setSelectedAccount] = useState<Record<PlatformKey, string>>({
    threads: '',
    youtube: '',
    tiktok: '',
    instagram: '',
    facebook: '',
    x: '',
  });
  const [enabled, setEnabled] = useState<Record<PlatformKey, boolean>>({
    threads: true,
    youtube: false,
    tiktok: false,
    instagram: false,
    facebook: false,
    x: false,
  });
  const [title, setTitle] = useState<Record<PlatformKey, string>>({ threads: '', youtube: '', tiktok: '', instagram: '', facebook: '', x: '' });
  const [body, setBody] = useState<Record<PlatformKey, string>>({ threads: '', youtube: '', tiktok: '', instagram: '', facebook: '', x: '' });
  const [visibility, setVisibility] = useState<Record<PlatformKey, string>>({
    threads: '',
    youtube: 'private',
    tiktok: '',
    instagram: '',
    facebook: 'public',
    x: '',
  });
  const [casualTone, setCasualTone] = useState(false);
  const [shareToInstagram, setShareToInstagram] = useState(false);
  const [aiDisclosure, setAiDisclosure] = useState(true);
  const [tiktokToggles, setTiktokToggles] = useState({ allowComment: true, allowDuet: true, allowStitch: true, brandedContent: false });

  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<Record<string, { status: string; postId?: string; error?: string }> | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [tier, setTier] = useState<string>('free');

  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => r.json())
      .then((d) => d.tier && setTier(d.tier));

    fetch('/api/threads-accounts')
      .then((r) => r.json())
      .then((d) => {
        setAccountsByPlatform((prev) => ({ ...prev, threads: d.accounts || [] }));
        if (d.accounts?.[0]) setSelectedAccount((prev) => ({ ...prev, threads: d.accounts[0].id }));
      });

    fetch('/api/social-accounts')
      .then((r) => r.json())
      .then((d) => {
        const grouped: Record<string, SocialAccount[]> = {};
        for (const acc of d.accounts || []) {
          grouped[acc.platform] = grouped[acc.platform] || [];
          grouped[acc.platform].push(acc);
        }
        setAccountsByPlatform((prev) => ({ ...prev, ...grouped }));
        setSelectedAccount((prev) => {
          const next = { ...prev };
          for (const [platform, accs] of Object.entries(grouped)) {
            if (accs[0] && !next[platform as PlatformKey]) next[platform as PlatformKey] = accs[0].id;
          }
          return next;
        });
      });

    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') || params.get('error')) {
      window.history.replaceState({}, '', '/dashboard/publish');
    }
  }, []);

  function connectThreads() {
    const appId = process.env.NEXT_PUBLIC_THREADS_APP_ID;
    const redirectUri = `${ORIGIN}/api/auth/threads/callback`;
    const url = `https://threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=threads_basic,threads_content_publish&response_type=code`;
    window.location.href = url;
  }

  function connectFacebook() {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const redirectUri = `${ORIGIN}/api/auth/facebook/callback`;
    const scope = 'pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish';
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
  }

  function connectX() {
    window.location.href = '/api/auth/x/start';
  }

  function connectYoutube() {
    const clientId = process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID;
    const redirectUri = `${ORIGIN}/api/auth/youtube/callback`;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly')}&access_type=offline&prompt=consent`;
    window.location.href = url;
  }

  function connectTiktok() {
    const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
    const redirectUri = `${ORIGIN}/api/auth/tiktok/callback`;
    const url = `https://www.tiktok.com/v2/auth/authorize?client_key=${clientKey}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user.info.basic,video.publish&response_type=code`;
    window.location.href = url;
  }

  const CONNECT_FN: Record<PlatformKey, () => void> = {
    threads: connectThreads,
    facebook: connectFacebook,
    x: connectX,
    youtube: connectYoutube,
    tiktok: connectTiktok,
    instagram: connectFacebook, // 인스타그램은 별도 버튼 없이 Facebook 연동에 묻어간다(원본과 동일한 방식)
  };

  async function handlePublish() {
    setPublishing(true);
    setResult(null);
    setQuotaError(null);
    const targets = (Object.keys(enabled) as PlatformKey[])
      .filter((k) => enabled[k])
      .map((platform) => {
        const options: Record<string, unknown> = {};
        if (platform === 'threads') Object.assign(options, { casualTone, shareToInstagram });
        if (platform === 'youtube') Object.assign(options, { aiDisclosure });
        if (platform === 'tiktok') Object.assign(options, tiktokToggles);
        return {
          platform,
          accountId: selectedAccount[platform],
          title: title[platform],
          body: body[platform],
          visibility: visibility[platform],
          options,
        };
      });

    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets, videoUrl: videoUrl || undefined }),
    });
    const data = await res.json();
    if (res.status === 402) {
      setQuotaError(data.error);
    } else {
      setResult(data.results || {});
    }
    setPublishing(false);
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-black">원샷배포</h1>
        <a href="/pricing" className="text-xs font-bold bg-accent-soft text-accent rounded-[var(--radius-pill)] px-3 py-1">
          현재 요금제: {tier.toUpperCase()}
        </a>
      </div>
      <p className="text-sm text-muted mb-6">딸깍 한 번으로 6개 SNS 동시 업로드.</p>

      <div className="mb-6">
        <label className="text-xs font-bold text-muted block mb-1">영상 URL (선택 — YouTube/TikTok/Instagram은 필수)</label>
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="컷비서로 만든 영상 URL, 또는 직접 업로드한 mp4 URL"
          className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
        />
      </div>

      {quotaError && (
        <div className="mb-6 border border-accent bg-accent-soft text-accent text-sm rounded-[var(--radius-card)] px-4 py-3 flex items-center justify-between">
          <span>{quotaError}</span>
          <a href="/purchase" className="font-bold underline shrink-0 ml-3">
            업그레이드
          </a>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {(Object.keys(PLATFORM_META) as PlatformKey[]).map((platform) => {
          const meta = PLATFORM_META[platform];
          const accounts = accountsByPlatform[platform] || [];
          const connected = accounts.length > 0;
          return (
            <div key={platform} className={`border rounded-[var(--radius-card)] p-5 ${enabled[platform] ? 'border-accent' : 'border-border opacity-70'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 font-bold text-sm">
                  <input type="checkbox" checked={enabled[platform]} onChange={(e) => setEnabled((prev) => ({ ...prev, [platform]: e.target.checked }))} />
                  {meta.label}
                </label>
                {meta.needsVideo && (
                  <span className="text-[10px] font-bold text-white bg-neutral-400 rounded-[var(--radius-pill)] px-2 py-0.5">영상 필요</span>
                )}
              </div>

              {!connected ? (
                <button
                  type="button"
                  onClick={CONNECT_FN[platform]}
                  className="w-full border border-border rounded-[var(--radius-card-sm)] py-2 text-xs font-bold mb-3 hover:bg-neutral-50"
                >
                  {platform === 'instagram' ? 'Facebook으로 연동' : `${meta.label} 계정 연동하기`}
                </button>
              ) : (
                <select
                  value={selectedAccount[platform]}
                  onChange={(e) => setSelectedAccount((prev) => ({ ...prev, [platform]: e.target.value }))}
                  className="w-full border border-border rounded-[var(--radius-card-sm)] px-2 py-1.5 text-xs mb-3"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      @{a.username || a.external_account_id}
                    </option>
                  ))}
                </select>
              )}

              {meta.needsTitle && (
                <input
                  value={title[platform]}
                  onChange={(e) => setTitle((prev) => ({ ...prev, [platform]: e.target.value }))}
                  placeholder="제목 (0/100)"
                  maxLength={100}
                  className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-2"
                />
              )}

              <textarea
                value={body[platform]}
                onChange={(e) => setBody((prev) => ({ ...prev, [platform]: e.target.value }))}
                placeholder={`${meta.label} 본문`}
                rows={4}
                className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm resize-none"
              />
              <div className="text-right text-[10px] text-muted mt-1">
                {body[platform].length}/{meta.limit}
              </div>

              {platform === 'threads' && (
                <div className="flex gap-4 mt-2 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={casualTone} onChange={(e) => setCasualTone(e.target.checked)} /> 반말
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={shareToInstagram} onChange={(e) => setShareToInstagram(e.target.checked)} /> 인스타그램 스토리 공유
                  </label>
                </div>
              )}

              {(platform === 'youtube' || platform === 'facebook') && (
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="text-muted">공개 범위</span>
                  <select
                    value={visibility[platform]}
                    onChange={(e) => setVisibility((prev) => ({ ...prev, [platform]: e.target.value }))}
                    className="border border-border rounded-[var(--radius-card-sm)] px-2 py-1"
                  >
                    <option value="public">공개</option>
                    <option value="private">비공개</option>
                  </select>
                </div>
              )}

              {platform === 'youtube' && (
                <label className="flex items-center gap-1.5 mt-2 text-xs">
                  <input type="checkbox" checked={aiDisclosure} onChange={(e) => setAiDisclosure(e.target.checked)} /> AI 생성·수정 콘텐츠 알림
                </label>
              )}

              {platform === 'tiktok' && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={tiktokToggles.allowComment} onChange={(e) => setTiktokToggles((p) => ({ ...p, allowComment: e.target.checked }))} /> 댓글
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={tiktokToggles.allowDuet} onChange={(e) => setTiktokToggles((p) => ({ ...p, allowDuet: e.target.checked }))} /> 듀엣
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={tiktokToggles.allowStitch} onChange={(e) => setTiktokToggles((p) => ({ ...p, allowStitch: e.target.checked }))} /> 스티치
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={tiktokToggles.brandedContent} onChange={(e) => setTiktokToggles((p) => ({ ...p, brandedContent: e.target.checked }))} /> 브랜디드 콘텐츠
                  </label>
                </div>
              )}

              {result?.[platform] && (
                <div className={`mt-3 text-xs font-bold ${result[platform].status === 'posted' ? 'text-green-600' : 'text-red-500'}`}>
                  {result[platform].status === 'posted' ? `발행 완료 (id: ${result[platform].postId})` : `발행 실패: ${result[platform].error}`}
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
