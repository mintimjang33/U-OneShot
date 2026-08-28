-- U-OneShot 6차 마이그레이션 (업로드 처방전 — 키워드 → 클릭 유도 제목/설명/해시태그)

create table if not exists uos_uploadrx_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  titles text[] not null,
  description text not null,
  hashtags text[] not null,
  created_at timestamptz not null default now()
);
alter table uos_uploadrx_items enable row level security;
