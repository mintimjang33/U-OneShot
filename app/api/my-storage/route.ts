import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';

// "내 저장소" — 2026-08-30 재실측으로 발견한 원본 사이드바 12번째 메뉴("내 프로젝트"). 도구별 개수와
// 최근 결과물을 한 화면에서 가로질러 보여준다. 각 도구는 스키마가 전부 달라서(제목 필드 이름, [id]
// 상세페이지 유무 등) 도구별로 하나씩 매핑해서 합친다.
const TOOLS: {
  key: string;
  label: string;
  table: string;
  titleOf: (row: Record<string, unknown>) => string;
  linkOf: (row: Record<string, unknown>) => string;
}[] = [
  { key: 'cutdaeri', label: '컷비서', table: 'uos_cutdaeri_projects', titleOf: (r) => (r.topic as string) || '(제목 없음)', linkOf: (r) => `/dashboard/cut-daeri/${r.id}` },
  { key: 'butena', label: '떡상레이더', table: 'uos_butena_cases', titleOf: (r) => (r.title as string) || '(제목 없음)', linkOf: () => `/dashboard/butena` },
  { key: 'longdaeri', label: '롱폼비서', table: 'uos_longdaeri_projects', titleOf: (r) => (r.title as string) || (r.topic as string) || '(제목 없음)', linkOf: (r) => `/dashboard/long-daeri/${r.id}` },
  { key: 'shortdaeri', label: '숏폼비서', table: 'uos_shortdaeri_projects', titleOf: (r) => ((r.source_text as string) || '').slice(0, 40) || '(제목 없음)', linkOf: () => `/dashboard/short-daeri` },
  { key: 'lyrics', label: '가사비서', table: 'uos_lyrics_projects', titleOf: (r) => (r.title as string) || '(제목 없음)', linkOf: () => `/dashboard/lyrics` },
  { key: 'sabangpalbang', label: '요모조모', table: 'uos_sabangpalbang_projects', titleOf: (r) => (r.prompt_text as string) || (r.extra_prompt as string) || '이미지 변환', linkOf: (r) => `/dashboard/sabangpalbang/${r.id}` },
  { key: 'uploadrx', label: '업로드 클리닉', table: 'uos_uploadrx_items', titleOf: (r) => (r.topic as string) || '(제목 없음)', linkOf: () => `/dashboard/upload-rx` },
  { key: 'thumbnailremix', label: '썸네일 리믹스', table: 'uos_thumbnailremix_projects', titleOf: (r) => (r.copy_text as string) || (r.mode as string) || '(제목 없음)', linkOf: (r) => `/dashboard/thumbnail-arena/${r.id}` },
  { key: 'publish', label: '원샷배포', table: 'uos_publish_jobs', titleOf: (r) => (r.title as string) || '(제목 없음)', linkOf: () => `/dashboard/publish` },
];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const results = await Promise.all(
    TOOLS.map(async (tool) => {
      const [{ count }, { data: rows }] = await Promise.all([
        supabase.from(tool.table).select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from(tool.table).select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      ]);
      const items = (rows || []).map((r) => ({
        tool: tool.key,
        toolLabel: tool.label,
        id: r.id as string,
        title: tool.titleOf(r),
        link: tool.linkOf(r),
        createdAt: r.created_at as string,
      }));
      return { key: tool.key, label: tool.label, count: count || 0, items };
    })
  );

  const counts = Object.fromEntries(results.map((r) => [r.key, { label: r.label, count: r.count }]));
  const recent = results
    .flatMap((r) => r.items)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);

  return NextResponse.json({ counts, recent });
}
