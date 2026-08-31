import "./globals.css";
import TopNav from "@/components/TopNav";

// 루트 metadata는 랜딩(/)의 값이자, 하위에서 따로 지정하지 않은 페이지의 기본값이기도 함.
// 기존 description("화주 CRM · 견적 · 배차 · 정산 통합 관리")은 내부 시스템 설명이라
// /quote·/apply 같은 공개 페이지가 이걸 그대로 상속받고 있었음 — 공개용 문구로 교체함.
// title.template은 일부러 쓰지 않음(쓰면 하위 title에 브랜드명이 이중으로 붙음).
// 🔴 30차 리뷰에 취급 범위 표현이 **시안 문구**("1톤부터 5톤 이상, 특수차량까지")로 확정됐다(2026-08-31).
// 32차·34차의 "25톤을 쓰지 않는다"를 근거로 되돌리지 말 것 — `rate_distance_tiers` 에
// 25톤 행이 실재하고 차급이 11종이라 견적이 실제로 산출된다(52차).
// 🔴 "전 차종"·"모든 차량"·"특수차량"은 여전히 금지다.
export const metadata = {
  title: "위캐리 운송 | 화물 배차·운송 주선",
  description:
    "1톤부터 5톤 이상, 특수차량까지, 상·하차지와 연락처만 남겨주시면 차량과 운임을 확인해 연락드립니다. 견적부터 정산까지 기록으로 남는 화물 배차 주선. 정식 허가업체(제180254호).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* 본문 - SUIT (한글+영문 자체 지원) — 관리자·공개 화면 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/variable/woff2/SUIT-Variable.css"
        />
        {/* 화주 운송관리 포털 전용 — 시안이 쓰는 서체다(26차).
            🔴 **dynamic subset 판이다.** 통짜 Variable 이 아니라 실제로 쓰는 글자만
               내려받으므로 용량 부담이 작다. 파일명의 `-dynamic-subset` 을 지우지 말 것.
            🔴 이 링크만 추가한다고 서체가 바뀌지는 않는다 — 적용은 `globals.css` 의
               `.portal-v2` 스코프에서만 한다(전역 `--font-sans` 는 그대로 SUIT). */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
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
