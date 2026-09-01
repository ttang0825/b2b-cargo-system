export const metadata = {
  title: "내부관리 | WeCarry 운송 운영 시스템",
  // 내부 관리 화면은 검색엔진에 색인되면 안 됨(프라이버시). robots.txt는 크롤 차단일
  // 뿐 검색결과 삭제를 보장하지 않으므로 이 metadata noindex가 핵심 방어선이고,
  // app/robots.ts의 Disallow는 보조임 — 둘 다 유지할 것
  robots: { index: false, follow: false },
  // 🔴 루트 layout 의 OG·트위터 카드를 **물려받지 않게 지운다.** 관리자 화면은 링크
  //    미리보기 대상이 아니고, 물려받으면 내부 주소를 카톡·슬랙에 붙였을 때 공개
  //    사이트 미리보기가 뜬다. noindex(검색 색인)와는 별개 축이니 둘 다 유지할 것.
  openGraph: null,
  twitter: null,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
