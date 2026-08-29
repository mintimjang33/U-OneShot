-- U-OneShot 24차 마이그레이션 (가사비서 고급모드 — 2026-08-29 실측 기반: 무드/가사구성 필드 신규)

alter table uos_lyrics_projects add column if not exists mood text;
alter table uos_lyrics_projects add column if not exists structure text;
