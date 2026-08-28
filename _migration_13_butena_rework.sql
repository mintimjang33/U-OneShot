-- U-OneShot 13차 마이그레이션 (떡상레이더 — 원본 실제 플로우: 정적 갤러리가 아니라 실시간 검색 도구)

-- uos_butena_cases는 이제 "보관함"(사용자가 저장한 검색 결과)으로 의미가 바뀐다 — user_id를 추가한다.
alter table uos_butena_cases add column if not exists user_id uuid references auth.users(id) on delete cascade;

create table if not exists uos_butena_search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);
alter table uos_butena_search_history enable row level security;
