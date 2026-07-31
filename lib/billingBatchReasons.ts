// 로드맵 ②-B: 월정산 묶음 DB 함수(app/api/admin/billing-batches/*)가 실패 시
// 반환하는 구조화된 reason 코드를 화면에 보여줄 한국어 문구로 변환.
// 새 실패 사유를 SQL 함수에 추가하면 이 맵에도 같이 추가할 것.
export const BILLING_BATCH_REASON_LABELS: Record<string, string> = {
  company_not_found: "화주 정보를 찾을 수 없습니다.",
  period_not_full_month: "기간은 반드시 월 단위(1일~말일)여야 합니다.",
  period_not_matching_cutoff_day: "이 화주의 정산 마감일 설정과 기간이 맞지 않습니다.",
  draft_already_exists: "이 화주·기간으로 이미 작성 중인 묶음이 있습니다.",
  batch_not_found: "묶음을 찾을 수 없습니다.",
  batch_not_draft: "작성 중(draft) 상태의 묶음에서만 가능합니다.",
  invoice_not_found: "정산 건을 찾을 수 없습니다.",
  company_mismatch: "이 묶음의 화주와 다른 화주의 정산 건입니다.",
  not_monthly_broker: "주선사 정산·월정산(broker/monthly) 건만 묶을 수 있습니다.",
  billing_period_out_of_range: "이 건의 정산월이 묶음 기간과 일치하지 않습니다.",
  invoice_status_not_eligible: "정산대기 상태의 건만 묶을 수 있습니다.",
  already_customer_side_locked: "이미 다른 월정산 묶음에 포함된 건입니다.",
  invoice_locked: "이미 정산확정(잠금)된 건입니다.",
  amount_not_finalized: "청구금액이 아직 확정되지 않았습니다.",
  already_in_another_batch: "이미 다른 묶음에 포함된 건입니다.",
  item_not_found_or_already_released: "이미 제거되었거나 존재하지 않는 항목입니다.",
  item_not_found_or_released: "이미 제거되었거나 존재하지 않는 항목입니다.",
  invoice_no_longer_eligible: "이 건은 더 이상 묶음 조건을 충족하지 않습니다.",
  no_active_items: "묶음에 포함된 항목이 없습니다.",
  amount_mismatch: "일부 항목의 금액이 등록 이후 변경되었습니다. 새로고침 후 다시 시도해주세요.",
  ineligible_items: "일부 항목이 더 이상 묶음 조건을 충족하지 않습니다. 목록을 확인해주세요.",
  batch_not_confirmed: "확정된 묶음에서만 가능합니다.",
  reason_required: "사유를 입력해주세요.",
  tax_invoice_already_issued: "세금계산서가 이미 발행된 묶음은 해제할 수 없습니다.",
  payment_already_processed_or_overdue: "입금 처리가 진행된 묶음은 해제할 수 없습니다.",
  already_issued: "이미 발행 처리된 묶음입니다.",
  already_paid: "이미 입금완료 처리된 묶음입니다.",
  batch_cancelled: "취소된 묶음입니다.",
  batch_confirmed_cannot_delete: "확정된 묶음은 삭제할 수 없습니다. 먼저 해제해주세요.",
  admin_required_for_cancelled: "해제(취소)된 묶음 삭제는 관리자만 할 수 있습니다.",
};

export function getBillingBatchReasonLabel(reason: string | null | undefined): string {
  if (!reason) return "처리할 수 없습니다.";
  return BILLING_BATCH_REASON_LABELS[reason] || `처리할 수 없습니다. (${reason})`;
}
