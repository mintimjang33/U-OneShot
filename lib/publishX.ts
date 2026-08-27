import { decryptVaultValue } from './vaultCrypto';

type XAccount = { encrypted_access_token: string };

// X API v2로 텍스트 트윗을 발행한다. 영상 첨부는 v1.1 미디어 업로드(청크 업로드+별도 인증)가 필요해서
// 컷대리 완성 후 별도로 붙일 예정 — 지금은 텍스트 전용(buronai.com 카드 스펙도 본문 위주라 우선순위 낮음).
export async function publishTweetNow(input: { text: string }, account: XAccount): Promise<{ tweetId: string }> {
  const accessToken = decryptVaultValue(account.encrypted_access_token);

  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ text: input.text }),
  });
  const json = await res.json();
  if (!res.ok || !json.data?.id) throw new Error(json.detail || json.title || JSON.stringify(json));
  return { tweetId: json.data.id };
}
