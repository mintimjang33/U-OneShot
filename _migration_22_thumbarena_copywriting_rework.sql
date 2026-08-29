-- U-OneShot 22차 마이그레이션 (썸네일 리믹스 "카피라이팅" 모드 재설계 — 2026-08-29 재실측 기반)
-- 이전엔 텍스트 문구만 뽑는 기능이었는데, 원본은 실제로 완성된 썸네일 이미지를 만드는 기능이었음.

alter table uos_thumbnailremix_projects add column if not exists copy_text text;
alter table uos_thumbnailremix_projects add column if not exists mood text;
alter table uos_thumbnailremix_projects add column if not exists layout text;
alter table uos_thumbnailremix_projects add column if not exists visual_style text;
