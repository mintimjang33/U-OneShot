-- U-OneShot 3차 마이그레이션 (컷대리 — 대본→이미지→TTS→자막→영상)
-- 유쇼츠(U-Short)의 렌더링/워커 인프라는 재사용하되, 컷대리 고유 기능(장면별 AI 이미지 생성,
-- 인물/내추럴/에디토리얼 스타일)은 새 테이블로 관리한다.

create table if not exists uos_cutdaeri_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  script text,
  style text not null default 'natural' check (style in ('portrait', 'natural', 'editorial')),
  aspect_ratio text not null default '9:16' check (aspect_ratio in ('16:9', '9:16')),
  character_image_url text,
  status text not null default 'draft' check (status in ('draft', 'generating', 'rendering', 'done', 'failed')),
  video_url text,
  narration_url text,
  captions_url text,
  created_at timestamptz not null default now()
);
alter table uos_cutdaeri_projects enable row level security;

create table if not exists uos_cutdaeri_cuts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references uos_cutdaeri_projects(id) on delete cascade,
  order_index int not null,
  text text not null,
  copy_text text,
  image_url text,
  video_url text,
  audio_url text,
  use_video boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'generating', 'done', 'failed')),
  created_at timestamptz not null default now(),
  unique (project_id, order_index)
);
alter table uos_cutdaeri_cuts enable row level security;
