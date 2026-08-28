import { Fragment } from 'react';
import Link from 'next/link';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import { T } from '../../lib/i18n';

const PLANS = [
  {
    id: 'free',
    ko: '무료',
    en: 'Free',
    price: 'Free',
    priceSuffix: { ko: '/월', en: '/mo' },
    taglineKo: 'U-OneShot을 처음 경험해보세요',
    taglineEn: 'Get your first taste of U-OneShot',
    ctaKo: '무료로 시작',
    ctaEn: 'Start free',
    includesKo: '무료 제공 기능:',
    includesEn: 'Included for free:',
    features: [{ ko: '원샷배포 월 2회', en: 'Multi Publisher 2x/month' }],
  },
  {
    id: 'lite',
    ko: '라이트',
    en: 'Lite',
    price: '$6.99',
    priceSuffix: { ko: '/월', en: '/mo' },
    taglineKo: '원샷배포 알뜰하게 사용하기',
    taglineEn: 'Multi Publisher, budget-friendly',
    ctaKo: '구독하기',
    ctaEn: 'Subscribe',
    includesKo: 'Free의 모든 기능 포함:',
    includesEn: 'Everything in Free, plus:',
    features: [{ ko: '원샷배포 하루 1회', en: 'Multi Publisher 1x/day' }],
  },
  {
    id: 'standard',
    ko: '스탠다드',
    en: 'Standard',
    price: '$19.99',
    priceSuffix: { ko: '/월', en: '/mo' },
    taglineKo: '꾸준함이 실력입니다',
    taglineEn: 'Consistency is the skill',
    ctaKo: '구독하기',
    ctaEn: 'Subscribe',
    includesKo: 'Lite의 모든 기능 포함:',
    includesEn: 'Everything in Lite, plus:',
    features: [
      { ko: '원샷배포 하루 3회', en: 'Multi Publisher 3x/day' },
      { ko: '이미지 월 60장', en: 'Images 60/month' },
      { ko: '동영상 월 30회', en: 'Videos 30/month' },
      { ko: '음성 월 5,000자', en: 'Voice 5,000 chars/month' },
    ],
  },
  {
    id: 'pro',
    ko: '프로',
    en: 'Pro',
    price: '$49.99',
    priceSuffix: { ko: '/월', en: '/mo' },
    taglineKo: '취미가 아니라 수익입니다',
    taglineEn: "It's revenue, not a hobby",
    ctaKo: '구독하기',
    ctaEn: 'Subscribe',
    includesKo: 'Standard의 모든 기능 포함:',
    includesEn: 'Everything in Standard, plus:',
    features: [
      { ko: '원샷배포 하루 10회', en: 'Multi Publisher 10x/day' },
      { ko: '이미지 월 200장', en: 'Images 200/month' },
      { ko: '동영상 월 90회', en: 'Videos 90/month' },
      { ko: '음성 월 20,000자', en: 'Voice 20,000 chars/month' },
    ],
    popular: true,
  },
];

const LIMIT_ROWS: { label: { ko: string; en: string }; values: string[]; group?: string }[] = [
  { group: '제작 (상한)', label: { ko: '이미지', en: 'Images' }, values: ['—', '—', '60장', '200장'] },
  { label: { ko: '동영상', en: 'Video' }, values: ['—', '—', '30회', '90회'] },
  { label: { ko: '음성 (TTS)', en: 'Voice (TTS)' }, values: ['—', '—', '5,000자', '20,000자'] },
  { group: '원고 · 리서치', label: { ko: '직언의방', en: 'Candid Room' }, values: ['—', '∞', '∞', '∞'] },
  { label: { ko: '떡상레이더 검색', en: 'Viral Radar search' }, values: ['∞', '∞', '∞', '∞'] },
  { label: { ko: '떡상레이더 분석', en: 'Viral Radar analysis' }, values: ['—', '∞', '∞', '∞'] },
  { label: { ko: '롱폼비서 · 숏폼비서', en: 'Longform/Shortform Secretary' }, values: ['—', '∞', '∞', '∞'] },
  { label: { ko: '가사비서', en: 'Lyrics Secretary' }, values: ['—', '∞', '∞', '∞'] },
  { label: { ko: '업로드 클리닉', en: 'Upload Clinic' }, values: ['—', '∞', '∞', '∞'] },
  { group: '원샷배포 (배포)', label: { ko: '원샷배포', en: 'Multi Publisher' }, values: ['2회/월', '1회/일', '3회/일', '10회/일'] },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 pt-16 pb-10 text-center">
          <p className="text-xs font-black text-accent mb-3">
            <T ko="멤버십 · MEMBERSHIP PLANS" en="MEMBERSHIP PLANS" />
          </p>
          <h1 className="text-3xl md:text-4xl font-black">
            <T ko="창작 규모에 맞는 최적의 엔진을 선택하세요" en="Pick the engine that matches your scale" />
          </h1>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-16 grid md:grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative border rounded-[var(--radius-card)] p-6 flex flex-col ${
                plan.popular ? 'border-accent shadow-lg' : 'border-border'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-black rounded-[var(--radius-pill)] px-3 py-1">
                  <T ko="인기" en="Popular" />
                </span>
              )}
              <div className="text-sm font-black text-muted">
                <T ko={plan.ko} en={plan.en} />
              </div>
              <div className="text-3xl font-black mt-2">
                {plan.price}
                <span className="text-sm font-medium text-muted">
                  <T ko={plan.priceSuffix.ko} en={plan.priceSuffix.en} />
                </span>
              </div>
              <p className="text-xs text-muted mt-2 mb-5">
                <T ko={plan.taglineKo} en={plan.taglineEn} />
              </p>
              <Link
                href={plan.id === 'free' ? '/login' : `/purchase?tier=${plan.id}`}
                className={`text-center text-sm font-bold rounded-[var(--radius-card-sm)] py-2.5 mb-6 ${
                  plan.popular ? 'bg-accent text-white' : 'border border-border'
                }`}
              >
                <T ko={plan.ctaKo} en={plan.ctaEn} />
              </Link>
              <p className="text-xs font-bold text-muted mb-3">
                <T ko={plan.includesKo} en={plan.includesEn} />
              </p>
              <ul className="space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f.ko} className="flex gap-2">
                    <span className="text-accent">✓</span>
                    <T ko={f.ko} en={f.en} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="bg-neutral-50 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 py-16">
            <h2 className="text-xl font-black text-center mb-1">
              <T ko="서비스별 제공 한도 비교" en="Service limits by plan" />
            </h2>
            <p className="text-center text-muted text-sm mb-8">
              <T ko="요금제별 월간 한도" en="Monthly limits per plan" />
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 font-bold"></th>
                    {PLANS.map((p) => (
                      <th key={p.id} className="text-center py-3 font-bold">
                        <T ko={p.ko} en={p.en} />
                        <div className="text-xs font-normal text-muted">{p.price}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LIMIT_ROWS.map((row, i) => (
                    <Fragment key={i}>
                      {row.group && (
                        <tr>
                          <td colSpan={5} className="pt-6 pb-2 text-xs font-black text-accent">
                            {row.group}
                          </td>
                        </tr>
                      )}
                      <tr className="border-b border-border/60">
                        <td className="py-2.5 text-muted">
                          <T ko={row.label.ko} en={row.label.en} />
                        </td>
                        {row.values.map((v, j) => (
                          <td key={j} className="text-center py-2.5 font-medium">
                            {v}
                          </td>
                        ))}
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-center text-xs text-muted mt-6">
              <T
                ko="※ 원샷배포와 원고·리서치는 제작 상한과 무관하게 사용합니다. ※"
                en="※ Multi Publisher and script/research tools are independent of the creation limits above. ※"
              />
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
