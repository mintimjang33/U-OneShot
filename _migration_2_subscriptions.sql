-- U-OneShot 2차 마이그레이션 (요금제 등급 — 실결제 없는 모의 구독)
-- 유쓰레드 ut_subscriptions는 이진(구독/미구독)이었지만, BuronAI는 4단 등급(Free/Lite/Standard/Pro)이라
-- tier 컬럼으로 확장한다. "구독하기" 버튼을 누르면 결제 없이 해당 등급을 30일 부여한다.

create table if not exists uos_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'lite', 'standard', 'pro')),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table uos_subscriptions enable row level security;
