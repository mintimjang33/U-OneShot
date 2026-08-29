'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type AdminUser = {
  id: string;
  email: string | null;
  createdAt: string;
  isOwner: boolean;
  tier: 'free' | 'lite' | 'standard' | 'pro';
  expiresAt: string | null;
};

const TIERS = ['free', 'lite', 'standard', 'pro'] as const;
const TIER_LABEL: Record<string, string> = { free: 'Free', lite: 'Lite', standard: 'Standard', pro: 'Pro' };

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [durationDays, setDurationDays] = useState<Record<string, string>>({});

  function load() {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setUsers(d.users);
      });
  }

  useEffect(load, []);

  async function setTier(userId: string, tier: string) {
    setSavingId(userId);
    const days = Number(durationDays[userId]) || undefined;
    const res = await fetch(`/api/admin/users/${userId}/tier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, durationDays: days }),
    });
    const data = await res.json();
    setSavingId(null);
    if (!res.ok) {
      alert(data.error);
      return;
    }
    load();
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-black">관리자 — 회원 요금제 관리</h1>
          <Link href="/dashboard" className="text-xs text-muted hover:text-foreground">
            ← 대시보드로
          </Link>
        </div>
        <p className="text-sm text-muted mb-8">
          U-OneShot 자체 운영 기능이에요(원본 buronai.com의 실제 관리자 화면은 확인할 수 없어서, 우리 필요에 맞게 새로 만들었습니다).
        </p>

        {!users ? (
          <p className="text-sm text-muted">불러오는 중...</p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="border border-border rounded-[var(--radius-card)] p-4 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">
                    {u.email || u.id}
                    {u.isOwner && <span className="ml-2 text-[10px] font-black text-accent bg-accent-soft rounded-[var(--radius-pill)] px-2 py-0.5">운영자</span>}
                  </div>
                  <div className="text-xs text-muted">
                    가입 {new Date(u.createdAt).toLocaleDateString('ko-KR')} · 현재 {TIER_LABEL[u.tier]}
                    {u.expiresAt && ` · ${new Date(u.expiresAt).toLocaleDateString('ko-KR')}까지`}
                  </div>
                </div>

                {!u.isOwner && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="number"
                      min={1}
                      placeholder="일수(선택)"
                      value={durationDays[u.id] || ''}
                      onChange={(e) => setDurationDays((prev) => ({ ...prev, [u.id]: e.target.value }))}
                      className="w-24 border border-border rounded-[var(--radius-card-sm)] px-2 py-1.5 text-xs"
                    />
                    {TIERS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTier(u.id, t)}
                        disabled={savingId === u.id}
                        className={`text-xs font-bold rounded-[var(--radius-pill)] px-3 py-1.5 border disabled:opacity-40 ${
                          u.tier === t ? 'bg-accent text-white border-accent' : 'border-border hover:bg-white/10'
                        }`}
                      >
                        {TIER_LABEL[t]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
