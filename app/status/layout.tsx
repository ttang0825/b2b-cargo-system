export const metadata = {
  title: "문의 현황 조회 | 위캐리 운송",
  description: "전화번호로 견적 문의와 등록 신청 진행 상황을 확인하실 수 있습니다.",
  // /status는 입력폼과 조회결과가 같은 라우트에서 상태만 바뀌는 구조라 둘을 분리해
  // 색인할 방법이 없고, 애초에 검색 유입을 받을 콘텐츠가 아니라 기존 고객이 링크·
  // 메뉴로 직접 들어오는 조회 도구라 전체 noindex로 확정(색인 손실 사실상 없음).
  // noindex여도 브라우저 탭·링크 공유 시 보이므로 title/description은 그대로 지정함
  robots: { index: false, follow: false },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
