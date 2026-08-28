import { getRemoteConfig } from './remoteConfig';

export type ViralVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  viewCount: number;
  subscriberCount: number | null;
  publishedAt: string;
};

function extractVideoId(input: string): string | null {
  const m = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

// 떡상레이더(부테나): 키워드 또는 유튜브 링크로 "무명 채널에서 갑자기 터진" 영상을 찾는다.
// 원본 실측(8-3절)은 실시간 검색 도구다 — 관리자가 미리 채워두는 정적 갤러리가 아니다.
export async function searchViralVideos(query: string): Promise<ViralVideo[]> {
  const apiKey = await getRemoteConfig('YOUTUBE_DATA_API_KEY');
  if (!apiKey) throw new Error('YOUTUBE_DATA_API_KEY가 설정되어 있지 않습니다. Google Cloud Console에서 YouTube Data API v3 키를 발급해주세요.');

  const videoId = extractVideoId(query);
  let searchQuery = query;

  if (videoId) {
    const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`);
    const videoJson = await videoRes.json();
    const title = videoJson.items?.[0]?.snippet?.title;
    if (!title) throw new Error('유튜브 링크에서 영상 정보를 가져오지 못했습니다.');
    searchQuery = title;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&maxResults=25&q=${encodeURIComponent(searchQuery)}&key=${apiKey}`
  );
  const searchJson = await searchRes.json();
  if (!searchRes.ok) throw new Error(searchJson.error?.message || JSON.stringify(searchJson));
  const ids: string[] = (searchJson.items || []).map((it: { id: { videoId: string } }) => it.id.videoId).filter(Boolean);
  if (ids.length === 0) return [];

  const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(',')}&key=${apiKey}`);
  const videosJson = await videosRes.json();
  if (!videosRes.ok) throw new Error(videosJson.error?.message || JSON.stringify(videosJson));

  const channelIds = [...new Set((videosJson.items || []).map((v: { snippet: { channelId: string } }) => v.snippet.channelId))];
  const channelsRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelIds.join(',')}&key=${apiKey}`);
  const channelsJson = await channelsRes.json();
  const subsByChannel: Record<string, number | null> = {};
  for (const c of channelsJson.items || []) {
    subsByChannel[c.id] = c.statistics?.hiddenSubscriberCount ? null : Number(c.statistics?.subscriberCount ?? 0);
  }

  const results: ViralVideo[] = (videosJson.items || []).map(
    (v: {
      id: string;
      snippet: { title: string; channelTitle: string; channelId: string; publishedAt: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
      statistics: { viewCount?: string };
    }) => ({
      videoId: v.id,
      title: v.snippet.title,
      channelTitle: v.snippet.channelTitle,
      thumbnailUrl: v.snippet.thumbnails.medium?.url || v.snippet.thumbnails.default?.url || '',
      viewCount: Number(v.statistics?.viewCount ?? 0),
      subscriberCount: subsByChannel[v.snippet.channelId] ?? null,
      publishedAt: v.snippet.publishedAt,
    })
  );

  // "무명에서 터진" 순서 — 구독자 대비 조회수 비율이 높은(=작은 채널인데 많이 본) 순으로 정렬.
  // 구독자 수를 비공개한 채널은 순위 산정이 불가능하니 뒤로 보낸다.
  results.sort((a, b) => {
    const ratioA = a.subscriberCount ? a.viewCount / Math.max(a.subscriberCount, 1) : -1;
    const ratioB = b.subscriberCount ? b.viewCount / Math.max(b.subscriberCount, 1) : -1;
    return ratioB - ratioA;
  });

  return results;
}
