-- U-OneShot 8차 마이그레이션 (사방팔방 — 원본 이미지 1장 → 8개 앵글 자동 생성)

insert into storage.buckets (id, name, public)
values ('sabangpalbang-assets', 'sabangpalbang-assets', true)
on conflict (id) do nothing;

create table if not exists uos_sabangpalbang_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_image_url text not null,
  status text not null default 'draft' check (status in ('draft', 'done', 'failed')),
  created_at timestamptz not null default now()
);
alter table uos_sabangpalbang_projects enable row level security;

create table if not exists uos_sabangpalbang_angles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references uos_sabangpalbang_projects(id) on delete cascade,
  order_index int not null,
  angle_label text not null,
  image_url text,
  status text not null default 'pending' check (status in ('pending', 'generating', 'done', 'failed')),
  created_at timestamptz not null default now(),
  unique (project_id, order_index)
);
alter table uos_sabangpalbang_angles enable row level security;
