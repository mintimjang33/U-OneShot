-- U-OneShot 11차 마이그레이션 (원샷배포 — 원본 실제 UI에 맞춘 보강: 예약 발행, 저장, 실행 이력)
-- 원본(한방살포) 실측 결과 uos_publish_jobs에 "예약" 개념이 없어서 추가한다.

alter table uos_publish_jobs drop constraint if exists uos_publish_jobs_status_check;
alter table uos_publish_jobs add constraint uos_publish_jobs_status_check
  check (status in ('draft', 'scheduled', 'publishing', 'done', 'failed'));
alter table uos_publish_jobs add column if not exists scheduled_at timestamptz;
