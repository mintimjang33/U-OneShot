-- U-OneShot 9차 마이그레이션 (썸네일 이상형 월드컵 — 후보 썸네일 여러 개를 토너먼트로 A/B 테스트)

insert into storage.buckets (id, name, public)
values ('thumbarena-assets', 'thumbarena-assets', true)
on conflict (id) do nothing;

create table if not exists uos_thumbarena_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_urls text[] not null,
  winner_url text,
  status text not null default 'voting' check (status in ('voting', 'done')),
  created_at timestamptz not null default now()
);
alter table uos_thumbarena_projects enable row level security;
