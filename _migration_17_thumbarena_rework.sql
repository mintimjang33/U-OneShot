-- U-OneShot 17차 마이그레이션 (썸네일 리믹스 — 원본 실제 정체: 브라켓 투표 게임이 아니라
-- "썸네일 변형"(AI 이미지 변형 생성기) + "카피라이팅"(문구 생성기) 2모드 도구)

alter table uos_thumbarena_projects rename to uos_thumbnailremix_projects;

alter table uos_thumbnailremix_projects alter column image_urls drop not null;
alter table uos_thumbnailremix_projects drop column if exists winner_url;
alter table uos_thumbnailremix_projects drop constraint if exists uos_thumbarena_projects_status_check;

alter table uos_thumbnailremix_projects add column if not exists mode text not null default 'variation'
  check (mode in ('variation', 'copywriting'));
alter table uos_thumbnailremix_projects add column if not exists source_image_url text;
alter table uos_thumbnailremix_projects add column if not exists subject_image_url text;
alter table uos_thumbnailremix_projects add column if not exists prompt_text text;
alter table uos_thumbnailremix_projects add column if not exists variant_count int default 2;
alter table uos_thumbnailremix_projects add column if not exists topic text;
alter table uos_thumbnailremix_projects add column if not exists result_texts text[];

-- status 컬럼은 이미 있으니(과거 'voting'/'done') 기본값과 허용값만 새로 맞춘다.
alter table uos_thumbnailremix_projects alter column status set default 'draft';
update uos_thumbnailremix_projects set status = 'draft' where status = 'voting';
alter table uos_thumbnailremix_projects add constraint uos_thumbnailremix_projects_status_check
  check (status in ('draft', 'done', 'failed'));

-- image_urls 컬럼을 "변형 결과" 용도로 재사용한다(과거 "투표 후보"였던 것).
comment on column uos_thumbnailremix_projects.image_urls is '변형 결과 이미지 URL 목록(썸네일 변형 모드)';
