import { decryptVaultValue } from './vaultCrypto';

type FacebookAccount = { external_account_id: string; encrypted_access_token: string };

// 페이지에 텍스트(+선택적으로 영상 URL) 게시. 영상이 있으면 /videos, 없으면 /feed에 게시한다.
export async function publishFacebookPostNow(
  input: { message: string; videoUrl?: string },
  account: FacebookAccount
): Promise<{ postId: string }> {
  const accessToken = decryptVaultValue(account.encrypted_access_token);

  if (input.videoUrl) {
    const res = await fetch(`https://graph.facebook.com/v19.0/${account.external_account_id}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_url: input.videoUrl, description: input.message, access_token: accessToken }),
    });
    const json = await res.json();
    if (!res.ok || !json.id) throw new Error(json.error?.message || JSON.stringify(json));
    return { postId: json.id };
  }

  const res = await fetch(`https://graph.facebook.com/v19.0/${account.external_account_id}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: input.message, access_token: accessToken }),
  });
  const json = await res.json();
  if (!res.ok || !json.id) throw new Error(json.error?.message || JSON.stringify(json));
  return { postId: json.id };
}
