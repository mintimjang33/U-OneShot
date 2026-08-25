import Link from 'next/link';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import { T } from '../../lib/i18n';

const PLATFORMS = [
  {
    name: 'TikTok',
    features: [
      { ko: '연결한 계정에 영상을 바로 게시 (Direct Post)', en: 'Post directly to your connected account (Direct Post)' },
      { ko: '공개 범위 직접 선택 (전체공개·친구·팔로워·나만 보기)', en: 'Choose visibility (public·friends·followers·only me)' },
      { ko: '상호작용(댓글·듀엣·스티치) 기본 꺼짐, 필요 시 켜기', en: 'Interactions (comment·duet·stitch) off by default' },
      { ko: '브랜드 홍보·유료 협찬 상업 콘텐츠 고지', en: 'Commercial content disclosure (brand·paid partnership)' },
      { ko: '게시 전 음원 사용 확인 동의 안내', en: 'Music usage confirmation before posting' },
    ],
  },
  {
    name: 'YouTube',
    features: [
      { ko: '제목·설명·태그를 작성해 내 채널에 업로드', en: 'Write title/description/tags, upload to your channel' },
      { ko: '공개 범위 선택: 공개 · 비공개', en: 'Visibility: public · private' },
      { ko: 'AI 생성·수정 콘텐츠 알림 (예 / 아니오) 선택', en: 'AI-generated/altered content disclosure (yes/no)' },
      { ko: '대용량 영상도 안정적으로 업로드', en: 'Reliable upload even for large files' },
    ],
  },
  {
    name: 'Instagram',
    features: [
      { ko: '릴스(Reels)로 게시', en: 'Post as Reels' },
      { ko: '캡션·해시태그를 직접 작성', en: 'Write your own caption & hashtags' },
      { ko: 'Instagram 로그인·Facebook 연동 계정 모두 지원', en: 'Supports both Instagram login and Facebook-linked accounts' },
    ],
  },
  {
    name: 'Facebook',
    features: [
      { ko: '연결한 페이지에 게시 (페이지 액세스 토큰)', en: 'Post to your connected Page (Page access token)' },
      { ko: '본문(제목·설명) 작성', en: 'Write the post body (title/description)' },
      { ko: '공개 범위 선택: 공개 · 비공개', en: 'Visibility: public · private' },
    ],
  },
  {
    name: 'Threads',
    features: [
      { ko: '영상·이미지를 텍스트와 함께 게시', en: 'Post video/image together with text' },
      { ko: '본문 작성 + 반말 톤 선택', en: 'Write body + casual tone toggle' },
      { ko: '미디어 컨테이너로 안정적 발행', en: 'Reliable publish via media container' },
    ],
  },
  {
    name: 'X',
    features: [
      { ko: '영상이 포함된 트윗으로 게시', en: 'Post as a tweet with video attached' },
      { ko: '280자 자동 체크 (한글·이모지 가중치 반영)', en: '280-char auto check (weighted for Korean/emoji)' },
      { ko: '여러 계정 중복 게시 차단', en: 'Prevents duplicate posting across accounts' },
    ],
  },
];

const PRINCIPLES = [
  {
    titleKo: 'OAuth 연결 계정만 게시',
    titleEn: 'OAuth-connected accounts only',
    descKo: '사용자가 직접 연결한 계정으로만 게시하며, 비밀번호는 수집하지 않아요.',
    descEn: "Publishes only to accounts you connect yourself. We never collect passwords.",
  },
  {
    titleKo: '게시 전 사용자 확인',
    titleEn: 'Review before posting',
    descKo: '실제 발행 전 사용자가 직접 검토하고 확인한 뒤에 올라가요.',
    descEn: 'You review and confirm before anything actually publishes.',
  },
  {
    titleKo: '토큰 암호화 저장',
    titleEn: 'Encrypted token storage',
    descKo: '액세스 토큰은 암호화해 저장하고, 게시 목적으로만 사용해요.',
    descEn: 'Access tokens are encrypted and used only for publishing.',
  },
];

export default function PlatformsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 pt-16 pb-10 text-center">
          <p className="text-xs font-black text-accent mb-3">
            <T ko="지원 플랫폼" en="Supported platforms" />
          </p>
          <h1 className="text-3xl md:text-5xl font-black">
            <T ko="한 번 만들고," en="Create once," />
            <br />
            <T ko="6곳에 동시에" en="publish to 6 at once" />
          </h1>
          <p className="mt-5 text-muted max-w-xl mx-auto">
            <T
              ko="같은 영상을 YouTube · TikTok · Instagram · Facebook · Threads · X에 각 플랫폼 공식 API로 한 번에 올립니다."
              en="Publish the same video to YouTube, TikTok, Instagram, Facebook, Threads, and X — each via its official API."
            />
          </p>
          <Link href="/login" className="inline-block mt-6 bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-6 py-3">
            <T ko="무료로 시작하기 →" en="Start free →" />
          </Link>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-6">
          {PLATFORMS.map((p) => (
            <div key={p.name} className="border border-border rounded-[var(--radius-card)] p-6">
              <h3 className="font-black text-lg mb-4">{p.name}</h3>
              <ul className="space-y-2">
                {p.features.map((f, i) => (
                  <li key={i} className="text-sm text-muted flex gap-2">
                    <span className="text-accent">•</span>
                    <T ko={f.ko} en={f.en} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="bg-neutral-50 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 py-16">
            <h2 className="text-2xl font-black text-center mb-3">
              <T ko="공통 원칙" en="Common principles" />
            </h2>
            <p className="text-center text-muted mb-10">
              <T ko="모든 플랫폼에 동일하게 적용되는 약속" en="The same promise across every platform" />
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {PRINCIPLES.map((pr) => (
                <div key={pr.titleKo} className="bg-white border border-border rounded-[var(--radius-card)] p-6">
                  <div className="font-bold mb-2">
                    <T ko={pr.titleKo} en={pr.titleEn} />
                  </div>
                  <p className="text-sm text-muted">
                    <T ko={pr.descKo} en={pr.descEn} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="text-center py-16">
          <Link href="/login" className="inline-block bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-8 py-4">
            <T ko="무료로 시작하기 →" en="Start free →" />
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
