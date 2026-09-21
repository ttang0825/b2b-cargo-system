// sms_logs 표시용 라벨·색상 유일 정의처(dispatchStatusColors.ts 등과 동일 패턴)

// 🔴 **`pickup_completed`·`delivery_completed` 를 지우지 말 것**(2026-09-18 폐지).
//    문자 자체는 없앴지만 이 표는 **이미 나간 문자의 이력**을 그리는 곳이라, 지우면
//    `/admin/sms-logs` 와 각 상세의 이력 칸에 **영문 코드가 그대로 노출**되고
//    종류 필터에서도 옛 건을 못 찾게 된다(이 상수를 그대로 순회해 필터를 그린다).
//    실패 건 **재발송**(`sms-logs/resend`)도 같은 키로 새 행을 남긴다.
export const SMS_TEMPLATE_LABELS: Record<string, string> = {
  // 🔴 배차확정은 **두 통**이다 — 차주와 고객이 서로 다른 내용을 받는다(2026-09-18).
  //    `dispatch_confirmed` 의 키를 바꾸지 말 것(옛 이력과 끊긴다) — 라벨만 바뀌었다.
  dispatch_confirmed: "화물정보 안내",
  dispatch_confirmed_customer: "배차확정 안내",
  pickup_completed: "상차완료 안내", // 🔴 2026-09 폐지 · 옛 이력 표시용
  delivery_completed: "하차완료 안내", // 🔴 2026-09 폐지 · 옛 이력 표시용
  application_approved: "승인 안내",
  application_rejected: "거절 안내",
  portal_account_issued: "계정발급 안내",
  portal_password_reissued: "비밀번호 재발급 안내",
  quote_summary: "견적 안내",
  reward_earned: "적립 안내", // 2026-09-21 신설
  reward_deducted: "적립금 사용 안내", // 2026-09-21 신설(3차)
};

export function getSmsTemplateLabel(type: string): string {
  return SMS_TEMPLATE_LABELS[type] || type;
}

// 받는 사람이 화주(고객)인지 차주인지 — 같은 배차 건에서 배차확정이 **차주와 고객
// 두 통**으로 나가므로(2026-09-18) 이 칸이 둘을 가르는 표시다
export const SMS_RECIPIENT_TYPE_LABELS: Record<string, string> = {
  driver: "차주",
  customer: "고객",
  applicant: "신청자",
};

export function getSmsRecipientTypeLabel(type: string): string {
  return SMS_RECIPIENT_TYPE_LABELS[type] || type;
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
