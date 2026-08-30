import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { getStorageUsageBytes } from '../../../lib/storageUsage';
import { getUserTier } from '../../../lib/subscription';
import { TIER_LIMITS } from '../../../lib/tierLimits';

// "내 저장소" — 2026-08-30 재실측으로 발견한 원본 사이드바 12번째 메뉴("내 프로젝트"). 도구별 개수와
// 최근 결과물을 한 화면에서 가로질러 보여준다. 각 도구는 스키마가 전부 달라서(제목 필드 이름, [id]
// 상세페이지 유무 등) 도구별로 하나씩 매핑해서 합친다.
//
// mediaType/origin: 원본은 도구별로 "원본 결과물 vs 최종 편집본"을 구분하는 토글(이미지/영상 타입
// 필터와는 별개)이 있는데, 정확한 판정 기준을 원본 UI에서 직접 확인하지 못했다(재로그인 실측 계정에
// 비교할 실데이터가 없었음) — 여기선 "완성된 영상 결과물이 있으면 편집본, 없으면(초안 단계) 원본"으로
// 근사했다. text만 다루는 도구(롱폼비서/숏폼비서/가사비서/업로드클리닉/떡상레이더)는 이미지/영상
// 타입 필터에 걸리지 않게 mediaType을 'text'로 둔다.
const TOOLS: {
  key: string;
  label: string;
  table: string;
  titleOf: (row: Record<string, unknown>) => string;
  linkOf: (row: Record<string, unknown>) => string;
  mediaOf: (row: Record<string, unknown>) => { mediaType: 'image' | 'video' | 'text'; origin: 'original' | 'edited' };
}[] = [
  {
    key: 'cutdaeri', label: '컷비서', table: 'uos_cutdaeri_projects',
    titleOf: (r) => (r.topic as string) || '(제목 없음)', linkOf: (r) => `/dashboard/cut-daeri/${r.id}`,
    mediaOf: (r) => (r.video_url ? { mediaType: 'video', origin: 'edited' } : { mediaType: 'image', origin: 'original' }),
  },
  {
    key: 'butena', label: '떡상레이더', table: 'uos_butena_cases',
    titleOf: (r) => (r.title as string) || '(제목 없음)', linkOf: () => `/dashboard/butena`,
    mediaOf: () => ({ mediaType: 'text', origin: 'original' }),
  },
  {
    key: 'longdaeri', label: '롱폼비서', table: 'uos_longdaeri_projects',
    titleOf: (r) => (r.title as string) || (r.topic as string) || '(제목 없음)', linkOf: (r) => `/dashboard/long-daeri/${r.id}`,
    mediaOf: () => ({ mediaType: 'text', origin: 'original' }),
  },
  {
    key: 'shortdaeri', label: '숏폼비서', table: 'uos_shortdaeri_projects',
    titleOf: (r) => ((r.source_text as string) || '').slice(0, 40) || '(제목 없음)', linkOf: () => `/dashboard/short-daeri`,
    mediaOf: () => ({ mediaType: 'text', origin: 'original' }),
  },
  {
    key: 'lyrics', label: '가사비서', table: 'uos_lyrics_projects',
    titleOf: (r) => (r.title as string) || '(제목 없음)', linkOf: () => `/dashboard/lyrics`,
    mediaOf: () => ({ mediaType: 'text', origin: 'original' }),
  },
  {
    key: 'sabangpalbang', label: '요모조모', table: 'uos_sabangpalbang_projects',
    titleOf: (r) => (r.prompt_text as string) || (r.extra_prompt as string) || '이미지 변환', linkOf: (r) => `/dashboard/sabangpalbang/${r.id}`,
    mediaOf: (r) => (r.output_video_url ? { mediaType: 'video', origin: 'edited' } : { mediaType: 'image', origin: 'original' }),
  },
  {
    key: 'uploadrx', label: '업로드 클리닉', table: 'uos_uploadrx_items',
    titleOf: (r) => (r.topic as string) || '(제목 없음)', linkOf: () => `/dashboard/upload-rx`,
    mediaOf: () => ({ mediaType: 'text', origin: 'original' }),
  },
  {
    key: 'thumbnailremix', label: '썸네일 리믹스', table: 'uos_thumbnailremix_projects',
    titleOf: (r) => (r.copy_text as string) || (r.mode as string) || '(제목 없음)', linkOf: (r) => `/dashboard/thumbnail-arena/${r.id}`,
    mediaOf: () => ({ mediaType: 'image', origin: 'original' }),
  },
  {
    key: 'publish', label: '원샷배포', table: 'uos_publish_jobs',
    titleOf: (r) => (r.title as string) || '(제목 없음)', linkOf: () => `/dashboard/publish`,
    mediaOf: () => ({ mediaType: 'video', origin: 'original' }),
  },
];

const FETCH_LIMIT = 60; // "더 보기"로 클라이언트에서 점진 노출할 수 있게 도구당 넉넉히 가져온다.

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const [results, usedBytes, { tier }] = await Promise.all([
    Promise.all(
      TOOLS.map(async (tool) => {
        const [{ count }, { data: rows }] = await Promise.all([
          supabase.from(tool.table).select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from(tool.table).select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(FETCH_LIMIT),
        ]);
        const items = (rows || []).map((r) => {
          const { mediaType, origin } = tool.mediaOf(r);
          return {
            tool: tool.key,
            toolLabel: tool.label,
            id: r.id as string,
            title: tool.titleOf(r),
            link: tool.linkOf(r),
            createdAt: r.created_at as string,
            mediaType,
            origin,
          };
        });
        return { key: tool.key, label: tool.label, count: count || 0, items };
      })
    ),
    getStorageUsageBytes(user.id),
    getUserTier(user.id),
  ]);

  const counts = Object.fromEntries(results.map((r) => [r.key, { label: r.label, count: r.count }]));
  const recent = results
    .flatMap((r) => r.items)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    counts,
    recent,
    storage: { usedBytes, limitBytes: Math.round(TIER_LIMITS[tier].storageGB * 1024 ** 3), tier },
  });
}

// "내 저장소"의 "편집"(대량 선택) 버튼 → 선택한 항목 일괄 삭제.
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const items = body?.items as { tool: string; id: string }[] | undefined;
  if (!items?.length) return NextResponse.json({ error: '삭제할 항목이 없습니다.' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const byTool = new Map<string, string[]>();
  for (const item of items) {
    if (!byTool.has(item.tool)) byTool.set(item.tool, []);
    byTool.get(item.tool)!.push(item.id);
  }

  for (const [toolKey, ids] of byTool) {
    const tool = TOOLS.find((t) => t.key === toolKey);
    if (!tool) continue;
    const { error } = await supabase.from(tool.table).delete().eq('user_id', user.id).in('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
