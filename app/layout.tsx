import "./globals.css";
import Link from "next/link";

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
          <div
            className="top-nav-inner"
            style={{ flexWrap: "wrap", gap: 16 }}
          >
            <div>
              <div className="brand">B2B 화물운송 통합 운영 시스템</div>
              <div className="brand-sub">내부 관리자 (admin)</div>
            </div>
            <nav style={{ display: "flex", gap: 18, fontSize: 13.5 }}>
              <Link href="/admin/companies">화주 관리 (영업)</Link>
              <Link href="/admin/customers">활성 화주 (CRM)</Link>
            </nav>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
