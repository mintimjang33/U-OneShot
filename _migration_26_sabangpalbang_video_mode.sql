-- U-OneShot 26차 마이그레이션 (요모조모 "동영상" 입력모드 — 2026-08-30 재실측으로 뒤늦게 발견해서 추가)

alter table uos_sabangpalbang_projects add column if not exists extra_prompt text;
alter table uos_sabangpalbang_projects add column if not exists output_video_url text;
