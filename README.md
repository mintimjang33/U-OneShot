# U-OneShot

buronai.com("부로나이") 클론 — 영상 제작 AI 도구 10종 + "원샷배포"(6개 SNS 동시 발행)를 묶은 올인원 SaaS.

## 실행

```bash
npm install
npm run dev   # http://localhost:3300
```

## 주요 기능 (진행 중 — 자세한 로드맵은 HongHub 프로젝트 계획서 참고)

- 원샷배포: Threads/YouTube/TikTok/Instagram/Facebook/X 6개 플랫폼 동시 발행 (Threads부터 실동작)
- 컷대리: 대본 → 이미지 → TTS → 자막 → 영상 자동 제작
- 롱대리 / 숏대리 / 업로드 처방전: AI 원고·카피 생성
- 부테나: 터진 사례 큐레이션
- 진실의방 / 사방팔방 / 썸네일 이상형 월드컵 / 가사도우미
- MCP 서버(`/api/mcp`) — Supabase 데이터 및 주요 기능을 외부에서 직접 다룰 수 있음
