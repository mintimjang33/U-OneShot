import Link from 'next/link';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import { T } from '../../lib/i18n';

const SEGMENTS = [
  {
    ko: '1인 크리에이터 · 유튜버',
    en: 'Solo creators · YouTubers',
    titleKo: '혼자서도 팀처럼',
    titleEn: 'A one-person team',
    descKo: '대본 작성부터 썸네일까지, 그리고 6개 채널 동시 발행까지 — 혼자서도 팀이 일하는 것처럼 굴러가요.',
    descEn: 'From scripts to thumbnails to publishing across 6 channels — run like a team, alone.',
    tags: [
      { ko: '대본→발행 몇 분', en: 'Script→publish in minutes' },
      { ko: '6개 채널 동시', en: '6 channels at once' },
      { ko: '대행사 불필요', en: 'No agency needed' },
    ],
  },
  {
    ko: '소상공인 · 자영업자',
    en: 'Small business owners',
    titleKo: '매장 홍보, 1분이면 충분',
    titleEn: 'Store promotion in 1 minute',
    descKo: '신메뉴·이벤트 영상을 만들어 여러 플랫폼에 바로 올려요. 광고비 부담 없이 직접 홍보할 수 있어요.',
    descEn: 'Make new-menu or event videos and post them everywhere — promote yourself, no ad spend.',
    tags: [
      { ko: '신메뉴 영상 1분', en: 'New menu video in 1 min' },
      { ko: '바로 게시', en: 'Publish instantly' },
      { ko: '광고비 절감', en: 'Cut ad spend' },
    ],
  },
  {
    ko: '브랜드 · 마케터',
    en: 'Brands & marketers',
    titleKo: '캠페인을 한 번에 배포',
    titleEn: 'Deploy campaigns at once',
    descKo: '일관된 메시지로 여러 채널에 동시 발행해요. 캠페인을 빠르게 확장하고 관리할 수 있어요.',
    descEn: 'Publish a consistent message across channels — scale and manage campaigns fast.',
    tags: [
      { ko: '통일된 메시지', en: 'Unified messaging' },
      { ko: '채널 간 동기화', en: 'Cross-channel sync' },
      { ko: '확장 가능한 캠페인', en: 'Scalable campaigns' },
    ],
  },
  {
    ko: '대행사',
    en: 'Agencies',
    titleKo: '여러 클라이언트를 효율적으로',
    titleEn: 'Handle more clients, efficiently',
    descKo: '채널별 반복 작업을 줄여 더 많은 클라이언트를 감당해요. 같은 시간에 더 많은 일을 처리해요.',
    descEn: 'Cut repetitive per-channel work and take on more clients in the same time.',
    tags: [
      { ko: '효율 향상', en: 'Higher efficiency' },
      { ko: '더 많은 클라이언트', en: 'More clients' },
      { ko: '반복 작업 제거', en: 'Remove repetition' },
    ],
  },
];

const COMMON = [
  { ko: 'OAuth 연결만', en: 'OAuth only', descKo: '직접 연결한 계정으로만 게시하며, 비밀번호는 수집하지 않아요.', descEn: 'Publishes only to accounts you connect — we never collect passwords.' },
  { ko: '게시 전 검토', en: 'Review before posting', descKo: '발행 전 사용자가 직접 확인한 뒤에 올라가요.', descEn: 'You confirm before anything publishes.' },
  { ko: '토큰 암호화', en: 'Encrypted tokens', descKo: '액세스 토큰은 암호화해 저장하고, 게시 목적으로만 사용해요.', descEn: 'Access tokens are encrypted and used only for publishing.' },
];

export default function ForPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 pt-16 pb-10 text-center">
          <p className="text-xs font-black text-accent mb-3">
            <T ko="누구를 위한 서비스" en="Who it's for" />
          </p>
          <h1 className="text-3xl md:text-5xl font-black">
            <T ko="당신이 누구든," en="Whoever you are," />
            <br />
            <T ko="콘텐츠는 한 번에 퍼집니다" en="content spreads in one shot" />
          </h1>
          <p className="mt-5 text-muted max-w-xl mx-auto">
            <T
              ko="혼자 일하는 크리에이터부터 여러 채널을 운영하는 팀까지 — 만들고, 다듬고, 퍼뜨리는 일을 한 곳에서."
              en="From solo creators to teams running many channels — make, polish, and spread it all in one place."
            />
          </p>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-6">
          {SEGMENTS.map((s) => (
            <div key={s.ko} className="border border-border rounded-[var(--radius-card)] p-6">
              <p className="text-xs font-black text-accent mb-2">
                <T ko={s.ko} en={s.en} />
              </p>
              <h3 className="font-black text-xl mb-2">
                <T ko={s.titleKo} en={s.titleEn} />
              </h3>
              <p className="text-sm text-muted mb-4">
                <T ko={s.descKo} en={s.descEn} />
              </p>
              <div className="flex flex-wrap gap-2">
                {s.tags.map((t) => (
                  <span key={t.ko} className="text-xs font-bold bg-accent-soft text-accent rounded-[var(--radius-pill)] px-3 py-1">
                    <T ko={t.ko} en={t.en} />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="bg-neutral-50 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 py-16">
            <h2 className="text-2xl font-black text-center mb-3">
              <T ko="어떤 사용자에게나 공통" en="The same for every user" />
            </h2>
            <p className="text-center text-muted mb-10">
              <T ko="누구든 안심하고 쓸 수 있도록" en="Built so anyone can use it with confidence" />
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {COMMON.map((c) => (
                <div key={c.ko} className="bg-white border border-border rounded-[var(--radius-card)] p-6">
                  <div className="font-bold mb-2">
                    <T ko={c.ko} en={c.en} />
                  </div>
                  <p className="text-sm text-muted">
                    <T ko={c.descKo} en={c.descEn} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="text-center py-16">
          <p className="font-bold mb-4">
            <T ko="지금 바로 시작해보세요" en="Get started right now" />
          </p>
          <Link href="/login" className="inline-block bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-8 py-4">
            <T ko="무료로 시작하기 →" en="Start free →" />
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
