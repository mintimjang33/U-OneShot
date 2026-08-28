-- U-OneShot 19차 마이그레이션 (리딩박스 — 신규, 8-10절 실측 기반)

create table if not exists uos_readingbox_scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  audio_url text,
  created_at timestamptz not null default now()
);
alter table uos_readingbox_scripts enable row level security;
