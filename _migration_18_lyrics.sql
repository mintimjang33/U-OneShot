-- U-OneShot 18차 마이그레이션 (가사비서 — 신규, 원본엔 있었지만 처음부터 빠뜨렸던 기능. 8-9절 실측 기반)

create table if not exists uos_lyrics_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  language text not null default '한국어',
  theme text not null,
  genre text not null,
  vocal_type text not null default '여성',
  title text not null,
  lyrics_content text not null,
  suno_prompt text not null,
  created_at timestamptz not null default now()
);
alter table uos_lyrics_projects enable row level security;
