// 로드맵③ 현장 추가비 — 8종 카테고리 라벨 + DB 함수 reason 코드 매핑.
// category 값 목록의 유일한 정의처(DB CHECK 제약과 반드시 동일하게 유지).
export const DISPATCH_EXTRA_CHARGE_CATEGORIES = [
  "waiting_fee",
  "recall_fee",
  "night_weekend_fee",
  "manual_loading_fee",
  "stairs_fee",
  "extra_stop_fee",
  "parking_toll_fee",
  "other",
] as const;

export type DispatchExtraChargeCategory = (typeof DISPATCH_EXTRA_CHARGE_CATEGORIES)[number];

export const DISPATCH_EXTRA_CHARGE_CATEGORY_LABELS: Record<DispatchExtraChargeCategory, string> = {
  waiting_fee: "대기료",
  recall_fee: "회차비",
  night_weekend_fee: "야간·주말·공휴일 할증",
  manual_loading_fee: "수작업 상하차",
  stairs_fee: "계단 운반",
  extra_stop_fee: "경유지 추가",
  parking_toll_fee: "주차료·통행료",
  other: "기타",
};

export function getDispatchExtraChargeCategoryLabel(category: string | null | undefined): string {
  if (!category) return "-";
  return DISPATCH_EXTRA_CHARGE_CATEGORY_LABELS[category as DispatchExtraChargeCategory] || category;
}

export const DISPATCH_EXTRA_CHARGE_REASON_LABELS: Record<string, string> = {
  invalid_category: "올바르지 않은 항목입니다.",
  note_required_for_other: "'기타' 항목은 사유를 입력해주세요.",
  amount_negative: "금액은 음수로 입력할 수 없습니다.",
  amount_required: "화주 청구액 또는 차주 지급액 중 하나는 0보다 커야 합니다.",
  dispatch_not_found: "배차 정보를 찾을 수 없습니다.",
  driver_direct_not_supported: "선착불(차주 직접수금) 건은 현장 추가비를 등록할 수 없습니다.",
  charge_not_found: "현장 추가비 항목을 찾을 수 없습니다.",
  already_cancelled: "이미 취소된 항목입니다.",
  correction_invoice_already_created:
    "이미 정정청구 정산 건이 생성된 항목이라 취소할 수 없습니다. 관리자에게 문의해주세요.",
  reason_required: "취소 사유를 입력해주세요.",
};

export function getDispatchExtraChargeReasonLabel(reason: string | null | undefined): string {
  if (!reason) return "처리할 수 없습니다.";
  return DISPATCH_EXTRA_CHARGE_REASON_LABELS[reason] || `처리할 수 없습니다. (${reason})`;
}
