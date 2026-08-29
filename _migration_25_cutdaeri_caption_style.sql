-- U-OneShot 25차 마이그레이션 (컷비서 4단계 — 자막 스타일. 원본 실측: 8종 프리셋+커스텀/위치/윤곽선/배경)

alter table uos_cutdaeri_projects add column if not exists caption_preset_id text default 'existing-preset-bold-white-outline';
alter table uos_cutdaeri_projects add column if not exists caption_position text default 'bottom';
alter table uos_cutdaeri_projects add column if not exists caption_custom jsonb;
