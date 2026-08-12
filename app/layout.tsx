import "./globals.css";
import TopNav from "@/components/TopNav";

// 루트 metadata는 랜딩(/)의 값이자, 하위에서 따로 지정하지 않은 페이지의 기본값이기도 함.
// 기존 description("화주 CRM · 견적 · 배차 · 정산 통합 관리")은 내부 시스템 설명이라
// /quote·/apply 같은 공개 페이지가 이걸 그대로 상속받고 있었음 — 공개용 문구로 교체함.
// title.template은 일부러 쓰지 않음(쓰면 하위 title에 브랜드명이 이중으로 붙음).
export const metadata = {
  title: "위캐리 운송 | B2B 화물 배차·운송 주선",
  description:
    "정기 납품, 긴급 출고, 창고 이동. 1톤부터 5톤까지 화물 배차를 연결합니다. 화물자동차 운송주선사업 정식 허가업체.",
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
