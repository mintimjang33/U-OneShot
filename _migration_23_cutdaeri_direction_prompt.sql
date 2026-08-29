-- U-OneShot 23차 마이그레이션 (컷비서 2단계 재설계 — "추가 디렉션 프롬프트" 필드 추가)
-- aspect_ratio/character_image_url 컬럼은 이미 있었음(초기 migration_3), 실제로 안 쓰이고 있었을 뿐.

alter table uos_cutdaeri_projects add column if not exists direction_prompt text;
