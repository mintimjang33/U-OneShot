'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const PLANS = {
  lite: { label: 'Lite', price: '$6.99', tagline: '한방살포 알뜰하게 사용하기' },
  standard: { label: 'Standard', price: '$19.99', tagline: '꾸준함이 실력입니다' },
  pro: { label: 'Pro', price: '$49.99', tagline: '취미가 아니라 수익입니다' },
} as const;

type PlanKey = keyof typeof PLANS;

function PurchaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = (searchParams.get('tier') as PlanKey) || 'standard';
  const [tier, setTier] = useState<PlanKey>(PLANS[initial] ? initial : 'standard');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    if (!agree) {
      alert('약관에 동의해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) throw new Error('구독 처리에 실패했어요.');
      alert(`${PLANS[tier].label} 플랜이 활성화됐어요! (실제 결제 없이 테스트용으로 30일 부여됨)`);
      router.push('/dashboard');
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const selected = PLANS[tier];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full mb-3">
        <Link href="/dashboard" className="text-xs text-muted hover:text-foreground">
          ← 대시보드로 돌아가기
        </Link>
      </div>
      <div className="bg-white border border-border rounded-[var(--radius-card)] p-8 max-w-sm w-full">
        <h1 className="font-black text-lg mb-1">요금제 구독</h1>
        <p className="text-xs text-muted mb-6">U-OneShot 정기 구독권 신청</p>

        <div className="flex gap-2 mb-4">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTier(key)}
              className={`flex-1 border rounded-[var(--radius-card-sm)] text-xs font-black py-2.5 ${
                tier === key ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted'
              }`}
            >
              {PLANS[key].label}
            </button>
          ))}
        </div>

        <div className="border border-border rounded-[var(--radius-card)] p-5 mb-6">
          <div className="text-sm font-black mb-1">U-OneShot {selected.label}</div>
          <div className="text-xs text-muted mb-3">{selected.tagline}</div>
          <div className="text-2xl font-black">
            {selected.price} <span className="text-xs font-normal text-muted">/월</span>
          </div>
        </div>

        <p className="text-[11px] text-muted mb-4 leading-relaxed">
          첫 결제 완료 후 매월 동일한 일자에 자동으로 정기 결제가 진행됩니다. 언제든지 대시보드에서 구독 해지가
          가능합니다.
        </p>

        <label className="flex items-center gap-2 text-xs mb-6">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          정기구독 서비스 이용약관 및 청약철회(환불) 제한 조건에 동의 (필수)
        </label>

        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-accent text-white text-[11px] font-black rounded-[var(--radius-card-sm)] py-4"
        >
          {loading ? '처리 중...' : `💳 ${selected.label} 구독하기 (${selected.price}/월)`}
        </button>
        <div className="text-[10px] text-neutral-300 text-center mt-3">
          실제 카드 결제는 아직 연동 전이에요 — 구독 상태만 테스트로 켜집니다.
        </div>
      </div>
    </div>
  );
}

export default function PurchasePage() {
  return (
    <Suspense fallback={null}>
      <PurchaseForm />
    </Suspense>
  );
}
