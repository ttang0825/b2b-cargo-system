import { buildPageMetadata } from "@/lib/pageMetadata";

// 🔴 제목·설명은 여기 한 곳뿐이다 — `buildPageMetadata` 가 같은 값을 OG·트위터
//    카드·canonical 에 함께 넣는다. og: 쪽에 따로 적지 말 것.
export const metadata = buildPageMetadata({
  title: "회사소개 | 위캐리 운송",
  description:
    "화물자동차 운송주선사업 허가를 받아 운영하는 화물 배차·운송 주선 서비스입니다. 상호·자격·소재지를 안내합니다.",
  path: "/about",
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
