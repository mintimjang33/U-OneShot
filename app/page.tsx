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
    slug: 'cut-secretary',
    ko: '컷비서 · Cut Secretary',
    en: 'Cut Secretary',
    titleKo: '편집 몰라도 대본 하나면 충분해요',
    titleEn: "Don't know editing? A script is all you need",
    descKo: '주제나 원고를 넣으면 컷 단위로 쪼개고, 장면 이미지와 나레이션까지 붙여서 영상으로 완성해 드립니다.',
    descEn: 'Feed in a topic or script and get it split into cuts, then illustrated and narrated into a finished video.',
  },
  {
    slug: 'candid-room',
    ko: '직언의방 · Candid Room',
    en: 'Candid Room',
    titleKo: '듣기 좋은 말고 말고, 진짜 조언',
    titleEn: 'Not pleasant words — real advice',
    descKo: '막연한 응원 대신, 지금 당장 시도해볼 다음 행동까지 짚어주는 AI 조언 파트너입니다.',
    descEn: 'Instead of vague encouragement, an AI partner that points to the next concrete action.',
  },
  {
    slug: 'viral-archive',
    ko: '떡상레이더 · Viral Radar',
    en: 'Viral Radar',
    titleKo: '무명에서 터진 데는 이유가 있습니다',
    titleEn: "Breakout hits don't happen by luck",
    descKo: '조회수는 낮았던 채널에서 갑자기 터진 영상들을 모아, 공통된 패턴을 살펴볼 수 있게 해드립니다.',
    descEn: 'Browse videos that broke out from small channels and spot the patterns they share.',
  },
  {
    slug: 'longform-secretary',
    ko: '롱폼비서 · Longform Secretary',
    en: 'Longform Secretary',
    titleKo: '글쓰기가 막막할 때 대신 써드립니다',
    titleEn: "When writing feels impossible, we'll draft it",
    descKo: '주제 하나만 주시면 도입-전개-마무리를 갖춘 원고를 대신 씁니다.',
    descEn: 'Give us one topic and we draft a full piece with a beginning, middle, and end.',
  },
  {
    slug: 'shortform-secretary',
    ko: '숏폼비서 · Shortform Secretary',
    en: 'Shortform Secretary',
    titleKo: '긴 원고 하나가 숏폼 여러 편이 됩니다',
    titleEn: 'One long draft becomes several shorts',
    descKo: '롱폼 원고 하나를 몰입감 있는 1분짜리 대본 여러 편으로 재구성해 드립니다.',
    descEn: 'Reworks one long-form draft into several punchy one-minute scripts.',
  },
  {
    slug: 'every-angle',
    ko: '요모조모 · Every Angle',
    en: 'Every Angle',
    titleKo: '한 장의 사진, 여러 각도로',
    titleEn: 'One photo, many angles',
    descKo: '이미지를 일일이 다시 찍거나 수정할 필요 없이, 원본 한 장으로 다양한 카메라 앵글의 이미지를 만들어 드립니다.',
    descEn: 'No need to reshoot or edit by hand — get multiple camera angles from a single source image.',
  },
  {
    slug: 'thumbnail-remix',
    ko: '썸네일 리믹스 · Thumbnail Remix',
    en: 'Thumbnail Remix',
    titleKo: '썸네일 하나에 다 걸지 마세요',
    titleEn: "Don't bet everything on one thumbnail",
    descKo: '여러 개를 만들어서 겨뤄보고, 그중 가장 반응 좋을 것 같은 걸 고르세요.',
    descEn: 'Make several variants, put them head to head, and pick the one most likely to win clicks.',
  },
  {
    slug: 'upload-clinic',
    ko: '업로드 클리닉 · Upload Clinic',
    en: 'Upload Clinic',
    titleKo: '제목이 밋밋하면 조회수가 안 붙습니다',
    titleEn: 'A bland title means views won\'t come',
    descKo: '키워드만 알려주시면 클릭을 부르는 제목 후보와 설명, 해시태그까지 한 번에 만들어 드립니다.',
    descEn: "Give us a keyword and we'll draft click-worthy titles, a description, and hashtags in one go.",
  },
  {
    slug: 'lyrics-secretary',
    ko: '가사비서 · Lyrics Secretary',
    en: 'Lyrics Secretary',
    titleKo: '멜로디는 있는데 가사가 안 써질 때',
    titleEn: "Got a melody but stuck on lyrics?",
    descKo: '주제와 장르만 고르면 가사를 써드리고, SUNO 같은 AI 작곡 서비스에 바로 넣을 수 있는 프롬프트까지 함께 드립니다.',
    descEn: 'Pick a theme and genre and get lyrics plus a ready-to-use prompt for AI music tools like Suno.',
  },
  {
    slug: 'reading-box',
    ko: '리딩박스 · Reading Box',
    en: 'Reading Box',
    titleKo: '써둔 원고, 눈으로 말고 귀로 확인하세요',
    titleEn: 'Hear your script, not just read it',
    descKo: '대본을 저장해두고 클릭 한 번이면 음성으로 들어볼 수 있어서, 톤이 어색한지 바로 확인할 수 있습니다.',
    descEn: 'Save a script and play it back with one click to catch anything that sounds off before you record.',
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
            <T ko="여기저기 흩어진 채널 관리, 이제 그만하셔도 됩니다." en="Stop juggling tools across every channel." />
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            <T ko="영상 제작 AI," en="Your video AI —" />
            <br />
            <T ko="이제 하나로 끝내세요." en="all in one workspace." />
          </h1>
          <p className="mt-6 text-lg text-muted max-w-2xl mx-auto">
            <T
              ko="대본 쓰기부터 6개 SNS 동시 발행까지 — 여러 구독 대신 U-OneShot 하나로 끝냅니다."
              en="From scripting to publishing on 6 platforms at once — replace a stack of subscriptions with U-OneShot."
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
            <T ko="영상 제작 전 과정을 커버하는 11개의 AI 도구" en="11 AI tools covering the entire video workflow" />
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
