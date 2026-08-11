// sms_logs 표시용 라벨·색상 유일 정의처(dispatchStatusColors.ts 등과 동일 패턴)

export const SMS_TEMPLATE_LABELS: Record<string, string> = {
  dispatch_confirmed: "배차확정 안내",
  pickup_completed: "상차완료 안내",
  delivery_completed: "하차완료 안내",
  application_approved: "승인 안내",
  application_rejected: "거절 안내",
  portal_account_issued: "계정발급 안내",
  portal_password_reissued: "비밀번호 재발급 안내",
  quote_summary: "견적 안내",
};

export function getSmsTemplateLabel(type: string): string {
  return SMS_TEMPLATE_LABELS[type] || type;
}

export const SMS_STATUS_LABELS: Record<string, string> = {
  sent: "발송됨(결과대기)",
  delivered: "전달완료",
  failed: "발송실패",
  skipped: "건너뜀(번호없음)",
};

export const SMS_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  sent: { bg: "#EFF6FF", text: "#3B82F6" },
  delivered: { bg: "#D1FAE5", text: "#059669" },
  failed: { bg: "var(--danger-soft)", text: "var(--danger)" },
  skipped: { bg: "#F3F4F6", text: "#6B7280" },
};

export function getSmsStatusLabel(status: string): string {
  return SMS_STATUS_LABELS[status] || status;
}
