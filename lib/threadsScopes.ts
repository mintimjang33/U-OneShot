// Threads OAuth 요청 scope — 유쓰레드 lib/threadsScopes.ts와 동일(같은 Meta 앱을 재사용하므로
// 요청 가능한 권한 목록도 동일하다). 원샷배포는 이 중 threads_basic + threads_content_publish만 쓴다.
export const THREADS_SCOPES = [
  'threads_basic',
  'threads_content_publish',
] as const;

export const THREADS_SCOPE_STRING = THREADS_SCOPES.join(',');
