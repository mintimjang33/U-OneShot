-- U-OneShot 12차 마이그레이션 (컷비서 — 원본 실제 플로우: 사용자 원고 직접 입력 + 컷 수 직접 선택,
-- 스타일은 생성 후 별도 2단계에서 고름)

alter table uos_cutdaeri_projects alter column topic drop not null;
alter table uos_cutdaeri_projects alter column style drop not null;
alter table uos_cutdaeri_projects alter column style drop default;
alter table uos_cutdaeri_projects add column if not exists cut_count int;
