import { getSupabaseServerClient } from './supabase';

// 공유 Supabase 프로젝트의 app_config 테이블(유쇼츠/HongHub와 공유)에서 AI 프로바이더 키를 읽어온다.
// Vercel 환경변수가 있으면 그걸 우선 쓰고, 없으면 app_config를 조회한다 — 새 키 발급/등록 불필요.
const cache = new Map<string, string>();

export async function getRemoteConfig(key: string): Promise<string | null> {
  const envValue = process.env[key];
  if (envValue) return envValue;

  if (cache.has(key)) return cache.get(key)!;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from('app_config').select('value').eq('key', key).maybeSingle();
  if (!data?.value) return null;

  cache.set(key, data.value);
  return data.value;
}
