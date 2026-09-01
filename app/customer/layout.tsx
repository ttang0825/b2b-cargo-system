import CustomerPortalShell from "./CustomerPortalShell";

export const metadata = {
  title: "운송관리 | 위캐리 운송",
  // 화주포털도 admin과 동일하게 색인 차단(원칙: 로그인이 필요한 화면은 검색 노출 대상 아님)
  robots: { index: false, follow: false },
  // 🔴 루트 OG 를 물려받지 않게 지운다(admin 과 같은 이유).
  // ⚠️ **`/customer/login` 만 예외다** — 랜딩에서 넘어오는 공개 진입 화면이라 링크
  //    미리보기가 필요하다. 그 화면은 `login/layout.tsx` 에서 OG 를 따로 넣고,
  //    noindex 는 여기서 물려받아 그대로 유지한다(두 축은 서로 독립이다).
  openGraph: null,
  twitter: null,
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <CustomerPortalShell>{children}</CustomerPortalShell>;
}
