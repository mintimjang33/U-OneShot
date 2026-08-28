-- U-OneShot 16차 마이그레이션 (업로드 클리닉 — 원본 실제 플로우: 키워드 하나가 아니라
-- 주제+원고+벤치마킹 레퍼런스+전략 스타일 4개 입력)

alter table uos_uploadrx_items rename column keyword to topic;
alter table uos_uploadrx_items add column if not exists script text;
alter table uos_uploadrx_items add column if not exists benchmark_url text;
alter table uos_uploadrx_items add column if not exists style text not null default '자극적'
  check (style in ('자극적', '정보전달', '감성형', '유머러스'));
