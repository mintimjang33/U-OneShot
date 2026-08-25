import { decryptVaultValue } from './vaultCrypto';

type ThreadsAccount = { threads_user_id: string; encrypted_access_token: string };
type ThreadPublishInput = {
  content: string;
  threadSegments?: string[];
  shareToInstagram?: boolean;
};

// 유쓰레드 lib/publishThreadPost.ts의 핵심 발행 로직을 그대로 포팅(컨테이너 생성 후 3초 대기 후
// 발행하는 타이밍 버그 우회 포함). 유쓰레드는 DB row 전체를 받았지만, 여기선 uos_publish_targets의
// 필요한 필드만 뽑아 순수 함수로 분리했다(같은 발행 신뢰성, 더 단순한 인터페이스).
export async function publishThreadPostNow(
  input: ThreadPublishInput,
  account: ThreadsAccount
): Promise<{ threadsPostId: string }> {
  const accessToken = decryptVaultValue(account.encrypted_access_token);

  const createRes = await fetch(`https://graph.threads.net/v1.0/${account.threads_user_id}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_type: 'TEXT', text: input.content, access_token: accessToken }),
  });
  const createJson = await createRes.json();
  if (!createRes.ok || !createJson.id) throw new Error(createJson.error?.message || JSON.stringify(createJson));

  // Threads Graph API는 컨테이너 생성 직후 바로 발행을 호출하면 아직 처리 중이라 "리소스가
  // 존재하지 않는다"는 에러를 낸다(유쓰레드에서 실측 확인: 재시도하면 성공함). 짧게 기다린 뒤 발행한다.
  await new Promise((r) => setTimeout(r, 3000));

  const publishRes = await fetch(`https://graph.threads.net/v1.0/${account.threads_user_id}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: createJson.id,
      access_token: accessToken,
      ...(input.shareToInstagram ? { crossreshare_to_ig: true } : {}),
    }),
  });
  const publishJson = await publishRes.json();
  if (!publishRes.ok || !publishJson.id) throw new Error(publishJson.error?.message || JSON.stringify(publishJson));

  let lastId = publishJson.id;
  for (const segment of input.threadSegments || []) {
    if (!segment?.trim()) continue;
    try {
      const segCreateRes = await fetch(`https://graph.threads.net/v1.0/${account.threads_user_id}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type: 'TEXT', text: segment, reply_to_id: lastId, access_token: accessToken }),
      });
      const segCreateJson = await segCreateRes.json();
      if (!segCreateRes.ok || !segCreateJson.id) break;
      await new Promise((r) => setTimeout(r, 3000));
      const segPublishRes = await fetch(`https://graph.threads.net/v1.0/${account.threads_user_id}/threads_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: segCreateJson.id, access_token: accessToken }),
      });
      const segPublishJson = await segPublishRes.json();
      if (!segPublishRes.ok || !segPublishJson.id) break;
      lastId = segPublishJson.id;
    } catch {
      break;
    }
  }

  return { threadsPostId: publishJson.id };
}
