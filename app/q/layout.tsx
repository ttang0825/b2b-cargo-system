// 견적서 공유 링크 (2026-09-15 · 사용자 지시).
//
// 🔴 **색인 차단이 이 레이아웃의 존재 이유다.** 이 아래 화면은 특정 화주의 상호·구간·
//    금액을 담는다 — 검색에 걸리면 토큰이 있으나 마나다.
//    ⚠️ 방어선이 둘이고 **둘 다 있어야 한다**(원칙: robots.txt 는 크롤 차단일 뿐
//       이미 색인된 결과의 삭제를 보장하지 않는다):
//         ① 여기의 `robots: { index: false, follow: false }`  ← 핵심
//         ② `app/robots.ts` 의 `disallow`                      ← 보조
//
// 🔴 **루트 OG 를 물려받지 않게 지운다**(`/admin`·`/customer` 와 같은 이유) —
//    문자로 받은 링크를 카톡에 붙였을 때 회사 소개 카드가 뜨는 것이 이상하고,
//    무엇보다 **미리보기가 생기면 견적서 존재 자체가 새어 나간다.**
//
// ⚠️ `app/sitemap.ts` 는 동적 세그먼트(`[token]`)를 건너뛰고 `/q` 에는 `page.tsx` 가
//    없으므로 **사이트맵에 저절로 안 들어간다** — 손댈 것이 없다.
export const metadata = {
  title: "견적서 | 위캐리 운송",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function QuoteShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
