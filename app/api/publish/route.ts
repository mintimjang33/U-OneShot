import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/supabaseServerAuth';
import { publishThreadPostNow } from '../../../lib/publishThreadPost';
import { publishFacebookPostNow } from '../../../lib/publishFacebook';
import { publishInstagramReelNow } from '../../../lib/publishInstagram';
import { publishTweetNow } from '../../../lib/publishX';
import { publishYoutubeVideoNow } from '../../../lib/publishYoutube';
import { publishTiktokVideoNow } from '../../../lib/publishTiktok';
import { checkMultiPublishQuota } from '../../../lib/subscription';

// 코드는 6개 플랫폼 전부 완성돼 있다. 실제로 동작하려면 각 플랫폼 앱(env var) 등록이 끝나야 하고,
// YouTube/TikTok/Instagram은 영상 URL이 필요해서 컷비서(영상 생성) 완성 전까지는 실사용이 어렵다.
type Platform = 'threads' | 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x';

type TargetInput = {
  platform: Platform;
  accountId?: string;
  title?: string;
  body?: string;
  visibility?: string;
  options?: Record<string, unknown>;
};

async function publishOne(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  target: TargetInput,
  videoUrl: string | null
): Promise<{ status: 'posted' | 'failed'; postId?: string; error?: string }> {
  if (!target.accountId) return { status: 'failed', error: '연동된 계정을 선택해주세요.' };

  const table = target.platform === 'threads' ? 'uos_threads_accounts' : 'uos_social_accounts';
  const { data: account } = await supabase.from(table).select('*').eq('id', target.accountId).eq('user_id', userId).maybeSingle();
  if (!account) return { status: 'failed', error: '연동된 계정을 찾을 수 없습니다.' };

  try {
    switch (target.platform) {
      case 'threads': {
        const result = await publishThreadPostNow({ content: target.body || '', shareToInstagram: Boolean(target.options?.shareToInstagram) }, account);
        return { status: 'posted', postId: result.threadsPostId };
      }
      case 'facebook': {
        const result = await publishFacebookPostNow({ message: target.body || '', videoUrl: videoUrl || undefined }, account);
        return { status: 'posted', postId: result.postId };
      }
      case 'instagram': {
        if (!videoUrl) return { status: 'failed', error: '인스타그램 릴스는 영상이 필요합니다(컷비서로 영상 생성 후 이용 가능).' };
        const result = await publishInstagramReelNow({ caption: target.body || '', videoUrl }, account);
        return { status: 'posted', postId: result.mediaId };
      }
      case 'x': {
        const result = await publishTweetNow({ text: target.body || '' }, account);
        return { status: 'posted', postId: result.tweetId };
      }
      case 'youtube': {
        if (!videoUrl) return { status: 'failed', error: 'YouTube는 영상이 필요합니다(컷비서로 영상 생성 후 이용 가능).' };
        const result = await publishYoutubeVideoNow(
          { title: target.title || '', description: target.body || '', videoUrl, madeForKids: Boolean(target.options?.madeForKids), privacy: (target.visibility as 'public' | 'private') || 'private' },
          account
        );
        return { status: 'posted', postId: result.videoId };
      }
      case 'tiktok': {
        if (!videoUrl) return { status: 'failed', error: 'TikTok은 영상이 필요합니다(컷비서로 영상 생성 후 이용 가능).' };
        const result = await publishTiktokVideoNow(
          {
            caption: target.body || '',
            videoUrl,
            allowComment: target.options?.allowComment as boolean | undefined,
            allowDuet: target.options?.allowDuet as boolean | undefined,
            allowStitch: target.options?.allowStitch as boolean | undefined,
            brandedContent: target.options?.brandedContent as boolean | undefined,
          },
          account
        );
        return { status: 'posted', postId: result.publishId };
      }
      default:
        return { status: 'failed', error: '지원하지 않는 플랫폼입니다.' };
    }
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const targets: TargetInput[] = body?.targets || [];
  if (targets.length === 0) return NextResponse.json({ error: '최소 1개 플랫폼을 선택해주세요.' }, { status: 400 });

  const quotaError = await checkMultiPublishQuota(user.id);
  if (quotaError) return NextResponse.json({ error: quotaError }, { status: 402 });

  const supabase = getSupabaseServerClient();
  const videoUrl: string | null = body?.videoUrl || null;

  const { data: job, error: jobError } = await supabase
    .from('uos_publish_jobs')
    .insert({ user_id: user.id, video_url: videoUrl, status: 'publishing' })
    .select()
    .single();
  if (jobError || !job) return NextResponse.json({ error: jobError?.message || '작업 생성 실패' }, { status: 500 });

  const results: Record<string, { status: string; postId?: string; error?: string }> = {};

  for (const target of targets) {
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
        status: 'pending',
      })
      .select()
      .single();

    const row = insertRes.data;
    if (!row) continue;

    const result = await publishOne(supabase, user.id, target, videoUrl);
    results[target.platform] = result;
    await supabase
      .from('uos_publish_targets')
      .update({
        status: result.status,
        platform_post_id: result.postId || null,
        publish_error: result.error || null,
      })
      .eq('id', row.id);
  }

  const anyFailed = Object.values(results).some((r) => r.status === 'failed');
  const allDone = Object.values(results).every((r) => r.status === 'posted');
  await supabase
    .from('uos_publish_jobs')
    .update({ status: anyFailed ? 'failed' : allDone ? 'done' : 'publishing' })
    .eq('id', job.id);

  return NextResponse.json({ jobId: job.id, results });
}
