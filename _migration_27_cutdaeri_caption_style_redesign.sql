-- U-OneShot 27차 마이그레이션 (컷비서 4단계 자막 스타일 재설계)
--
-- 마이그레이션 25에서 만든 caption_preset_id/caption_position/caption_custom은 "8개 프리셋 묶음"
-- 방식이었는데, 2026-08-30 재로그인 재실측 결과 원본은 그게 아니라 줄수/크기/위치/폰트/색상/윤곽선/
-- 배경이 전부 독립적으로 조절되는 방식이었음(프리셋 묶음이 아님). 그 값들을 하나의 JSON으로 다시 저장.

alter table uos_cutdaeri_projects drop column if exists caption_preset_id;
alter table uos_cutdaeri_projects drop column if exists caption_position;
alter table uos_cutdaeri_projects drop column if exists caption_custom;
alter table uos_cutdaeri_projects add column if not exists caption_style jsonb;
