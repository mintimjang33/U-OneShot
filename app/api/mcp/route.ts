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
import {
  splitCutDaeriScript,
  suggestCutDaeriTopic,
  generateLongDaeriScript,
  LONGDAERI_CATEGORIES,
  generateShortDaeriScripts,
  generateUploadRx,
  UPLOADRX_STYLES,
  generateThumbnailCopy,
  generateLyrics,
  LYRICS_THEMES,
  LYRICS_GENRES,
  LYRICS_VOCAL_TYPES,
} from '../../../lib/generateScript';
import { generateCutImage, generateAngleImage, SABANGPALBANG_ANGLES, generateThumbnailVariant } from '../../../lib/generateImage';
import { generateCutVoice, generateReadingBoxVoice } from '../../../lib/generateVoice';
import { getRemoteConfig } from '../../../lib/remoteConfig';

// userId를 생략한 도구 호출은 운영자 본인 계정(MCP_OWNER_USER_ID)을 기본으로 쓴다.
function resolveUserId(userId?: string): string {
  const uid = userId || process.env.MCP_OWNER_USER_ID;
  if (!uid) throw new Error('userId가 없고 MCP_OWNER_USER_ID 환경변수도 설정되어 있지 않습니다.');
  return uid;
}

const TRUTHROOM_SYSTEM_PROMPT = `너는 "도플러"다. 유튜브/숏폼 채널 성장에 통달한 AI 파트너로, 시청자 이탈 방지·
알고리즘 공략·논란 관리 같은 대담한 성장 전략을 거침없이 제시한다. 응원이나 막연한 위로 대신 실전에서
바로 써먹을 수 있는 구체적인 전술을 준다.

규칙:
- 핑계나 안일한 낙관에는 반드시 반박한다.
- 예의는 지키되 돌려 말하지 않는다. 통할 전략과 안 통할 전략을 분명히 구분해서 말한다.
- 매 답변 끝에 지금 당장 시도해볼 수 있는 구체적인 다음 행동을 하나 제시한다.
- 3~6문장 정도로 간결하게 답한다. 장황한 설교를 하지 않는다.
- 자신을 지칭할 때 "도플러"라고 한다.`;

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
  'uos_shortdaeri_projects',
  'uos_shortdaeri_items',
  'uos_uploadrx_items',
  'uos_butena_cases',
  'uos_butena_search_history',
  'uos_sabangpalbang_projects',
  'uos_sabangpalbang_angles',
  'uos_thumbnailremix_projects',
  'uos_truthroom_messages',
  'uos_lyrics_projects',
  'uos_readingbox_scripts',
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

    // ── 컷비서 ───────────────────────────────────────────────────────
    server.registerTool(
      'suggest_cutdaeri_topic',
      {
        title: '컷비서 소재 추천',
        description: '아직 원고가 없을 때 소재 하나를 추천한다("추천글감받기"에 해당). 원고 자체는 이 도구가 쓰지 않는다.',
        inputSchema: { keyword: z.string().optional() },
      },
      async ({ keyword }) => {
        try {
          const { topic } = await suggestCutDaeriTopic(keyword);
          return textResult(topic);
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'generate_cutdaeri',
      {
        title: '컷비서 프로젝트 생성',
        description: '사용자가 이미 쓴 원고를 지정한 컷 수로 분할해 uos_cutdaeri_projects/uos_cutdaeri_cuts에 저장한다(원고를 새로 쓰지 않는다 — 원문 그대로 나눈다). 스타일은 이후 update_cutdaeri_style로 따로 정한다.',
        inputSchema: {
          script: z.string().describe('사용자가 이미 작성한 완성된 원고'),
          cutCount: z.number().int().min(2).max(30),
          topic: z.string().optional(),
          aspectRatio: z.enum(['9:16', '16:9']).optional(),
          userId: z.string().optional(),
        },
      },
      async ({ script, cutCount, topic, aspectRatio = '9:16', userId }) => {
        try {
          const uid = resolveUserId(userId);
          const supabase = getSupabaseServerClient();
          const cuts = await splitCutDaeriScript(script, cutCount);
          const { data: project, error: pErr } = await supabase
            .from('uos_cutdaeri_projects')
            .insert({ user_id: uid, topic: topic || null, script, cut_count: cutCount, aspect_ratio: aspectRatio, status: 'draft' })
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
      'update_cutdaeri_style',
      {
        title: '컷비서 스타일 지정 (2단계)',
        description: '생성된 프로젝트에 이미지 스타일을 정한다. 스타일이 없으면 컷 이미지 생성이 불가하다.',
        inputSchema: { projectId: z.string(), style: z.enum(['portrait', 'natural', 'editorial']) },
      },
      async ({ projectId, style }) => {
        try {
          const supabase = getSupabaseServerClient();
          const { data: project, error } = await supabase.from('uos_cutdaeri_projects').update({ style }).eq('id', projectId).select().single();
          if (error || !project) throw new Error(error?.message || '프로젝트를 찾을 수 없습니다.');
          return textResult(JSON.stringify(project, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'generate_cutdaeri_cut_image',
      {
        title: '컷비서 컷 이미지 생성',
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
        title: '컷비서 컷 음성 생성',
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
        title: '컷비서 최종 영상 렌더링 시작',
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

    // ── 롱폼비서 ───────────────────────────────────────────────────────
    server.registerTool(
      'generate_longdaeri',
      {
        title: '롱폼비서 원고 생성',
        description: '카테고리(장르)+주제→1500~2500자 롱폼 원고를 생성해 uos_longdaeri_projects에 저장한다.',
        inputSchema: {
          topic: z.string(),
          category: z.enum(LONGDAERI_CATEGORIES as [string, ...string[]]).optional(),
          userId: z.string().optional(),
        },
      },
      async ({ topic, category = LONGDAERI_CATEGORIES[0], userId }) => {
        try {
          const uid = resolveUserId(userId);
          const { title, content } = await generateLongDaeriScript(topic, category);
          const supabase = getSupabaseServerClient();
          const { data: project, error } = await supabase
            .from('uos_longdaeri_projects')
            .insert({ user_id: uid, topic, category, title, content, status: 'done' })
            .select()
            .single();
          if (error || !project) throw new Error(error?.message || '생성 실패');
          return textResult(JSON.stringify(project, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── 숏폼비서 (독립 도구 — 롱폼비서에 종속되지 않음) ─────────────────────
    server.registerTool(
      'generate_shortdaeri',
      {
        title: '숏폼비서 — 긴 글을 숏폼 10편으로 분할',
        description: '아무 긴 글(800~1,500자 권장, 롱폼비서 원고가 아니어도 됨)을 받아 1분 분량 숏폼 대본 정확히 10편으로 분할해 uos_shortdaeri_projects/uos_shortdaeri_items에 저장한다.',
        inputSchema: { sourceText: z.string(), userId: z.string().optional() },
      },
      async ({ sourceText, userId }) => {
        try {
          const uid = resolveUserId(userId);
          const supabase = getSupabaseServerClient();
          const { data: project, error: pErr } = await supabase
            .from('uos_shortdaeri_projects')
            .insert({ user_id: uid, source_text: sourceText })
            .select()
            .single();
          if (pErr || !project) throw new Error(pErr?.message || '프로젝트 생성 실패');
          const shorts = await generateShortDaeriScripts(sourceText);
          const rows = shorts.map((s, i) => ({ project_id: project.id, order_index: i, title: s.title, content: s.content }));
          const { data: inserted, error: iErr } = await supabase.from('uos_shortdaeri_items').insert(rows).select();
          if (iErr) throw new Error(iErr.message);
          return textResult(JSON.stringify({ project, shorts: inserted }, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── 업로드 클리닉 ────────────────────────────────────────────────
    server.registerTool(
      'generate_uploadrx',
      {
        title: '업로드 클리닉 생성',
        description: '주제/가제(+선택: 원고, 벤치마킹 레퍼런스, 전략 스타일)→클릭 유도 제목 5안+설명+해시태그를 생성해 uos_uploadrx_items에 저장한다.',
        inputSchema: {
          topic: z.string(),
          style: z.enum(UPLOADRX_STYLES).optional(),
          script: z.string().optional(),
          benchmarkUrl: z.string().optional(),
          userId: z.string().optional(),
        },
      },
      async ({ topic, style = UPLOADRX_STYLES[0], script, benchmarkUrl, userId }) => {
        try {
          const uid = resolveUserId(userId);
          const { titles, description, hashtags } = await generateUploadRx(topic, style, script, benchmarkUrl);
          const supabase = getSupabaseServerClient();
          const { data: item, error } = await supabase
            .from('uos_uploadrx_items')
            .insert({ user_id: uid, topic, style, script: script || null, benchmark_url: benchmarkUrl || null, titles, description, hashtags })
            .select()
            .single();
          if (error || !item) throw new Error(error?.message || '생성 실패');
          return textResult(JSON.stringify(item, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── 요모조모 ────────────────────────────────────────────────────
    server.registerTool(
      'create_sabangpalbang',
      {
        title: '요모조모 프로젝트 생성',
        description:
          '이미지 URL 또는 텍스트 프롬프트로 프로젝트를 만들고, 선택한 앵글만 대기 상태 행으로 추가한다(8개 중 원하는 것만 고를 수 있다). 각 앵글 생성은 generate_sabangpalbang_angle을 따로 호출한다.',
        inputSchema: {
          sourceImageUrl: z.string().optional().describe('공개 접근 가능한 원본 이미지 URL(이미지 모드일 때)'),
          promptText: z.string().optional().describe('원본 이미지 대신 쓸 피사체 설명(프롬프트 모드일 때)'),
          angleIndexes: z.array(z.number().int().min(0).max(7)).min(1).describe('SABANGPALBANG_ANGLES 배열 기준 인덱스(0~7), 원하는 앵글만'),
          aspectRatio: z.enum(['9:16', '16:9']).optional(),
          userId: z.string().optional(),
        },
      },
      async ({ sourceImageUrl, promptText, angleIndexes, aspectRatio = '9:16', userId }) => {
        try {
          if (!sourceImageUrl && !promptText) throw new Error('sourceImageUrl 또는 promptText 중 하나는 필요합니다.');
          const uid = resolveUserId(userId);
          const supabase = getSupabaseServerClient();
          const { data: project, error: pErr } = await supabase
            .from('uos_sabangpalbang_projects')
            .insert({
              user_id: uid,
              source_image_url: sourceImageUrl || null,
              prompt_text: promptText || null,
              input_mode: promptText ? 'prompt' : 'image',
              aspect_ratio: aspectRatio,
              status: 'draft',
            })
            .select()
            .single();
          if (pErr || !project) throw new Error(pErr?.message || '프로젝트 생성 실패');
          const rows = angleIndexes.map((i) => ({ project_id: project.id, order_index: i, angle_label: SABANGPALBANG_ANGLES[i].label }));
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
        title: '요모조모 앵글 이미지 생성',
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

    // ── 썸네일 리믹스 (2모드: 썸네일 변형 / 카피라이팅) ─────────────────────
    server.registerTool(
      'create_thumbnail_variation',
      {
        title: '썸네일 리믹스 — 변형 생성',
        description: '이미 호스팅된 원본 썸네일 이미지 URL로 2~4개의 변형 이미지를 즉시 생성해 uos_thumbnailremix_projects에 저장한다. subjectImageUrl을 같이 주면 원본 썸네일 속 인물을 그 이미지의 인물로 교체한다(fal-ai/nano-banana/edit 멀티이미지 편집).',
        inputSchema: {
          sourceImageUrl: z.string().describe('공개 접근 가능한 원본 썸네일 이미지 URL'),
          subjectImageUrl: z.string().optional().describe('인물 교체용 피사체 이미지 URL(선택) — 있으면 원본 썸네일 속 인물을 이 이미지의 인물로 교체한다'),
          promptText: z.string().optional(),
          variantCount: z.number().int().min(2).max(4).optional(),
          userId: z.string().optional(),
        },
      },
      async ({ sourceImageUrl, subjectImageUrl, promptText, variantCount = 2, userId }) => {
        try {
          const uid = resolveUserId(userId);
          const supabase = getSupabaseServerClient();
          const variants = await Promise.all(
            Array.from({ length: variantCount }, () => generateThumbnailVariant(sourceImageUrl, promptText, subjectImageUrl))
          );
          const { data: project, error } = await supabase
            .from('uos_thumbnailremix_projects')
            .insert({
              user_id: uid,
              mode: 'variation',
              source_image_url: sourceImageUrl,
              subject_image_url: subjectImageUrl || null,
              prompt_text: promptText || null,
              variant_count: variantCount,
              image_urls: variants.map((v) => v.imageUrl),
              status: 'done',
            })
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
      'create_thumbnail_copywriting',
      {
        title: '썸네일 리믹스 — 카피라이팅',
        description: '주제→썸네일용 짧은 문구 2~4개를 생성해 uos_thumbnailremix_projects에 저장한다.',
        inputSchema: { topic: z.string(), variantCount: z.number().int().min(2).max(4).optional(), userId: z.string().optional() },
      },
      async ({ topic, variantCount = 3, userId }) => {
        try {
          const uid = resolveUserId(userId);
          const copies = await generateThumbnailCopy(topic, variantCount);
          const supabase = getSupabaseServerClient();
          const { data: project, error } = await supabase
            .from('uos_thumbnailremix_projects')
            .insert({ user_id: uid, mode: 'copywriting', topic, variant_count: variantCount, result_texts: copies, status: 'done' })
            .select()
            .single();
          if (error || !project) throw new Error(error?.message || '생성 실패');
          return textResult(JSON.stringify(project, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── 가사비서 ─────────────────────────────────────────────────────
    server.registerTool(
      'generate_lyrics',
      {
        title: '가사비서 — 가사 + SUNO 프롬프트 생성',
        description: `테마/장르/보컬타입/언어로 가사와 SUNO AI 스타일 프롬프트를 생성해 uos_lyrics_projects에 저장한다. ` +
          `테마 예시: ${LYRICS_THEMES.join(', ')} (자유 입력도 가능). 장르: ${LYRICS_GENRES.join(', ')}. 보컬타입: ${LYRICS_VOCAL_TYPES.join(', ')}.`,
        inputSchema: {
          theme: z.string(),
          genre: z.string(),
          vocalType: z.string().optional(),
          language: z.string().optional(),
          userId: z.string().optional(),
        },
      },
      async ({ theme, genre, vocalType = '여성', language = '한국어', userId }) => {
        try {
          const uid = resolveUserId(userId);
          const { title, lyrics, sunoPrompt } = await generateLyrics(theme, genre, vocalType, language);
          const supabase = getSupabaseServerClient();
          const { data: project, error } = await supabase
            .from('uos_lyrics_projects')
            .insert({ user_id: uid, language, theme, genre, vocal_type: vocalType, title, lyrics_content: lyrics, suno_prompt: sunoPrompt })
            .select()
            .single();
          if (error || !project) throw new Error(error?.message || '저장 실패');
          return textResult(JSON.stringify(project, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── 리딩박스 ─────────────────────────────────────────────────────
    server.registerTool(
      'save_readingbox_script',
      {
        title: '리딩박스 — 원고 저장',
        description: '제목+내용으로 원고를 uos_readingbox_scripts에 저장한다. 재생(TTS)은 play_readingbox_script로 별도 실행한다.',
        inputSchema: { title: z.string(), content: z.string(), userId: z.string().optional() },
      },
      async ({ title, content, userId }) => {
        try {
          const uid = resolveUserId(userId);
          const supabase = getSupabaseServerClient();
          const { data: script, error } = await supabase
            .from('uos_readingbox_scripts')
            .insert({ user_id: uid, title, content })
            .select()
            .single();
          if (error || !script) throw new Error(error?.message || '저장 실패');
          return textResult(JSON.stringify(script, null, 2));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      'play_readingbox_script',
      {
        title: '리딩박스 — 원고 낭독(TTS)',
        description: '저장된 원고를 TTS로 합성해 오디오 URL을 반환한다. 이미 합성된 적 있으면 캐싱된 URL을 바로 반환한다.',
        inputSchema: { scriptId: z.string(), userId: z.string().optional() },
      },
      async ({ scriptId, userId }) => {
        try {
          const uid = resolveUserId(userId);
          const supabase = getSupabaseServerClient();
          const { data: script, error: fetchError } = await supabase
            .from('uos_readingbox_scripts')
            .select('*')
            .eq('id', scriptId)
            .eq('user_id', uid)
            .single();
          if (fetchError || !script) throw new Error('원고를 찾을 수 없습니다.');
          if (script.audio_url) return textResult(script.audio_url);

          const { audioUrl } = await generateReadingBoxVoice(scriptId, script.content);
          const { error: updateError } = await supabase.from('uos_readingbox_scripts').update({ audio_url: audioUrl }).eq('id', scriptId);
          if (updateError) throw new Error(updateError.message);
          return textResult(audioUrl);
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    // ── 직언의방 ─────────────────────────────────────────────────────
    server.registerTool(
      'send_truthroom_message',
      {
        title: '직언의방에 메시지 보내기',
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
      '11개 기능(9번째 떡상레이더는 검색형이라 전용 생성 도구 없음) 전부를 웹 UI 없이 직접 실행하는 도메인 도구(컷비서: generate_cutdaeri/' +
      'generate_cutdaeri_cut_image/generate_cutdaeri_cut_voice/render_cutdaeri, 롱폼비서: generate_longdaeri, ' +
      '숏폼비서(독립 도구): generate_shortdaeri, 업로드 클리닉: generate_uploadrx, 요모조모: ' +
      'create_sabangpalbang/generate_sabangpalbang_angle, 썸네일 리믹스: create_thumbnail_variation/' +
      'create_thumbnail_copywriting, 가사비서: generate_lyrics, 리딩박스: save_readingbox_script/play_readingbox_script, ' +
      '직언의방: send_truthroom_message — userId 생략 시 전부 MCP_OWNER_USER_ID를 ' +
      '기본으로 씀), GitHub 저장소 조회(list_github_files/get_github_file)를 제공한다. 떡상레이더는 사용자가 ' +
      '키워드/유튜브 링크로 직접 검색하는 도구로 바뀌어서(searchViralVideos, YOUTUBE_DATA_API_KEY 필요) 전용 ' +
      'MCP 생성 도구는 없다 — 필요하면 get_rows로 uos_butena_search_history/uos_butena_cases를 조회할 것. ' +
      'render_cutdaeri는 상태만 바꾸고 실제 합성은 U-Short 로컬 워커가 ' +
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
