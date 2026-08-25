import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "../lib/i18n";

export const metadata: Metadata = {
  title: "U-OneShot — AI 올인원, 6개 플랫폼 한 번에 발행",
  description: "영상 생성부터 6개 플랫폼 동시 업로드까지, 흩어진 툴들을 하나로.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
