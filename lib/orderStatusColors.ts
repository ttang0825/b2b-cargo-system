export const ORDER_STATUS_OPTIONS = [
  "접수",
  "배차중",
  "배차완료",
  "운송중",
  "운송완료",
  "취소",
] as const;

type StatusColor = { bg: string; text: string };

export const ORDER_STATUS_COLORS: Record<string, StatusColor> = {
  접수: { bg: "#F3F4F6", text: "#6B7280" },
  배차중: { bg: "#FEF3C7", text: "#B45309" },
  배차완료: { bg: "#E0E7FF", text: "#4F46E5" },
  운송중: { bg: "#DBEAFE", text: "#2563EB" },
  운송완료: { bg: "#D1FAE5", text: "#059669" },
  취소: { bg: "#FEE2E2", text: "#B91C1C" },
};

export function getOrderStatusColor(status: string): StatusColor {
  return ORDER_STATUS_COLORS[status] || { bg: "#F3F4F6", text: "#6B7280" };
}
