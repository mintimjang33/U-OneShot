-- U-OneShot 21차 마이그레이션 (버그 수정 — 요모조모 aspect_ratio 컬럼이 아예 없었음)
-- app/api/sabangpalbang/route.ts가 진작부터 insert 시 aspect_ratio 값을 넣고 있었는데
-- 실제 테이블엔 컬럼이 없어서 요모조모 생성 요청이 전부 500 에러로 실패하고 있었음(2026-08-29 발견).

alter table uos_sabangpalbang_projects add column if not exists aspect_ratio text not null default '9:16';
