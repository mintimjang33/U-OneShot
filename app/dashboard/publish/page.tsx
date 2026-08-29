'use client';

import { useEffect, useState } from 'react';

type SocialAccount = { id: string; platform: string; external_account_id: string; username: string | null; extra?: Record<string, unknown> };

type PlatformKey = 'threads' | 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x';

type PublishTarget = { platform: string; title: string | null; body: string | null; status: string; publish_error: string | null };
type PublishJob = { id: string; video_url: string | null; status: string; scheduled_at: string | null; created_at: string; uos_publish_targets: PublishTarget[] };

const PLATFORM_META: Record<PlatformKey, { label: string; limit: number; needsVideo: boolean; needsTitle: boolean }> = {
  threads: { label: 'Threads', limit: 500, needsVideo: false, needsTitle: false },
  youtube: { label: 'YouTube', limit: 5000, needsVideo: true, needsTitle: true },
  tiktok: { label: 'TikTok', limit: 2200, needsVideo: true, needsTitle: false },
  instagram: { label: 'Instagram', limit: 2200, needsVideo: true, needsTitle: false },
  facebook: { label: 'Facebook', limit: 63000, needsVideo: false, needsTitle: false },
  x: { label: 'X', limit: 280, needsVideo: false, needsTitle: false },
};

const TIKTOK_VISIBILITY = [
  { value: 'PUBLIC_TO_EVERYONE', label: '전체 공개' },
  { value: 'MUTUAL_FOLLOW_FRIENDS', label: '친구 (상호 팔로우)' },
  { value: 'FOLLOWER_OF_CREATOR', label: '팔로워' },
  { value: 'SELF_ONLY', label: '나만 보기' },
];

const ORIGIN = 'https://u-one-shot.vercel.app';

// X는 한글/이모지 등 non-ASCII 문자를 2자로 계산한다(원본 "0/280 (한글 약 0/140자)" 표시와 동일한 규칙).
function xWeightedLength(text: string) {
  let weighted = 0;
  for (const ch of text) weighted += /[\x00-\x7F]/.test(ch) ? 1 : 2;
  return weighted;
}

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

  // 원본(8-0절) 실측: 업로드 영상 옆에 "메타 텍스트 입력"(제목/설명) 공용 필드가 하나 있고, 여기 입력한 값이
  // 선택된 플랫폼 전체에 채워진다. 다만 플랫폼마다 글자수 제한이 다르므로, 채운 뒤에도 카드별로 다시
  // 고쳐 쓸 수 있게 플랫폼별 상태는 그대로 둔다.
  const [sharedTitle, setSharedTitle] = useState('');
  const [sharedBody, setSharedBody] = useState('');
  const [title, setTitle] = useState<Record<PlatformKey, string>>({ threads: '', youtube: '', tiktok: '', instagram: '', facebook: '', x: '' });
  const [body, setBody] = useState<Record<PlatformKey, string>>({ threads: '', youtube: '', tiktok: '', instagram: '', facebook: '', x: '' });
  const [visibility, setVisibility] = useState<Record<PlatformKey, string>>({
    threads: '',
    youtube: 'private',
    tiktok: 'SELF_ONLY',
    instagram: '',
    facebook: 'public',
    x: '',
  });
  const [casualTone, setCasualTone] = useState(false);
  const [shareToInstagram, setShareToInstagram] = useState(false);
  const [aiDisclosure, setAiDisclosure] = useState(true);
  const [youtubeTags, setYoutubeTags] = useState('');
  const [tiktokToggles, setTiktokToggles] = useState({ allowComment: true, allowDuet: true, allowStitch: true, ownBrand: false, brandedContent: false });

  const [saveOnly, setSaveOnly] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<Record<string, { status: string; postId?: string; error?: string }> | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [tier, setTier] = useState<string>('free');

  const [scheduledJobs, setScheduledJobs] = useState<PublishJob[]>([]);
  const [recentJobs, setRecentJobs] = useState<PublishJob[]>([]);

  function applySharedText() {
    const selected = (Object.keys(enabled) as PlatformKey[]).filter((k) => enabled[k]);
    setTitle((prev) => {
      const next = { ...prev };
      for (const p of selected) if (PLATFORM_META[p].needsTitle) next[p] = sharedTitle;
      return next;
    });
    setBody((prev) => {
      const next = { ...prev };
      for (const p of selected) next[p] = sharedBody;
      return next;
    });
  }

  function loadJobs() {
    fetch('/api/publish')
      .then((r) => r.json())
      .then((d) => {
        setScheduledJobs(d.scheduled || []);
        setRecentJobs(d.recent || []);
      });
  }

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

    loadJobs();

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

  function buildTargets() {
    return (Object.keys(enabled) as PlatformKey[])
      .filter((k) => enabled[k])
      .map((platform) => {
        const options: Record<string, unknown> = {};
        if (platform === 'threads') Object.assign(options, { casualTone, shareToInstagram });
        if (platform === 'youtube') {
          Object.assign(options, {
            aiDisclosure,
            tags: youtubeTags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          });
        }
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
  }

  async function handlePublish(mode: 'now' | 'save' | 'schedule') {
    setPublishing(true);
    setResult(null);
    setQuotaError(null);

    const payload: Record<string, unknown> = { targets: buildTargets(), videoUrl: videoUrl || undefined };
    if (mode === 'save') payload.saveOnly = true;
    if (mode === 'schedule') {
      if (!scheduledAt) {
        setPublishing(false);
        setQuotaError('예약 시각을 선택해주세요.');
        return;
      }
      payload.scheduledAt = new Date(scheduledAt).toISOString();
    }

    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status === 402) {
      setQuotaError(data.error);
    } else if (mode === 'now') {
      setResult(data.results || {});
    }
    if (mode !== 'now') loadJobs();
    setPublishing(false);
  }

  async function clearHistory() {
    await fetch('/api/publish', { method: 'DELETE' });
    loadJobs();
  }

  const selectedCount = Object.values(enabled).filter(Boolean).length;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-black">원샷배포</h1>
        <a href="/pricing" className="text-xs font-bold bg-accent-soft text-accent rounded-[var(--radius-pill)] px-3 py-1">
          현재 요금제: {tier.toUpperCase()}
        </a>
      </div>
      <p className="text-sm text-muted mb-6">한 번의 업로드로 모든 숏폼 플랫폼을 겨냥하세요.</p>

      {quotaError && (
        <div className="mb-6 border border-accent bg-accent-soft text-accent text-sm rounded-[var(--radius-card)] px-4 py-3 flex items-center justify-between">
          <span>{quotaError}</span>
          <a href="/purchase" className="font-bold underline shrink-0 ml-3">
            업그레이드
          </a>
        </div>
      )}

      <div className="mb-6">
        <div className="text-xs font-bold text-muted mb-2">SNS 연결</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {(Object.keys(PLATFORM_META) as PlatformKey[]).map((platform) => {
            const meta = PLATFORM_META[platform];
            const accounts = accountsByPlatform[platform] || [];
            const connected = accounts.length > 0;
            return (
              <div key={platform} className={`border rounded-[var(--radius-card)] p-3 text-center ${enabled[platform] ? 'border-accent' : 'border-border'}`}>
                <label className="flex items-center justify-center gap-1.5 text-xs font-bold mb-2">
                  <input type="checkbox" checked={enabled[platform]} onChange={(e) => setEnabled((prev) => ({ ...prev, [platform]: e.target.checked }))} />
                  {meta.label}
                </label>
                {!connected ? (
                  <button
                    type="button"
                    onClick={CONNECT_FN[platform]}
                    className="w-full border border-border rounded-[var(--radius-card-sm)] py-1.5 text-[11px] font-bold hover:bg-white/10"
                  >
                    연결하기
                  </button>
                ) : (
                  <select
                    value={selectedAccount[platform]}
                    onChange={(e) => setSelectedAccount((prev) => ({ ...prev, [platform]: e.target.value }))}
                    className="w-full border border-border rounded-[var(--radius-card-sm)] px-1 py-1 text-[11px]"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        @{a.username || a.external_account_id}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <div>
          <label className="text-xs font-bold text-muted block mb-1">업로드 영상 (선택 — YouTube/TikTok/Instagram은 필수)</label>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="컷비서로 만든 영상 URL, 또는 직접 업로드한 mp4 URL"
            className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-muted block mb-1">메타 텍스트 입력 (선택한 플랫폼에 한 번에 채워짐)</label>
          <input
            value={sharedTitle}
            onChange={(e) => setSharedTitle(e.target.value)}
            onBlur={applySharedText}
            placeholder="제목"
            className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm mb-2"
          />
          <textarea
            value={sharedBody}
            onChange={(e) => setSharedBody(e.target.value)}
            onBlur={applySharedText}
            placeholder="설명"
            rows={3}
            className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm resize-none"
          />
        </div>
      </div>

      <details className="mb-6">
        <summary className="text-xs font-bold text-muted cursor-pointer">플랫폼별로 따로 고치기 ({selectedCount}개 선택됨)</summary>
        <div className="grid md:grid-cols-2 gap-5 mt-4">
          {(Object.keys(PLATFORM_META) as PlatformKey[])
            .filter((p) => enabled[p])
            .map((platform) => {
              const meta = PLATFORM_META[platform];
              const charLen = platform === 'x' ? xWeightedLength(body[platform]) : body[platform].length;
              return (
                <div key={platform} className="border border-border rounded-[var(--radius-card)] p-5">
                  <div className="font-bold text-sm mb-3">
                    {meta.label} {meta.needsVideo && <span className="text-[10px] font-bold text-white bg-neutral-400 rounded-[var(--radius-pill)] px-2 py-0.5 ml-1">영상 필요</span>}
                  </div>

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
                    {platform === 'x' ? `${charLen}/280 (한글 약 ${Math.ceil(charLen / 2)}/140자)` : `${charLen}/${meta.limit}`}
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

                  {platform === 'youtube' && (
                    <>
                      <input
                        value={youtubeTags}
                        onChange={(e) => setYoutubeTags(e.target.value)}
                        placeholder="태그 (쉼표로 구분)"
                        className="w-full border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-xs mt-2"
                      />
                      <label className="flex items-center gap-1.5 mt-2 text-xs">
                        <input type="checkbox" checked={aiDisclosure} onChange={(e) => setAiDisclosure(e.target.checked)} /> AI 생성·수정 콘텐츠 알림
                      </label>
                    </>
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

                  {platform === 'tiktok' && (
                    <>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="text-muted">공개 범위</span>
                        <select
                          value={visibility.tiktok}
                          onChange={(e) => setVisibility((prev) => ({ ...prev, tiktok: e.target.value }))}
                          className="border border-border rounded-[var(--radius-card-sm)] px-2 py-1"
                        >
                          {TIKTOK_VISIBILITY.map((v) => (
                            <option key={v.value} value={v.value}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </div>
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
                      </div>
                      <div className="text-xs text-muted mt-2 mb-1">상업적 콘텐츠 공개</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={tiktokToggles.ownBrand} onChange={(e) => setTiktokToggles((p) => ({ ...p, ownBrand: e.target.checked }))} /> 브랜드 자체 홍보
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={tiktokToggles.brandedContent} onChange={(e) => setTiktokToggles((p) => ({ ...p, brandedContent: e.target.checked }))} /> 유료 협찬 (브랜디드 콘텐츠)
                        </label>
                      </div>
                    </>
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
      </details>

      <div className="border border-border rounded-[var(--radius-card)] p-4 mb-8 flex flex-wrap items-center gap-4">
        <span className="text-sm font-bold">선택된 업로드 대상: {selectedCount}개</span>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={saveOnly} onChange={(e) => setSaveOnly(e.target.checked)} /> 내 저장소에 저장
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="border border-border rounded-[var(--radius-card-sm)] px-2 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={() => handlePublish('schedule')}
          disabled={publishing || selectedCount === 0}
          className="border border-border font-bold rounded-[var(--radius-card-sm)] px-5 py-2 text-sm disabled:opacity-40"
        >
          예약
        </button>
        <button
          type="button"
          onClick={() => handlePublish(saveOnly ? 'save' : 'now')}
          disabled={publishing || selectedCount === 0}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-8 py-2.5 text-sm disabled:opacity-40 ml-auto"
        >
          {publishing ? '처리 중...' : saveOnly ? '저장하기' : '살포하기'}
        </button>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">예약된 발행</h2>
          <button type="button" onClick={loadJobs} className="text-xs font-bold text-muted hover:text-accent">
            새로고침
          </button>
        </div>
        {scheduledJobs.length === 0 ? (
          <p className="text-xs text-muted">예약된 발행이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {scheduledJobs.map((job) => (
              <div key={job.id} className="border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-xs flex justify-between">
                <span>{job.uos_publish_targets.map((t) => t.platform).join(', ')}</span>
                <span className="text-muted">{job.scheduled_at && new Date(job.scheduled_at).toLocaleString('ko-KR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">최근 실행 결과 (최대 20건)</h2>
          <button type="button" onClick={clearHistory} className="text-xs font-bold text-muted hover:text-accent">
            이력 비우기
          </button>
        </div>
        {recentJobs.length === 0 ? (
          <p className="text-xs text-muted">아직 실행 이력이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <div key={job.id} className="border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-xs flex justify-between">
                <span>{job.uos_publish_targets.map((t) => t.platform).join(', ')}</span>
                <span className={job.status === 'failed' ? 'text-red-500 font-bold' : 'text-muted'}>{job.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
