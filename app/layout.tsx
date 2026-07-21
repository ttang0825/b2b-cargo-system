import "./globals.css";
import TopNav from "@/components/TopNav";

export const metadata = {
  title: "WeCarry 운송 통합 운영 시스템",
  description: "화주 CRM · 견적 · 배차 · 정산 통합 관리",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* 본문 - SUIT (한글+영문 자체 지원) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/variable/woff2/SUIT-Variable.css"
        />
        {/* 타이틀/브랜드 포인트용 - Space Grotesk */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
