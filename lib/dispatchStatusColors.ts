// "접수중"은 배차 등록 시 항상 시작하는 초기 상태 — 아직 내부차주/외부정보망 중
// 어느 쪽으로도 실제 배차가 확정되지 않은 상태. "배차확정"으로 넘어가려면
// 반드시 상세화면의 전용 확정 절차(내부차주 확인 또는 외부정보망 1곳 지정+차주정보
// 입력)를 거쳐야 함 — 이 목록의 순서로 곧바로 다음 상태를 표시하는 화면(드롭다운
// 등)에서는 "접수중"을 선택 옵션에서 제외하고 별도 확정 UI로 유도할 것
export const DISPATCH_STATUS_OPTIONS = [
  "접수중",
  "배차확정",
  "상차완료",
  "하차완료",
  "운송완료",
  "문제발생",
] as const;

type StatusColor = { bg: string; text: string };

export const DISPATCH_STATUS_COLORS: Record<string, StatusColor> = {
  접수중: { bg: "#F3F4F6", text: "#6B7280" },
  배차확정: { bg: "#E0E7FF", text: "#4F46E5" },
  상차완료: { bg: "#DBEAFE", text: "#2563EB" },
  하차완료: { bg: "#DDD6FE", text: "#6D28D9" },
  운송완료: { bg: "#D1FAE5", text: "#059669" },
  문제발생: { bg: "#FEE2E2", text: "#B91C1C" },
};

export function getDispatchStatusColor(status: string): StatusColor {
  return DISPATCH_STATUS_COLORS[status] || { bg: "#F3F4F6", text: "#6B7280" };
}

// 배차상태가 바뀌면 연결된 운송오더(orders.status)도 같이 따라가도록 하는 매핑
export const DISPATCH_TO_ORDER_STATUS: Record<string, string> = {
  접수중: "배차중",
  배차확정: "배차완료",
  상차완료: "운송중",
  하차완료: "운송중",
  운송완료: "운송완료",
  문제발생: "배차중",
};
