import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { getUserTier } from '../../../lib/subscription';
import type { Tier } from '../../../lib/tierLimits';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { tier, expiresAt } = await getUserTier(user.id);
  return NextResponse.json({ tier, expiresAt });
}

// 실제 결제(TossPayments 등)는 아직 연동 전이라, "구독하기"를 누르면 결제 없이
// 해당 등급을 30일 부여한다(유쓰레드 app/api/subscription과 동일 원칙, 실 결제 아님을 UI에 명시).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const tier: Tier = ['lite', 'standard', 'pro'].includes(body?.tier) ? body.tier : 'lite';

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('uos_subscriptions')
    .upsert({ user_id: user.id, tier, expires_at: expiresAt, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tier, expiresAt });
}
