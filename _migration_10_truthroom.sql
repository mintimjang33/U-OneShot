-- U-OneShot 10차 마이그레이션 (진실의방 — 창업자 철학을 반영한 AI 피드백 챗봇)

create table if not exists uos_truthroom_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table uos_truthroom_messages enable row level security;
