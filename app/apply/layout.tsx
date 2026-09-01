import { buildPageMetadata } from "@/lib/pageMetadata";

// 🔴 제목·설명은 여기 한 곳뿐이다 — `buildPageMetadata` 가 같은 값을 OG·트위터
//    카드·canonical 에 함께 넣는다. og: 쪽에 따로 적지 말 것.
export const metadata = buildPageMetadata({
  title: "운송관리 계정 신청 | 위캐리 운송",
  description:
    "등록하시면 견적·배차·정산 내역을 언제든 확인하실 수 있습니다.",
  path: "/apply",
});

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
