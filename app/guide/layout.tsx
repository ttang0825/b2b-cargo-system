// 26차 메타 규칙: 공개 페이지는 title 뿐 아니라 description 도 각자 지정할 것
// (안 적으면 루트 layout 의 description 을 그대로 상속받는다).
import { buildPageMetadata } from "@/lib/pageMetadata";

// 🔴 제목·설명은 여기 한 곳뿐이다 — `buildPageMetadata` 가 같은 값을 OG·트위터 카드·
//    canonical 에 함께 넣는다. og: 쪽에 따로 적지 말 것.
// 🔴 설명은 80자 이내여야 한다(`DESCRIPTION_MAX_LENGTH`) — 넘으면 빌드 로그에 경고가
//    남고 네이버 서치어드바이저 「간단체크」가 두 항목에 경고를 낸다.
// 🟢 색인 허용이다 — 공개 안내 화면이라 `robots` 를 따로 끄지 않는다(루트 설정 상속).
export const metadata = buildPageMetadata({
  title: "운송관리 이용안내 | 위캐리 운송",
  description:
    "위캐리 운송관리 시스템 이용안내입니다. 계정 신청, 첫 로그인, 앱 설치, 발주와 정산 확인 방법을 안내합니다.",
  path: "/guide",
});

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
