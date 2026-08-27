import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { publishThreadPostNow } from '../../../lib/publishThreadPost';
import { checkMultiPublishQuota } from '../../../lib/subscription';

const CONFIGURED_PLATFORMS = new Set(['threads']); // YouTube/TikTok/Instagram/Facebook/X는 OAuth 앱 승인 후 추가

type TargetInput = {
  platform: 'threads' | 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x';
  accountId?: string;
  title?: string;
  body?: string;
  visibility?: string;
  options?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const targets: TargetInput[] = body?.targets || [];
  if (targets.length === 0) return NextResponse.json({ error: '최소 1개 플랫폼을 선택해주세요.' }, { status: 400 });

  const quotaError = await checkMultiPublishQuota(user.id);
  if (quotaError) return NextResponse.json({ error: quotaError }, { status: 402 });

  const supabase = getSupabaseServerClient();

  const { data: job, error: jobError } = await supabase
    .from('uos_publish_jobs')
    .insert({ user_id: user.id, video_url: body?.videoUrl || null, status: 'publishing' })
    .select()
    .single();
  if (jobError || !job) return NextResponse.json({ error: jobError?.message || '작업 생성 실패' }, { status: 500 });

  const results: Record<string, { status: string; postId?: string; error?: string }> = {};

  for (const target of targets) {
    const isConfigured = CONFIGURED_PLATFORMS.has(target.platform);
    const insertRes = await supabase
      .from('uos_publish_targets')
      .insert({
        job_id: job.id,
        platform: target.platform,
        account_id: target.accountId || null,
        title: target.title || null,
        body: target.body || null,
        visibility: target.visibility || null,
        options: target.options || {},
        status: isConfigured ? 'pending' : 'not_configured',
      })
      .select()
      .single();

    const row = insertRes.data;
    if (!row) continue;

    if (!isConfigured) {
      results[target.platform] = { status: 'not_configured' };
      continue;
    }

    if (target.platform === 'threads') {
      if (!target.accountId) {
        await supabase.from('uos_publish_targets').update({ status: 'failed', publish_error: 'Threads 계정이 연동되어 있지 않습니다.' }).eq('id', row.id);
        results.threads = { status: 'failed', error: 'Threads 계정이 연동되어 있지 않습니다.' };
        continue;
      }
      const { data: account } = await supabase
        .from('uos_threads_accounts')
        .select('*')
        .eq('id', target.accountId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!account) {
        await supabase.from('uos_publish_targets').update({ status: 'failed', publish_error: '연동된 Threads 계정을 찾을 수 없습니다.' }).eq('id', row.id);
        results.threads = { status: 'failed', error: '연동된 Threads 계정을 찾을 수 없습니다.' };
        continue;
      }
      try {
        const result = await publishThreadPostNow(
          {
            content: target.body || '',
            shareToInstagram: Boolean(target.options?.shareToInstagram),
          },
          account
        );
        await supabase
          .from('uos_publish_targets')
          .update({ status: 'posted', platform_post_id: result.threadsPostId })
          .eq('id', row.id);
        results.threads = { status: 'posted', postId: result.threadsPostId };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await supabase.from('uos_publish_targets').update({ status: 'failed', publish_error: message }).eq('id', row.id);
        results.threads = { status: 'failed', error: message };
      }
    }
  }

  const anyFailed = Object.values(results).some((r) => r.status === 'failed');
  const allDone = Object.values(results).every((r) => r.status === 'posted' || r.status === 'not_configured');
  await supabase
    .from('uos_publish_jobs')
    .update({ status: anyFailed ? 'failed' : allDone ? 'done' : 'publishing' })
    .eq('id', job.id);

  return NextResponse.json({ jobId: job.id, results });
}
