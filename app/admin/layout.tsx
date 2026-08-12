export const metadata = {
  title: "내부관리 | WeCarry 운송 운영 시스템",
  // 내부 관리 화면은 검색엔진에 색인되면 안 됨(프라이버시). robots.txt는 크롤 차단일
  // 뿐 검색결과 삭제를 보장하지 않으므로 이 metadata noindex가 핵심 방어선이고,
  // app/robots.ts의 Disallow는 보조임 — 둘 다 유지할 것
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
