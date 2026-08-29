import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../../lib/supabaseServerAuth';
import { isAdminUser } from '../../../../../../lib/subscription';

const TIERS = ['free', 'lite', 'standard', 'pro'];

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getCurrentUser();
  if (!admin || !isAdminUser(admin.id)) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  const { userId } = await params;

  const body = await request.json().catch(() => null);
  const tier: string = body?.tier;
  const durationDays: number | undefined = body?.durationDays;
  if (!TIERS.includes(tier)) return NextResponse.json({ error: '올바른 요금제를 선택해주세요.' }, { status: 400 });

  const expiresAt = durationDays ? new Date(Date.now() + durationDays * 86400000).toISOString() : null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('uos_subscriptions')
    .upsert({ user_id: userId, tier, expires_at: expiresAt }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message || '설정 실패' }, { status: 500 });

  return NextResponse.json({ subscription: data });
}
