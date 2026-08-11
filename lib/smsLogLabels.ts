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

// "발송됨(결과대기)"가 정확히 무슨 뜻인지 물어보는 문의가 있어(PR #73 리뷰) 상태
// 배지에 마우스를 올리면 뜨는 설명을 추가함 — 솔라피에 발송 요청은 정상 접수됐지만
// 실제로 상대방 휴대폰에 도착했는지는 아직 확인 전이라는 뜻(자동 Webhook/폴링은
// 1차 범위에서 제외했으므로, "상태 새로고침" 버튼을 눌러야 최종 결과를 알 수 있음)
export const SMS_STATUS_HINTS: Record<string, string> = {
  sent: "솔라피에 발송 요청은 접수됐지만, 실제로 상대방 휴대폰에 도착했는지는 아직 확인 전입니다. '상태 새로고침'을 누르면 최종 결과를 확인할 수 있습니다.",
  delivered: "솔라피가 실제 전달 완료를 확인한 상태입니다.",
  failed: "발송이 실패했습니다. 아래 오류 메시지를 확인하고 '재발송'을 눌러보세요.",
  skipped: "수신자 전화번호가 없어 발송을 건너뛰었습니다.",
};

export function getSmsStatusHint(status: string): string {
  return SMS_STATUS_HINTS[status] || "";
}
