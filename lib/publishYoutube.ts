import { decryptVaultValue, encryptVaultValue } from './vaultCrypto';
import { getSupabaseServerClient } from './supabase';

type YoutubeAccount = {
  id: string;
  encrypted_access_token: string;
  token_expires_at: string | null;
  extra: { refresh_token?: string };
};

async function getFreshAccessToken(account: YoutubeAccount): Promise<string> {
  const expired = !account.token_expires_at || new Date(account.token_expires_at) <= new Date();
  if (!expired) return decryptVaultValue(account.encrypted_access_token);

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = account.extra?.refresh_token ? decryptVaultValue(account.extra.refresh_token) : null;
  if (!clientId || !clientSecret || !refreshToken) throw new Error('YouTube 토큰 갱신에 필요한 정보가 없습니다. 재연동해주세요.');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error(json.error_description || JSON.stringify(json));

  const supabase = getSupabaseServerClient();
  await supabase
    .from('uos_social_accounts')
    .update({ encrypted_access_token: encryptVaultValue(json.access_token), token_expires_at: new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString() })
    .eq('id', account.id);

  return json.access_token;
}

// ⚠️ YouTube Data API는 (Facebook/Instagram/TikTok과 달리) URL로 영상을 당겨가는 기능이 없다 —
// 영상 바이트 자체를 업로드해야 한다. Vercel 서버리스 함수의 실행시간/페이로드 제한 때문에 긴 영상은
// 여기서 직접 처리하기 어려울 수 있음(컷대리의 로컬 워커에서 처리하는 방향으로 나중에 옮길 수 있음).
// 지금은 짧은 테스트 영상 기준으로 동작하는 단순 업로드로 구현한다.
export async function publishYoutubeVideoNow(
  input: { title: string; description: string; videoUrl: string; tags?: string[]; madeForKids?: boolean; privacy?: 'public' | 'private' },
  account: YoutubeAccount
): Promise<{ videoId: string }> {
  const accessToken = await getFreshAccessToken(account);

  const videoRes = await fetch(input.videoUrl);
  if (!videoRes.ok || !videoRes.body) throw new Error('영상 URL을 가져올 수 없습니다.');
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(videoBuffer.length),
      },
      body: JSON.stringify({
        snippet: { title: input.title, description: input.description, tags: input.tags?.length ? input.tags : undefined },
        status: { privacyStatus: input.privacy || 'private', selfDeclaredMadeForKids: Boolean(input.madeForKids) },
      }),
    }
  );
  const uploadUrl = initRes.headers.get('location');
  if (!initRes.ok || !uploadUrl) throw new Error(`업로드 세션 시작 실패: ${await initRes.text()}`);

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(videoBuffer.length) },
    body: videoBuffer,
  });
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok || !uploadJson.id) throw new Error(uploadJson.error?.message || JSON.stringify(uploadJson));

  return { videoId: uploadJson.id };
}
