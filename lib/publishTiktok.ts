import { decryptVaultValue } from './vaultCrypto';

type TiktokAccount = { encrypted_access_token: string };

// TikTok Content Posting API — PULL_FROM_URL 소스를 쓰면 TikTok 서버가 직접 video_url을 가져가므로
// 여기서 파일을 다운로드/재업로드할 필요가 없다(Facebook/Instagram과 같은 방식).
// ⚠️ 미승인(unaudited) 앱은 본인 계정에만, 비공개(SELF_ONLY)로만 게시 가능 — TikTok 앱 심사 전엔 이 제약이 있음.
export async function publishTiktokVideoNow(
  input: { caption: string; videoUrl: string; privacyLevel?: string; allowComment?: boolean; allowDuet?: boolean; allowStitch?: boolean; brandedContent?: boolean },
  account: TiktokAccount
): Promise<{ publishId: string }> {
  const accessToken = decryptVaultValue(account.encrypted_access_token);

  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      post_info: {
        title: input.caption,
        privacy_level: input.privacyLevel || 'SELF_ONLY',
        disable_comment: input.allowComment === false,
        disable_duet: input.allowDuet === false,
        disable_stitch: input.allowStitch === false,
        brand_content_toggle: Boolean(input.brandedContent),
      },
      source_info: { source: 'PULL_FROM_URL', video_url: input.videoUrl },
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error?.code !== 'ok') throw new Error(json.error?.message || JSON.stringify(json));

  return { publishId: json.data.publish_id };
}
