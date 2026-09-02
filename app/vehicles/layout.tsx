// 🔴 차량 범위 표현은 30차 리뷰에 **시안 문구**("1톤부터 5톤 이상, 특수차량까지")로 확정됐다.
// 12차·34차의 "1톤부터 5톤 이상까지"를 근거로 되돌리지 말 것.
// 🔴 "전 차종"·"모든 차량"·"특수차량"은 여전히 금지다.
// ⚠️ 메타는 12차(`/vehicles`)·13차(`/quote`)에 두 번 연속 놓친 자리다 — 검색결과에
// 그대로 노출되므로 **화면 본문과 같은 기준**을 적용한다.
import { buildPageMetadata } from "@/lib/pageMetadata";

// 🔴 제목·설명은 여기 한 곳뿐이다 — `buildPageMetadata` 가 같은 값을 OG·트위터
//    카드·canonical 에 함께 넣는다. og: 쪽에 따로 적지 말 것.
export const metadata = buildPageMetadata({
  title: "차량·요금 안내 | 위캐리 운송",
  description:
    "1톤부터 5톤 이상, 특수차량까지 차급별 기준가와 차량 형태 12종을 안내합니다. 정확한 금액은 견적 시 안내해 드립니다.",
  path: "/vehicles",
});

export default function VehiclesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
