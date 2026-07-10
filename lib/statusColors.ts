// 영업상태 값과 그에 대응하는 색상을 한 곳에서 관리합니다.
// 다른 화면(companies 목록, 상세페이지, customers 화면)에서 전부 이 파일을 참조합니다.

export const STATUS_OPTIONS = [
  "미접촉",
  "연락시도",
  "연락완료",
  "추후연락",
  "제안서발송",
  "견적요청",
  "견적발송",
  "첫거래완료",
  "재거래발생",
  "반복화주",
  "월정산화주",
  "휴면화주",
  "거래중단",
] as const;

type StatusColor = { bg: string; text: string };

export const STATUS_COLORS: Record<string, StatusColor> = {
  미접촉: { bg: "#F3F4F6", text: "#6B7280" },
  연락시도: { bg: "#EFF6FF", text: "#3B82F6" },
  연락완료: { bg: "#DBEAFE", text: "#2563EB" },
  추후연락: { bg: "#FEF3C7", text: "#B45309" },
  제안서발송: { bg: "#E0E7FF", text: "#4F46E5" },
  견적요청: { bg: "#EDE9FE", text: "#7C3AED" },
  견적발송: { bg: "#DDD6FE", text: "#6D28D9" },
  첫거래완료: { bg: "#D1FAE5", text: "#059669" },
  재거래발생: { bg: "#A7F3D0", text: "#047857" },
  반복화주: { bg: "#99F6E4", text: "#0F766E" },
  월정산화주: { bg: "#FDE68A", text: "#92400E" },
  휴면화주: { bg: "#E5E7EB", text: "#4B5563" },
  거래중단: { bg: "#FEE2E2", text: "#B91C1C" },
};

export function getStatusColor(status: string): StatusColor {
  return STATUS_COLORS[status] || { bg: "#F3F4F6", text: "#6B7280" };
}
