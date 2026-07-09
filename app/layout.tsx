import "./globals.css";

export const metadata = {
  title: "B2B 화물운송 통합 운영 시스템",
  description: "화주 CRM · 견적 · 배차 · 정산 통합 관리",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="top-nav">
          <div className="top-nav-inner">
            <div>
              <div className="brand">B2B 화물운송 통합 운영 시스템</div>
              <div className="brand-sub">내부 관리자 (admin)</div>
            </div>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
