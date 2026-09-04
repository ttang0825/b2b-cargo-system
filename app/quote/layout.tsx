import { buildPageMetadata } from "@/lib/pageMetadata";

// 🔴 제목·설명은 여기 한 곳뿐이다 — `buildPageMetadata` 가 같은 값을 OG·트위터
//    카드·canonical 에 함께 넣는다. og: 쪽에 따로 적지 말 것.
export const metadata = buildPageMetadata({
  title: "견적 문의 | 위캐리 운송",
  description:
    "위캐리 운송 견적 문의입니다. 상·하차지와 연락처만 남겨주시면 차량과 운임을 확인해 연락드립니다. 1톤부터 5톤 이상, 특수차량까지.",
  path: "/quote",
});

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
