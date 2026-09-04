import "./globals.css";
import TopNav from "@/components/TopNav";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { SITE_URL } from "@/lib/siteUrl";
import { buildOrganizationJsonLd } from "@/lib/structuredData";

// 🔴 `metadataBase` 가 있어야 상대경로(canonical 등)가 절대 URL 로 자동 변환된다.
//    주소는 `lib/siteUrl.ts` 한 곳에만 있다 — 여기에 문자열로 적지 말 것.
// ⚠️ 루트 metadata 는 랜딩(/)의 값이자 **하위에서 따로 지정하지 않은 화면의 기본값**
//    이기도 하다. 그래서 `/admin`·`/customer` 는 각자 layout 에서 openGraph·twitter 를
//    `null` 로 지워 이 값을 물려받지 않게 했다(그 두 곳은 링크 미리보기 대상이 아니다).
// title.template 은 일부러 쓰지 않는다(쓰면 하위 title 에 브랜드명이 이중으로 붙는다).
// 🔴 30차 리뷰에 취급 범위 표현이 **시안 문구**("1톤부터 5톤 이상, 특수차량까지")로 확정됐다(2026-08-31).
// 32차·34차의 "25톤을 쓰지 않는다"를 근거로 되돌리지 말 것 — `rate_distance_tiers` 에
// 25톤 행이 실재하고 차급이 11종이라 견적이 실제로 산출된다(52차).
// 🔴 "전 차종"·"모든 차량"은 여전히 금지다.
// ⚠️ "특수차량"은 **시안 확정 문구 안에서만** 허용된다 — 「1톤부터 5톤 이상, 특수차량까지」
//    형태여야 하고 **홀로 쓰면 안 된다**(31차에 정정된 기준, 61차 ② 참고).
export const metadata = {
  metadataBase: new URL(SITE_URL),
  ...buildPageMetadata({
    title: "위캐리 운송 | 화물 배차·운송 주선",
    description:
      "위캐리 운송에 상·하차지와 연락처만 남겨주시면 차량과 운임을 확인해 연락드립니다. 1톤부터 5톤 이상, 특수차량까지 배차합니다.",
    path: "/",
  }),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* 검색엔진용 구조화 데이터(JSON-LD). 화면에는 아무것도 그리지 않는다.
            🔴 **여기(루트)에 두는 것이 의도다.** 공개 화면마다 따로 붙이면 새 공개
               경로가 생길 때 빠뜨린다(`TopNav` 숨김 조건을 여러 번 빠뜨린 전례가 있다).
            ⚠️ `/admin`·`/customer` 에도 함께 실리지만 그 둘은 `noindex, nofollow` 라
               색인되지 않고, JSON-LD 는 카카오톡·슬랙 링크 미리보기가 읽는 값도 아니다
               (그래서 `openGraph` 처럼 하위에서 `null` 로 지울 이유가 없다).
            🔴 `<` 를 이스케이프하는 것은 값에 `</script>` 가 섞여 태그가 끊기는 것을
               막는 표준 방어다 — 지금 값은 전부 우리 상수뿐이지만 빼지 말 것. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildOrganizationJsonLd()).replace(
              /</g,
              "\\u003c"
            ),
          }}
        />
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
