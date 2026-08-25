-- U-OneShot 초기 마이그레이션 (Supabase SQL Editor에서 실행)
-- 공유 프로젝트(HongHub/유쓰레드/유쇼츠와 동일)이므로 전부 uos_ 접두사로 테이블명 충돌을 피한다.

-- Threads 계정 연동 (유쓰레드 ut_threads_accounts와 동일 구조 — 코드도 그대로 포팅)
create table if not exists uos_threads_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  threads_user_id text not null,
  username text,
  encrypted_access_token text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, threads_user_id)
);
alter table uos_threads_accounts enable row level security;

-- 나머지 5개 플랫폼(YouTube/TikTok/Instagram/Facebook/X) 연동 계정.
-- OAuth 앱 등록/심사가 끝나기 전까지는 비어있는 게 정상 — 카드 UI/스키마만 먼저 완성한다.
create table if not exists uos_social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram', 'facebook', 'x')),
  external_account_id text not null,
  username text,
  encrypted_access_token text not null,
  token_expires_at timestamptz,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, platform, external_account_id)
);
alter table uos_social_accounts enable row level security;

-- 한방살포(Multi Publisher) 발행 작업 1건 = 여러 플랫폼으로 동시 발행되는 하나의 콘텐츠 묶음.
create table if not exists uos_publish_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_url text,
  thumbnail_url text,
  status text not null default 'draft' check (status in ('draft', 'publishing', 'done', 'failed')),
  created_at timestamptz not null default now()
);
alter table uos_publish_jobs enable row level security;

-- 발행 작업 내 플랫폼별 게시 카드 1건(제목/본문/공개범위 등 플랫폼 고유 옵션 + 발행 상태).
create table if not exists uos_publish_targets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references uos_publish_jobs(id) on delete cascade,
  platform text not null check (platform in ('threads', 'youtube', 'tiktok', 'instagram', 'facebook', 'x')),
  account_id uuid,
  title text,
  body text,
  visibility text,
  options jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'posted', 'failed', 'not_configured')),
  platform_post_id text,
  publish_error text,
  created_at timestamptz not null default now()
);
alter table uos_publish_targets enable row level security;

-- MCP 서버 run_sql 도구용 읽기전용 SQL 실행 RPC (유쓰레드 ut_mcp_run_sql과 동일 로직).
create or replace function uos_mcp_run_sql(query text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  normalized text := lower(trim(query));
begin
  if normalized !~ '^select\s' and normalized !~ '^select\*' and normalized !~ '^\(select' then
    raise exception 'Only SELECT statements are allowed';
  end if;
  if normalized ~ '(insert|update|delete|drop|alter|truncate|grant|revoke|create)\s' then
    raise exception 'Only SELECT statements are allowed';
  end if;

  execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from (%s) t', query) into result;
  return result;
end;
$$;
