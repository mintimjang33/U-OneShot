import { decryptVaultValue } from './vaultCrypto';

type InstagramAccount = { external_account_id: string; encrypted_access_token: string };

// 릴스(Reels) 발행 — 미디어 컨테이너 생성 → 처리 완료 폴링 → 발행, 2단계 플로우(Meta Graph API 표준).
// video_url이 반드시 필요하다(컷대리 완성 전까지는 실사용 불가 — 코드만 완료된 상태).
export async function publishInstagramReelNow(
  input: { caption: string; videoUrl: string },
  account: InstagramAccount
): Promise<{ mediaId: string }> {
  const accessToken = decryptVaultValue(account.encrypted_access_token);

  const createRes = await fetch(`https://graph.facebook.com/v19.0/${account.external_account_id}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: input.videoUrl,
      caption: input.caption,
      access_token: accessToken,
    }),
  });
  const createJson = await createRes.json();
  if (!createRes.ok || !createJson.id) throw new Error(createJson.error?.message || JSON.stringify(createJson));

  // 영상 처리는 비동기라 status_code가 FINISHED가 될 때까지 폴링한다(최대 60초).
  let statusCode = 'IN_PROGRESS';
  for (let i = 0; i < 20 && statusCode !== 'FINISHED'; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`https://graph.facebook.com/v19.0/${createJson.id}?fields=status_code&access_token=${accessToken}`);
    const statusJson = await statusRes.json();
    statusCode = statusJson.status_code;
    if (statusCode === 'ERROR') throw new Error('인스타그램 영상 처리 실패');
  }
  if (statusCode !== 'FINISHED') throw new Error('인스타그램 영상 처리 시간 초과');

  const publishRes = await fetch(`https://graph.facebook.com/v19.0/${account.external_account_id}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: createJson.id, access_token: accessToken }),
  });
  const publishJson = await publishRes.json();
  if (!publishRes.ok || !publishJson.id) throw new Error(publishJson.error?.message || JSON.stringify(publishJson));

  return { mediaId: publishJson.id };
}
