export const INVOICE_STATUS_OPTIONS = [
  "정산대기",
  "청구완료",
  "입금완료",
  "지연",
  "거래중단",
  "차주지급완료",
  "정산확정",
] as const;

type StatusColor = { bg: string; text: string };

export const INVOICE_STATUS_COLORS: Record<string, StatusColor> = {
  정산대기: { bg: "#F3F4F6", text: "#6B7280" },
  청구완료: { bg: "#E0E7FF", text: "#4F46E5" },
  입금완료: { bg: "#D1FAE5", text: "#059669" },
  지연: { bg: "#FEF3C7", text: "#B45309" },
  거래중단: { bg: "#FEE2E2", text: "#B91C1C" },
  차주지급완료: { bg: "#CCFBF1", text: "#0F766E" },
  정산확정: { bg: "#1E293B", text: "#F8FAFC" },
};

export function getInvoiceStatusColor(status: string): StatusColor {
  return INVOICE_STATUS_COLORS[status] || { bg: "#F3F4F6", text: "#6B7280" };
}
