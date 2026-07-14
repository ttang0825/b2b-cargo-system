export const DISPATCH_STATUS_OPTIONS = [
  "배차대기",
  "배차확정",
  "상차완료",
  "하차완료",
  "운송완료",
  "문제발생",
] as const;

type StatusColor = { bg: string; text: string };

export const DISPATCH_STATUS_COLORS: Record<string, StatusColor> = {
  배차대기: { bg: "#F3F4F6", text: "#6B7280" },
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
  배차대기: "배차중",
  배차확정: "배차완료",
  상차완료: "운송중",
  하차완료: "운송중",
  운송완료: "운송완료",
  문제발생: "배차중",
};
