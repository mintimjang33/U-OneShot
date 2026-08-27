-- U-OneShot 4차 마이그레이션 (컷대리 — TTS 음성 파일 저장용 Storage 버킷)
insert into storage.buckets (id, name, public)
values ('cutdaeri-assets', 'cutdaeri-assets', true)
on conflict (id) do nothing;
