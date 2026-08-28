-- U-OneShot 14차 마이그레이션 (롱폼비서 · 숏폼비서 — 원본 실제 플로우:
-- 롱폼비서는 톤이 아니라 장르 카테고리로 분류, 숏폼비서는 롱폼비서에 종속되지 않는 독립 도구)

alter table uos_longdaeri_projects add column if not exists category text;

-- 숏폼비서를 독립 도구로 만들기 위한 전용 프로젝트 테이블(원본은 아무 긴 글이나 바로 붙여넣어 쓴다).
create table if not exists uos_shortdaeri_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_text text not null,
  created_at timestamptz not null default now()
);
alter table uos_shortdaeri_projects enable row level security;

-- uos_shortdaeri_items가 이제 uos_longdaeri_projects 대신 uos_shortdaeri_projects를 참조한다.
alter table uos_shortdaeri_items drop constraint if exists uos_shortdaeri_items_project_id_fkey;
alter table uos_shortdaeri_items add constraint uos_shortdaeri_items_project_id_fkey
  foreign key (project_id) references uos_shortdaeri_projects(id) on delete cascade;
