import CustomerPortalShell from "./CustomerPortalShell";

export const metadata = {
  title: "화주포털 | WeCarry 운송",
  // 화주포털도 admin과 동일하게 색인 차단(원칙: 로그인이 필요한 화면은 검색 노출 대상 아님)
  robots: { index: false, follow: false },
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <CustomerPortalShell>{children}</CustomerPortalShell>;
}
