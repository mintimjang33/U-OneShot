// U-OneShot MCP 서버.
// 유쓰레드/HongHub 패턴(mcp-handler + zod, ?key= 공유비밀 인증, GitHub 조회 + Supabase 범용 CRUD)을
// 그대로 이식한 스켈레톤. 도메인 전용 도구(컷대리 파이프라인 등)는 각 Phase 진행하면서 추가한다.
//
// 필요한 환경변수 (Vercel > Settings > Environment Variables):
//   MCP_SHARED_SECRET   - 이 MCP 서버 보호용 공유 비밀키
//   MCP_OWNER_USER_ID   - userId를 생략했을 때 기본으로 사용할 Supabase auth user id(운영자 본인)
//   GITHUB_TOKEN (선택) - GitHub API 한도 완화용
//
// 커넥터 등록 URL: https://u-one-shot.vercel.app/api/mcp?key=<MCP_SHARED_SECRET>

import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { publishThreadPostNow } from '../../../lib/publishThreadPost';

const GITHUB_REPO = 'mintimjang33/U-OneShot';

const ALLOWED_TABLES = ['uos_threads_accounts', 'uos_social_accounts', 'uos_publish_jobs', 'uos_publish_targets', 'uos_subscriptions'];

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}
function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text' as const, text: `❌ ${message}` }], isError: true as const };
}

const baseHandler = createMcpHandler(
  (server) => {
    // ── Supabase 범용 CRUD ──────────────────────────────────────────
    server.registerTool(
      'list_tables',
      {
        title: '테이블 목록 조회',
        description: 'U-OneShot이 사용하는 Supabase 테이블 목록을 반환한다(uos_ 접두사, 유쓰레드/유쇼츠와 공유 프로젝트).',
        inputSchema: {},
      },
      async () => textResult(ALLOWED_TABLES.join('\n'))
    );

    server.registerTool(
      'get_rows',
      {
        title: '테이블 행 조회',
        description: '지정한 테이블에서 행을 조회한다. eq 필터와 limit을 지원한다. list_tables로 먼저 테이블명을 확인할 것.',
        inputSchema: {
          table: z.enum(ALLOWED_TABLES as [string, ...string[]]),
          eqColumn: z.string().optional().describe('일치 조건을 걸 컬럼명 (선택)'),
          eqValue: z.string().optional().describe('eqColumn과 짝을 이루는 값 (선택)'),
          limit: z.number().int().min(1).max(200).optional().describe('기본 50'),
        },
      },
      async ({ table, eqColumn, eqValue, limit = 50 }) => {
        try {
          const supabase = getSupabaseServerClient();
          let query = supabase.from(table).select('*').limit(limit);
          if (eqColumn && eqValue !== undefined) query = query.eq(eqColumn, eqValue);
          const { data, error } = await query;
          if (error) throw new Error(error.message);
          return textResult(JSON.stringify(data, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'upsert_row',
      {
        title: '테이블 행 생성/갱신',
        description: '지정한 테이블에 행을 upsert한다. data는 컬럼명:값 JSON 객체 문자열로 전달한다.',
        inputSchema: {
          table: z.enum(ALLOWED_TABLES as [string, ...string[]]),
          data: z.string().describe('JSON 객체 문자열. 예: {"platform":"threads","status":"pending"}'),
          onConflict: z.string().optional().describe('충돌 판정 컬럼(예: "user_id,platform")'),
        },
        annotations: { destructiveHint: false, idempotentHint: true },
      },
      async ({ table, data, onConflict }) => {
        try {
          const parsed = JSON.parse(data);
          const supabase = getSupabaseServerClient();
          const query = supabase.from(table).upsert(parsed, onConflict ? { onConflict } : undefined).select();
          const { data: result, error } = await query;
          if (error) throw new Error(error.message);
          return textResult(JSON.stringify(result, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'delete_row',
      {
        title: '테이블 행 삭제',
        description: '지정한 테이블에서 id 컬럼 값이 일치하는 행을 삭제한다.',
        inputSchema: {
          table: z.enum(ALLOWED_TABLES as [string, ...string[]]),
          id: z.string().describe('삭제할 행의 id 값'),
        },
        annotations: { destructiveHint: true, idempotentHint: true },
      },
      async ({ table, id }) => {
        try {
          const supabase = getSupabaseServerClient();
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) throw new Error(error.message);
          return textResult(`✅ ${table}에서 id=${id} 삭제 완료`);
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'run_sql',
      {
        title: '읽기전용 SQL 실행',
        description: 'SELECT 문만 실행 가능한 안전 SQL 실행 도구. 복잡한 조인/집계가 필요할 때 get_rows 대신 사용한다.',
        inputSchema: { query: z.string().describe('SELECT로 시작하는 SQL 쿼리') },
      },
      async ({ query }) => {
        try {
          const supabase = getSupabaseServerClient();
          const { data, error } = await supabase.rpc('uos_mcp_run_sql', { query });
          if (error) throw new Error(error.message);
          return textResult(JSON.stringify(data, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── 한방살포(Multi Publisher) 도메인 기능 ───────────────────────────
    server.registerTool(
      'publish_thread_post',
      {
        title: 'Threads에 직접 발행',
        description: '지정한 Threads 계정으로 텍스트를 실제 발행한다. 반드시 사람 승인 후 호출할 것.',
        inputSchema: {
          threadsAccountId: z.string().describe('uos_threads_accounts의 id'),
          content: z.string(),
          shareToInstagram: z.boolean().optional(),
        },
        annotations: { destructiveHint: false, idempotentHint: false },
      },
      async ({ threadsAccountId, content, shareToInstagram }) => {
        try {
          const supabase = getSupabaseServerClient();
          const { data: account } = await supabase.from('uos_threads_accounts').select('*').eq('id', threadsAccountId).maybeSingle();
          if (!account) throw new Error('연동된 Threads 계정을 찾을 수 없습니다.');
          const result = await publishThreadPostNow({ content, shareToInstagram }, account);
          return textResult(`✅ 발행 완료: threads_post_id=${result.threadsPostId}`);
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── GitHub 저장소 확인 ────────────────────────────────────────────
    server.registerTool(
      'list_github_files',
      {
        title: 'GitHub 저장소 파일 목록 조회',
        description: `${GITHUB_REPO} 저장소의 특정 경로에 어떤 파일·폴더가 있는지 조회한다. path를 비우면 루트를 본다.`,
        inputSchema: { path: z.string().optional(), ref: z.string().optional() },
      },
      async ({ path = '', ref = 'main' }) => {
        try {
          const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(ref)}`;
          const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'u-oneshot-mcp' };
          if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
          const res = await fetch(url, { headers });
          if (!res.ok) throw new Error(`GitHub API 오류 (${res.status}): ${await res.text()}`);
          const data = await res.json();
          const list = Array.isArray(data) ? data : [data];
          const lines = list.map((f: { type: string; path: string; size: number }) => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}${f.type === 'file' ? ` (${f.size} bytes)` : ''}`);
          return textResult(lines.join('\n'));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'get_github_file',
      {
        title: 'GitHub 저장소 파일 내용 조회',
        description: `${GITHUB_REPO} 저장소의 특정 파일 내용을 텍스트로 가져온다.`,
        inputSchema: { path: z.string(), ref: z.string().optional() },
      },
      async ({ path, ref = 'main' }) => {
        try {
          const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(ref)}`;
          const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'u-oneshot-mcp' };
          if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
          const res = await fetch(url, { headers });
          if (!res.ok) throw new Error(`GitHub API 오류 (${res.status}): ${await res.text()}`);
          const data = await res.json();
          if (data.type !== 'file') throw new Error(`"${path}"는 파일이 아니라 ${data.type}입니다`);
          const content = Buffer.from(data.content, data.encoding || 'base64').toString('utf-8');
          return textResult(`[${path}] (${data.size} bytes)\n\n${content}`);
        } catch (err) {
          return errorResult(err);
        }
      }
    );
  },
  {
    instructions:
      'U-OneShot(buronai.com 클론) MCP 서버 — Supabase 범용 CRUD(list_tables/get_rows/upsert_row/delete_row/run_sql — ' +
      'run_sql은 SELECT만 허용), 한방살포 Threads 실제 발행(publish_thread_post — 발행 전 사람 승인 필수), ' +
      'GitHub 저장소 조회(list_github_files/get_github_file)를 제공한다. YouTube/TikTok/Instagram/Facebook/X는 ' +
      '아직 OAuth 앱 승인 전이라 발행 도구가 없다 — uos_publish_targets에 not_configured 상태로만 기록된다.',
    verboseLogs: true,
  }
);

async function authedHandler(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!process.env.MCP_SHARED_SECRET || key !== process.env.MCP_SHARED_SECRET) {
    return new Response(JSON.stringify({ error: '인증 필요 (key 파라미터 확인)' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return baseHandler(request);
}

export { authedHandler as GET, authedHandler as POST };
