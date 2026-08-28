import Link from 'next/link';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import { T } from '../lib/i18n';

const TOOLS = [
  {
    slug: 'multi-publisher',
    ko: '원샷배포 · Multi Publisher',
    en: 'Multi Publisher',
    titleKo: '딸깍 한 번으로 6개 SNS 동시 업로드',
    titleEn: 'One click, 6 social uploads at once',
    descKo:
      '유튜브에서 반응이 없던 영상이 틱톡·스레드에서는 100만 조회수가 되기도 합니다. 파일 하나만 올리면 유튜브·인스타·틱톡·페이스북·X·스레드 6곳에 동시에 발행됩니다.',
    descEn:
      "A video that got no traction on YouTube can reach a million views on TikTok or Threads. Upload one file and it publishes to all 6 at once.",
  },
  {
    slug: 'cut-daeri',
    ko: '컷대리 · Cut Daeri',
    en: 'Cut Daeri',
    titleKo: '편집 기술이 없어도 괜찮습니다',
    titleEn: 'No editing skills needed',
    descKo: '좋은 아이디어가 영상이 되지 못하는 건 게으름이 아니라 편집의 장벽 때문입니다. 원고가 그대로 영상이 됩니다.',
    descEn: "Great ideas stay hidden because of the editing barrier — your script becomes video as-is.",
  },
  {
    slug: 'truth-room',
    ko: '진실의방 · Truth Room',
    en: 'Truth Room',
    titleKo: '1시간 티타임을 기다릴 필요 없습니다',
    titleEn: 'No need to wait for a 1-hour meeting',
    descKo: '단순한 챗봇이 아닙니다. 창업자의 철학과 비즈니스 전략, 솔직한 화법까지 담아낸 AI 파트너입니다.',
    descEn: 'Not just a chatbot — an AI partner shaped by the founder\'s philosophy and candid voice.',
  },
  {
    slug: 'butena',
    ko: '부테나 · Butena',
    en: 'Butena',
    titleKo: '우연히 터진 게 아닙니다',
    titleEn: "It didn't blow up by accident",
    descKo: '무명에서 성장한 영상들에는 분명한 공통점이 있습니다. 부테나가 선별한 사례를 살펴보세요.',
    descEn: 'Videos that grew from obscurity share clear patterns — browse curated examples.',
  },
  {
    slug: 'long-daeri',
    ko: '롱대리 · Long Daeri',
    en: 'Long Daeri',
    titleKo: '글쓰기가 어렵다면, 맡기세요',
    titleEn: 'Struggling with writing? Leave it to us',
    descKo: '글쓰기가 막막하신가요? 원고는 롱대리가 대신 씁니다.',
    descEn: 'Stuck on writing? Long Daeri drafts it for you.',
  },
  {
    slug: 'short-daeri',
    ko: '숏대리 · Short Daeri',
    en: 'Short Daeri',
    titleKo: '10분짜리 영상 하나 찍고 끝내십니까?',
    titleEn: 'Just one 10-minute video and done?',
    descKo: '잘 쓴 롱폼 원고 하나면 한 달 치 쇼츠 대본이 나옵니다. 긴 글을 몰입도 높은 1분짜리 대본 여러 편으로 나눠 드립니다.',
    descEn: 'One good long-form script yields a month of shorts.',
  },
  {
    slug: '8-angle',
    ko: '사방팔방 · 8-Angle Image',
    en: '8-Angle Image',
    titleKo: '한 장의 원본으로 8개의 다양한 앵글',
    titleEn: '8 varied angles from a single image',
    descKo: '여러 앵글을 얻으려 이미지를 일일이 수정하던 밤샘은 끝났습니다. 원본 한 장으로 8개의 앵글을 자동 생성합니다.',
    descEn: 'From a single image, auto-generate 8 angles while preserving the original style.',
  },
  {
    slug: 'thumbnail-ab',
    ko: '썸네일 이상형 월드컵 · Thumbnail A/B',
    en: 'Thumbnail A/B',
    titleKo: '잘되는 채널의 비밀은 A/B 테스트',
    titleEn: 'The secret of successful channels is A/B testing',
    descKo: '초보는 썸네일 하나에 승부를 걸지만, 프로는 여러 개를 시험해 가장 반응 좋은 것을 고릅니다.',
    descEn: 'Beginners bet on one thumbnail; pros test several and keep the best performer.',
  },
  {
    slug: 'upload-rx',
    ko: '업로드 처방전 · Upload Rx',
    en: 'Upload Rx',
    titleKo: '제목과 썸네일이 밋밋하면 조회수가 오르지 않습니다',
    titleEn: 'Bland titles and thumbnails hold your views back',
    descKo: '키워드만 입력하면 타깃 시청자의 클릭을 부르는 제목과 카피를 만들어 드립니다. 설명과 해시태그도 함께.',
    descEn: "Enter a keyword and we'll craft titles and copy that earn clicks — description and hashtags included.",
  },
];

const FOR_WHO = [
  { icon: '🎬', ko: '1인 크리에이터', en: 'Solo creators' },
  { icon: '🏪', ko: '소상공인', en: 'Small business' },
  { icon: '📣', ko: '브랜드 · 마케터', en: 'Brands & marketers' },
  { icon: '👥', ko: '대행사', en: 'Agencies' },
];

const FAQS = [
  {
    qKo: '무료로 쓸 수 있나요?',
    qEn: 'Is it free to use?',
    aKo: '네. 원샷배포 월 2회로 무료로 시작할 수 있고, 이미지·동영상·음성 제작이 필요하면 유료 플랜으로 업그레이드하면 됩니다.',
    aEn: 'Yes — start free with 2 Multi Publisher posts per month. Upgrade when you need image, video or voice creation.',
  },
  {
    qKo: '어떤 SNS를 지원하나요?',
    qEn: 'Which platforms are supported?',
    aKo: 'YouTube, TikTok, Instagram, Facebook, Threads, X.',
    aEn: 'YouTube, TikTok, Instagram, Facebook, Threads, and X.',
  },
  {
    qKo: '내 계정에 직접 올라가나요?',
    qEn: 'Is content posted to my own account?',
    aKo: '네. 본인이 연동한 계정에 공식 API로 게시되며, 발행 전 사용자가 직접 확인합니다.',
    aEn: 'Yes — published to your own connected accounts via official APIs, confirmed by you before posting.',
  },
  {
    qKo: '제 데이터는 안전한가요?',
    qEn: 'Is my data safe?',
    aKo: 'OAuth 토큰은 암호화 저장되며 업로드 목적 외 사용하거나 제3자에게 제공하지 않습니다. 연동 해제 시 즉시 삭제됩니다.',
    aEn: 'OAuth tokens are encrypted, never sold or shared, and used only for publishing. Deleted immediately on disconnect.',
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
          <p className="text-sm font-bold text-accent mb-4">
            <T ko="여러 개 쓰고 계시죠? 그거 하나로 합쳐드릴게요." en="Using a dozen tools? We bring them into one." />
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            <T ko="AI 올인원," en="All-in-one AI —" />
            <br />
            <T ko="구독 더 늘리지 마세요." en="stop piling up subscriptions." />
          </h1>
          <p className="mt-6 text-lg text-muted max-w-2xl mx-auto">
            <T
              ko="영상 생성부터 6개 플랫폼 동시 업로드까지. 흩어진 툴들, U-OneShot 하나로 정리합니다."
              en="From video creation to publishing across 6 platforms at once — U-OneShot brings your scattered tools together."
            />
          </p>
          <Link
            href="/login"
            className="inline-block mt-8 bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-8 py-4 hover:bg-accent-hover"
          >
            <T ko="무료로 시작하기 →" en="Start free →" />
          </Link>
          <p className="mt-3 text-xs text-muted">
            <T ko="베타 테스트 기간" en="Beta period" />
          </p>
        </section>


        {/* Tools */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-2xl md:text-3xl font-black text-center">
            <T ko="영상 제작의 모든 것, 10개의 AI 도구" en="Everything for video creation — 10 AI tools" />
          </h2>
          <p className="text-center text-muted mt-3 max-w-2xl mx-auto">
            <T
              ko="기획·대본·편집·이미지·작곡·썸네일·발행까지, 흩어진 작업을 U-OneShot 하나로."
              en="Planning, scripts, editing, images, music, thumbnails, publishing — all in one place."
            />
          </p>
          <div className="grid md:grid-cols-3 gap-5 mt-12">
            {TOOLS.map((tool) => (
              <div key={tool.slug} className="border border-border rounded-[var(--radius-card)] p-6 hover:border-accent transition-colors">
                <div className="text-xs font-black text-accent mb-2">
                  <T ko={tool.ko} en={tool.en} />
                </div>
                <div className="font-bold mb-2">
                  <T ko={tool.titleKo} en={tool.titleEn} />
                </div>
                <p className="text-sm text-muted">
                  <T ko={tool.descKo} en={tool.descEn} />
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Multi publisher spotlight */}
        <section className="bg-accent-soft border-y border-border">
          <div className="max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs font-black text-accent mb-2">
                <T ko="원샷배포 · Multi Publisher" en="Multi Publisher" />
              </p>
              <h2 className="text-3xl font-black mb-4">
                <T ko="딸깍 한 번으로 6개 SNS 동시 업로드" en="One click, 6 social uploads at once" />
              </h2>
              <p className="text-muted mb-6">
                <T
                  ko="공식 로그인(OAuth)으로 계정을 연동하고, 발행 전 사용자가 직접 확인 후 공식 API로 본인 계정에 바로 게시합니다."
                  en="Connect via official OAuth login, confirm before publishing — posts go straight to your own account through official APIs."
                />
              </p>
              <div className="flex gap-3">
                <Link href="/platforms" className="text-sm font-bold text-accent hover:underline">
                  <T ko="플랫폼별 자세히 보기 →" en="See each platform in detail →" />
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {['TikTok', 'YouTube', 'Instagram', 'Facebook', 'Threads', 'X'].map((p) => (
                <span key={p} className="bg-white border border-border rounded-[var(--radius-pill)] px-4 py-2 text-sm font-bold">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* For who */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-12">
            <T ko="누구를 위한 서비스인가요?" en="Who it's for" />
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {FOR_WHO.map((f) => (
              <div key={f.ko} className="text-center border border-border rounded-[var(--radius-card)] p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <div className="font-bold text-sm">
                  <T ko={f.ko} en={f.en} />
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/for" className="text-sm font-bold text-accent hover:underline">
              <T ko="이런 분께 보기 →" en="Explore by who you are →" />
            </Link>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="bg-neutral-50 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 py-20 text-center">
            <h2 className="text-2xl md:text-3xl font-black mb-4">
              <T ko="요금제" en="Pricing" />
            </h2>
            <p className="text-muted mb-8 max-w-xl mx-auto">
              <T
                ko="무료 플랜: 원샷배포 월 2회로 시작하세요. 이미지·동영상·음성 제작은 유료 구독 플랜에서 월간 제공량으로 사용할 수 있습니다."
                en="Free plan: start with 2 Multi Publisher posts per month. Image, video and voice creation come with monthly allowances on paid plans."
              />
            </p>
            <Link href="/pricing" className="text-sm font-bold text-accent hover:underline">
              <T ko="요금제 자세히 보기 →" en="See full pricing →" />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-20">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-12">
            <T ko="자주 묻는 질문" en="Frequently asked questions" />
          </h2>
          <div className="space-y-6">
            {FAQS.map((f) => (
              <div key={f.qKo} className="border-b border-border pb-6">
                <div className="font-bold mb-2">
                  <T ko={f.qKo} en={f.qEn} />
                </div>
                <p className="text-sm text-muted">
                  <T ko={f.aKo} en={f.aEn} />
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center py-20 px-4">
          <h2 className="text-2xl md:text-3xl font-black mb-3">
            <T ko="편집으로 밤새우던 나날들, 오늘부로 끝내세요" en="Stop burning your nights on editing — end it today" />
          </h2>
          <p className="text-muted mb-8">
            <T ko="회원가입도 필요 없이 Google 로그인으로 바로 시작됩니다." en="No sign-up forms — start right away with Google login." />
          </p>
          <Link
            href="/login"
            className="inline-block bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-8 py-4 hover:bg-accent-hover"
          >
            <T ko="무료로 시작하기 →" en="Start free →" />
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
