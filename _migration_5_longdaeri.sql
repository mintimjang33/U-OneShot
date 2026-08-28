-- U-OneShot 5차 마이그레이션 (롱대리·숏대리 — 주제→롱폼 원고, 롱폼→숏폼 대본 여러 편 분할)
-- 컷대리(lib/generateScript.ts)와 같은 Claude 텍스트 생성 파이프라인을 재사용한다.

create table if not exists uos_longdaeri_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  tone text not null default 'info' check (tone in ('info', 'story', 'persuade')),
  title text,
  content text,
  status text not null default 'draft' check (status in ('draft', 'done', 'failed')),
  created_at timestamptz not null default now()
);
alter table uos_longdaeri_projects enable row level security;

create table if not exists uos_shortdaeri_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references uos_longdaeri_projects(id) on delete cascade,
  order_index int not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (project_id, order_index)
);
alter table uos_shortdaeri_items enable row level security;
