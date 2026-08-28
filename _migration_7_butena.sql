-- U-OneShot 7차 마이그레이션 (부테나 — 무명에서 터진 영상 사례 큐레이션)
-- 사용자별 데이터가 아니라 관리자가 큐레이션하는 공유 갤러리라 user_id가 없다.
-- 큐레이션은 유파인더(U-Finder)의 search_shorts로 후보를 찾고, Claude가 분석(insight)을 써서
-- app/api/mcp/route.ts의 upsert_row로 채워 넣는다(ALLOWED_TABLES에 이 테이블 추가됨).

create table if not exists uos_butena_cases (
  id uuid primary key default gen_random_uuid(),
  video_url text not null,
  thumbnail_url text,
  title text not null,
  channel_name text not null,
  subscriber_count int,
  view_count bigint not null,
  insight text not null,
  created_at timestamptz not null default now()
);
alter table uos_butena_cases enable row level security;
