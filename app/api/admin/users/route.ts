import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase';
import { getCurrentUser } from '../../../../lib/supabaseServerAuth';
import { isAdminUser } from '../../../../lib/subscription';

// 우리만의 관리자 화면(원본엔 없던, U-OneShot 자체 운영용 기능) — 회원 목록 + 요금제 조회.
// 원본 buronai.com의 실제 관리자 백엔드는 로그인해서도 볼 수 없는 영역이라 실측 대상이 아니었음.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user.id)) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data: authList, error: authError } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  const { data: subs, error: subsError } = await supabase.from('uos_subscriptions').select('*');
  if (subsError) return NextResponse.json({ error: subsError.message }, { status: 500 });

  const subsByUserId = new Map((subs || []).map((s) => [s.user_id, s]));

  const users = authList.users.map((u) => {
    const sub = subsByUserId.get(u.id);
    const expired = sub?.expires_at && new Date(sub.expires_at) <= new Date();
    return {
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      isOwner: isAdminUser(u.id),
      tier: isAdminUser(u.id) ? 'pro' : expired ? 'free' : sub?.tier || 'free',
      expiresAt: sub?.expires_at || null,
    };
  });

  return NextResponse.json({ users });
}
