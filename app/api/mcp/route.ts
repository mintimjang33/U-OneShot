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
import { generateCutDaeriScript, generateLongDaeriScript, generateShortDaeriScripts, generateUploadRx } from '../../../lib/generateScript';
import { generateCutImage, generateAngleImage, SABANGPALBANG_ANGLES } from '../../../lib/generateImage';
import { generateCutVoice } from '../../../lib/generateVoice';
import { getRemoteConfig } from '../../../lib/remoteConfig';

// userId를 생략한 도구 호출은 운영자 본인 계정(MCP_OWNER_USER_ID)을 기본으로 쓴다.
function resolveUserId(userId?: string): string {
  const uid = userId || process.env.MCP_OWNER_USER_ID;
  if (!uid) throw new Error('userId가 없고 MCP_OWNER_USER_ID 환경변수도 설정되어 있지 않습니다.');
  return uid;
}

const TRUTHROOM_SYSTEM_PROMPT = `너는 산전수전 다 겪은 창업 멘토다. 사용자가 사업 아이디어, 마케팅, 콘텐츠 전략에 대해
고민을 털어놓으면, 응원이나 막연한 위로 대신 냉정하고 현실적인 피드백을 준다.

규칙:
- 핑계나 자기합리화를 그냥 넘기지 않는다. 근거 없는 낙관에는 반드시 반박한다.
- 예의는 지키되 돌려 말하지 않는다. 문제를 문제라고 분명히 말한다.
- 매 답변 끝에 지금 당장 시도해볼 수 있는 구체적인 다음 행동을 하나 제시한다.
- 3~6문장 정도로 간결하게 답한다. 장황한 설교를 하지 않는다.`;

const GITHUB_REPO = 'mintimjang33/U-OneShot';

const ALLOWED_TABLES = [
  'uos_threads_accounts',
  'uos_social_accounts',
  'uos_publish_jobs',
  'uos_publish_targets',
  'uos_subscriptions',
  'uos_cutdaeri_projects',
  'uos_cutdaeri_cuts',
  'uos_longdaeri_projects',
  'uos_shortdaeri_items',
  'uos_uploadrx_items',
  'uos_butena_cases',
  'uos_sabangpalbang_projects',
  'uos_sabangpalbang_angles',
  'uos_thumbarena_projects',
  'uos_truthroom_messages',
];

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

    // ── 원샷배포(Multi Publisher) 도메인 기능 ───────────────────────────
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

    // ── 컷대리 ───────────────────────────────────────────────────────
    server.registerTool(
      'generate_cutdaeri',
      {
        title: '컷대리 프로젝트 생성',
        description: '주제→대본→컷 분할까지 한 번에 실행해 uos_cutdaeri_projects/uos_cutdaeri_cuts에 저장한다.',
        inputSchema: {
          topic: z.string(),
          style: z.enum(['portrait', 'natural', 'editorial']).optional(),
          aspectRatio: z.enum(['9:16', '16:9']).optional(),
          userId: z.string().optional(),
        },
      },
      async ({ topic, style = 'natural', aspectRatio = '9:16', userId }) => {
        try {
          const uid = resolveUserId(userId);
          const supabase = getSupabaseServerClient();
          const { script, cuts } = await generateCutDaeriScript(topic, style);
          const { data: project, error: pErr } = await supabase
            .from('uos_cutdaeri_projects')
            .insert({ user_id: uid, topic, script, style, aspect_ratio: aspectRatio, status: 'draft' })
            .select()
            .single();
          if (pErr || !project) throw new Error(pErr?.message || '프로젝트 생성 실패');
          const rows = cuts.map((text, i) => ({ project_id: project.id, order_index: i, text }));
          const { error: cErr } = await supabase.from('uos_cutdaeri_cuts').insert(rows);
          if (cErr) throw new Error(cErr.message);
          return textResult(JSON.stringify(project, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'generate_cutdaeri_cut_image',
      {
        title: '컷대리 컷 이미지 생성',
        description: '지정한 컷(uos_cutdaeri_cuts.id)의 이미지를 생성한다.',
        inputSchema: { cutId: z.string() },
      },
      async ({ cutId }) => {
        try {
          const supabase = getSupabaseServerClient();
          const { data: cut } = await supabase.from('uos_cutdaeri_cuts').select('*, uos_cutdaeri_projects!inner(style)').eq('id', cutId).maybeSingle();
          if (!cut) throw new Error('컷을 찾을 수 없습니다.');
          const { imageUrl } = await generateCutImage(cut.text, cut.uos_cutdaeri_projects.style);
          await supabase.from('uos_cutdaeri_cuts').update({ image_url: imageUrl, status: 'done' }).eq('id', cutId);
          return textResult(imageUrl);
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'generate_cutdaeri_cut_voice',
      {
        title: '컷대리 컷 음성 생성',
        description: '지정한 컷(uos_cutdaeri_cuts.id)의 나레이션 음성을 생성한다.',
        inputSchema: { cutId: z.string() },
      },
      async ({ cutId }) => {
        try {
          const supabase = getSupabaseServerClient();
          const { data: cut } = await supabase.from('uos_cutdaeri_cuts').select('*').eq('id', cutId).maybeSingle();
          if (!cut) throw new Error('컷을 찾을 수 없습니다.');
          const { audioUrl } = await generateCutVoice(cutId, cut.copy_text || cut.text);
          await supabase.from('uos_cutdaeri_cuts').update({ audio_url: audioUrl }).eq('id', cutId);
          return textResult(audioUrl);
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'render_cutdaeri',
      {
        title: '컷대리 최종 영상 렌더링 시작',
        description: '프로젝트 상태를 rendering으로 바꾼다. 실제 합성은 U-Short 로컬 워커가 폴링해서 처리한다(워커가 켜져 있어야 함).',
        inputSchema: { projectId: z.string() },
        annotations: { destructiveHint: false, idempotentHint: true },
      },
      async ({ projectId }) => {
        try {
          const supabase = getSupabaseServerClient();
          const { error } = await supabase.from('uos_cutdaeri_projects').update({ status: 'rendering' }).eq('id', projectId);
          if (error) throw new Error(error.message);
          return textResult('✅ 렌더링 큐에 등록됨. U-Short 워커가 켜져 있어야 실제로 처리된다.');
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── 롱대리 · 숏대리 ──────────────────────────────────────────────
    server.registerTool(
      'generate_longdaeri',
      {
        title: '롱대리 원고 생성',
        description: '주제→1500~2500자 롱폼 원고를 생성해 uos_longdaeri_projects에 저장한다.',
        inputSchema: {
          topic: z.string(),
          tone: z.enum(['info', 'story', 'persuade']).optional(),
          userId: z.string().optional(),
        },
      },
      async ({ topic, tone = 'info', userId }) => {
        try {
          const uid = resolveUserId(userId);
          const { title, content } = await generateLongDaeriScript(topic, tone);
          const supabase = getSupabaseServerClient();
          const { data: project, error } = await supabase
            .from('uos_longdaeri_projects')
            .insert({ user_id: uid, topic, tone, title, content, status: 'done' })
            .select()
            .single();
          if (error || !project) throw new Error(error?.message || '생성 실패');
          return textResult(JSON.stringify(project, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'split_shortdaeri',
      {
        title: '숏대리 — 롱대리 원고를 숏폼으로 분할',
        description: '기존 uos_longdaeri_projects 원고를 1분 분량 숏폼 대본 4~8편으로 분할해 uos_shortdaeri_items에 저장한다(재분할 시 기존 결과 대체).',
        inputSchema: { projectId: z.string() },
      },
      async ({ projectId }) => {
        try {
          const supabase = getSupabaseServerClient();
          const { data: project } = await supabase.from('uos_longdaeri_projects').select('*').eq('id', projectId).maybeSingle();
          if (!project?.content) throw new Error('원고를 찾을 수 없거나 내용이 없습니다.');
          const shorts = await generateShortDaeriScripts(project.content);
          await supabase.from('uos_shortdaeri_items').delete().eq('project_id', projectId);
          const rows = shorts.map((s, i) => ({ project_id: projectId, order_index: i, title: s.title, content: s.content }));
          const { data: inserted, error } = await supabase.from('uos_shortdaeri_items').insert(rows).select();
          if (error) throw new Error(error.message);
          return textResult(JSON.stringify(inserted, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── 업로드 처방전 ────────────────────────────────────────────────
    server.registerTool(
      'generate_uploadrx',
      {
        title: '업로드 처방전 생성',
        description: '키워드→클릭 유도 제목 5안+설명+해시태그를 생성해 uos_uploadrx_items에 저장한다.',
        inputSchema: { keyword: z.string(), userId: z.string().optional() },
      },
      async ({ keyword, userId }) => {
        try {
          const uid = resolveUserId(userId);
          const { titles, description, hashtags } = await generateUploadRx(keyword);
          const supabase = getSupabaseServerClient();
          const { data: item, error } = await supabase
            .from('uos_uploadrx_items')
            .insert({ user_id: uid, keyword, titles, description, hashtags })
            .select()
            .single();
          if (error || !item) throw new Error(error?.message || '생성 실패');
          return textResult(JSON.stringify(item, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── 사방팔방 ────────────────────────────────────────────────────
    server.registerTool(
      'create_sabangpalbang',
      {
        title: '사방팔방 프로젝트 생성',
        description: '이미 호스팅된 원본 이미지 URL로 프로젝트+8개 앵글(대기 상태) 행을 만든다. 각 앵글 생성은 generate_sabangpalbang_angle을 따로 호출한다.',
        inputSchema: { sourceImageUrl: z.string().describe('공개 접근 가능한 원본 이미지 URL'), userId: z.string().optional() },
      },
      async ({ sourceImageUrl, userId }) => {
        try {
          const uid = resolveUserId(userId);
          const supabase = getSupabaseServerClient();
          const { data: project, error: pErr } = await supabase
            .from('uos_sabangpalbang_projects')
            .insert({ user_id: uid, source_image_url: sourceImageUrl, status: 'draft' })
            .select()
            .single();
          if (pErr || !project) throw new Error(pErr?.message || '프로젝트 생성 실패');
          const rows = SABANGPALBANG_ANGLES.map((a, i) => ({ project_id: project.id, order_index: i, angle_label: a.label }));
          const { data: angles, error: aErr } = await supabase.from('uos_sabangpalbang_angles').insert(rows).select();
          if (aErr) throw new Error(aErr.message);
          return textResult(JSON.stringify({ project, angles }, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'generate_sabangpalbang_angle',
      {
        title: '사방팔방 앵글 이미지 생성',
        description: '지정한 앵글(uos_sabangpalbang_angles.id) 하나를 실제로 생성한다.',
        inputSchema: { angleId: z.string() },
      },
      async ({ angleId }) => {
        try {
          const supabase = getSupabaseServerClient();
          const { data: angle } = await supabase
            .from('uos_sabangpalbang_angles')
            .select('*, uos_sabangpalbang_projects!inner(source_image_url)')
            .eq('id', angleId)
            .maybeSingle();
          if (!angle) throw new Error('앵글을 찾을 수 없습니다.');
          const anglePrompt = SABANGPALBANG_ANGLES[angle.order_index]?.prompt || angle.angle_label;
          const { imageUrl } = await generateAngleImage(angle.uos_sabangpalbang_projects.source_image_url, anglePrompt);
          await supabase.from('uos_sabangpalbang_angles').update({ image_url: imageUrl, status: 'done' }).eq('id', angleId);
          return textResult(imageUrl);
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── 썸네일 이상형 월드컵 ─────────────────────────────────────────
    server.registerTool(
      'create_thumbarena',
      {
        title: '썸네일 이상형 월드컵 프로젝트 생성',
        description: '이미 호스팅된 썸네일 후보 이미지 URL 목록(2의 거듭제곱 개수)으로 토너먼트 프로젝트를 만든다.',
        inputSchema: { imageUrls: z.array(z.string()).min(2), userId: z.string().optional() },
      },
      async ({ imageUrls, userId }) => {
        try {
          if ((imageUrls.length & (imageUrls.length - 1)) !== 0) {
            throw new Error('이미지 개수는 2의 거듭제곱(2, 4, 8, 16...)이어야 합니다.');
          }
          const uid = resolveUserId(userId);
          const supabase = getSupabaseServerClient();
          const { data: project, error } = await supabase
            .from('uos_thumbarena_projects')
            .insert({ user_id: uid, image_urls: imageUrls, status: 'voting' })
            .select()
            .single();
          if (error || !project) throw new Error(error?.message || '생성 실패');
          return textResult(JSON.stringify(project, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'pick_thumbarena_winner',
      {
        title: '썸네일 이상형 월드컵 우승 확정',
        description: '토너먼트 프로젝트에 최종 우승 썸네일 URL을 저장하고 상태를 done으로 바꾼다.',
        inputSchema: { projectId: z.string(), winnerUrl: z.string() },
      },
      async ({ projectId, winnerUrl }) => {
        try {
          const supabase = getSupabaseServerClient();
          const { data: project, error } = await supabase
            .from('uos_thumbarena_projects')
            .update({ winner_url: winnerUrl, status: 'done' })
            .eq('id', projectId)
            .select()
            .single();
          if (error || !project) throw new Error(error?.message || '프로젝트를 찾을 수 없습니다.');
          return textResult(JSON.stringify(project, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── 진실의방 ─────────────────────────────────────────────────────
    server.registerTool(
      'send_truthroom_message',
      {
        title: '진실의방에 메시지 보내기',
        description: '창업 멘토 페르소나로 답장을 생성하고, 사용자/AI 메시지를 uos_truthroom_messages에 저장한다.',
        inputSchema: { content: z.string(), userId: z.string().optional() },
      },
      async ({ content, userId }) => {
        try {
          const uid = resolveUserId(userId);
          const supabase = getSupabaseServerClient();
          const { data: history } = await supabase
            .from('uos_truthroom_messages')
            .select('role, content')
            .eq('user_id', uid)
            .order('created_at', { ascending: true })
            .limit(20);

          const apiKey = await getRemoteConfig('ANTHROPIC_API_KEY');
          if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되어 있지 않습니다.');

          const messages = [...(history || []), { role: 'user', content }];
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 1024, system: TRUTHROOM_SYSTEM_PROMPT, messages }),
          });
          if (!res.ok) throw new Error(`응답 생성 실패 (${res.status}): ${(await res.text()).slice(0, 300)}`);
          const json = await res.json();
          const reply = (json.content || []).map((c: { text?: string }) => c.text || '').join('');
          if (!reply) throw new Error('응답이 비어 있습니다.');

          const { error } = await supabase.from('uos_truthroom_messages').insert([
            { user_id: uid, role: 'user', content },
            { user_id: uid, role: 'assistant', content: reply },
          ]);
          if (error) throw new Error(error.message);

          return textResult(reply);
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
      'run_sql은 SELECT만 허용), 원샷배포 Threads 실제 발행(publish_thread_post — 발행 전 사람 승인 필수), ' +
      '10개 도구 기능 전부를 웹 UI 없이 직접 실행하는 도메인 도구(컷대리: generate_cutdaeri/' +
      'generate_cutdaeri_cut_image/generate_cutdaeri_cut_voice/render_cutdaeri, 롱대리·숏대리: ' +
      'generate_longdaeri/split_shortdaeri, 업로드 처방전: generate_uploadrx, 사방팔방: ' +
      'create_sabangpalbang/generate_sabangpalbang_angle, 썸네일 이상형 월드컵: create_thumbarena/' +
      'pick_thumbarena_winner, 진실의방: send_truthroom_message — userId 생략 시 전부 MCP_OWNER_USER_ID를 ' +
      '기본으로 씀), GitHub 저장소 조회(list_github_files/get_github_file)를 제공한다. 부테나는 관리자 큐레이션 ' +
      '갤러리라 전용 생성 도구가 없다 — search_shorts(유파인더 MCP)로 후보를 찾고 upsert_row로 ' +
      'uos_butena_cases에 직접 넣을 것. render_cutdaeri는 상태만 바꾸고 실제 합성은 U-Short 로컬 워커가 ' +
      '처리하므로 워커가 켜져 있어야 한다. YouTube/TikTok/Instagram/Facebook/X는 아직 OAuth 앱 승인 전이라 ' +
      '발행 도구가 없다 — uos_publish_targets에 not_configured 상태로만 기록된다.',
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
