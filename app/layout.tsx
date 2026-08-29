import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "../lib/i18n";

export const metadata: Metadata = {
  title: "U-OneShot — 영상 제작부터 6개 플랫폼 발행까지 한 곳에서",
  description: "대본·이미지·발행까지 흩어진 영상 제작 툴을 U-OneShot 하나로 모았습니다.",
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
