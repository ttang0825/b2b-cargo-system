import "./globals.css";
import TopNav from "@/components/TopNav";

export const metadata = {
  title: "EGG 운송 통합 운영 시스템",
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
        <TopNav />
        {children}
      </body>
    </html>
  );
}
