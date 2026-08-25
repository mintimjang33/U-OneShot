'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type Lang = 'ko' | 'en';

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'ko',
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ko');
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

// 원본 buronai.com처럼 한국어/영어 문장 쌍을 그대로 들고 있다가 토글에 따라 보여준다(지어낸 번역 없음).
export function T({ ko, en }: { ko: string; en: string }) {
  const { lang } = useLang();
  return <>{lang === 'ko' ? ko : en}</>;
}
