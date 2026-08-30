import { getSupabaseServerClient } from './supabase';

// "내 저장소" 상단 클라우드 저장소 용량 바(요금제표: Free 0.1GB/Lite 0.5GB/Standard 1GB/Pro 5GB)용
// 실사용량 계산. 사용자별 폴더(userId/...)로 업로드되는 버킷만 정확히 집계할 수 있다 — TTS 음성
// (lib/generateVoice.ts)과 컷대리 최종 렌더링 mp4(U-Short 워커가 올림)는 버킷 루트/공용 폴더에
// 저장돼서(user 프리픽스 없음) 여기 합계엔 포함되지 않는다. 실제보다 적게 나올 수 있는 근사치다.
const USER_SCOPED_BUCKETS = ['cutdaeri-assets', 'thumbarena-assets', 'sabangpalbang-assets'];

export async function getStorageUsageBytes(userId: string): Promise<number> {
  const supabase = getSupabaseServerClient();
  let total = 0;
  for (const bucket of USER_SCOPED_BUCKETS) {
    const { data, error } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
    if (error || !data) continue;
    for (const file of data) {
      total += file.metadata?.size || 0;
    }
  }
  return total;
}
