-- U-OneShot 15차 마이그레이션 (요모조모 — 원본 실제 플로우: 입력모드 3종, 화면비율 선택,
-- 앵글 체크박스 선택형)

alter table uos_sabangpalbang_projects alter column source_image_url drop not null;
alter table uos_sabangpalbang_projects add column if not exists input_mode text not null default 'image'
  check (input_mode in ('image', 'prompt', 'video'));
alter table uos_sabangpalbang_projects add column if not exists prompt_text text;
