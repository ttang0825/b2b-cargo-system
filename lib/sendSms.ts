import { createClient } from "@supabase/supabase-js";
import { solapiProvider } from "@/lib/sms/solapiProvider";
import type { SmsProvider } from "@/lib/sms/provider";

// Provider 구현체는 여기 한 곳에서만 선택됨 — 나중에 벤더를 바꾸면 이 한 줄만 교체
const provider: SmsProvider = solapiProvider;

export type SmsRelatedType = "dispatch" | "application" | "portal_account" | "quote";
export type SmsRecipientType = "driver" | "customer" | "applicant";
export type SmsTemplateType =
  | "dispatch_confirmed"
  | "pickup_completed"
  | "delivery_completed"
  | "application_approved"
  | "application_rejected"
  | "portal_account_issued"
  | "portal_password_reissued"
  | "quote_summary";

export interface SendSmsLogParams {
  relatedType: SmsRelatedType;
  relatedId: string;
  templateType: SmsTemplateType;
  recipientType: SmsRecipientType;
  recipientPhone: string | null; // null이면 스킵 처리(전화번호 없음)
  message: string;
  sentBy?: string | null; // 수동 재발송일 때만 담당자 id, 자동발송이면 비워둠
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

// 90byte(한글 45자) 초과 시 자동 LMS 전환 — 솔라피 발송 응답 자체엔 최종 타입이
// 안 내려와서(공식 코드표 확인 제약, lib/sms/solapiProvider.ts 주석 참고) 여기서
// 미리 계산해 저장함. EUC-KR 기준 한글 1자=2byte, 영숫자/기호=1byte로 근사.
function computeMessageType(text: string): "SMS" | "LMS" {
  let bytes = 0;
  for (const ch of text) {
    bytes += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  }
  return bytes > 90 ? "LMS" : "SMS";
}

// Provider 호출 + sms_logs 기록을 한 번에 처리하는 공용 발송 유틸.
// **절대 예외를 밖으로 던지지 않음** — 배차확정/승인처리 같은 메인 액션이 SMS
// 실패 때문에 막히거나 에러 화면을 띄우면 안 되기 때문(작업지시서 결정사항).
export async function sendSmsWithLog(params: SendSmsLogParams): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return; // 서버 환경변수 자체가 없으면 로그도 못 남기고 조용히 포기

  const baseRow = {
    provider: "solapi",
    related_type: params.relatedType,
    related_id: params.relatedId,
    template_type: params.templateType,
    recipient_phone: params.recipientPhone,
    recipient_type: params.recipientType,
    message_content: params.message,
    sent_by: params.sentBy || null,
    sent_at: new Date().toISOString(),
  };

  if (!params.recipientPhone) {
    await admin.from("sms_logs").insert({
      ...baseRow,
      message_type: null,
      status: "skipped",
      error_message: "수신자 전화번호가 없습니다.",
    });
    return;
  }

  const from = process.env.SOLAPI_SENDER_PHONE;
  if (!from) {
    await admin.from("sms_logs").insert({
      ...baseRow,
      message_type: computeMessageType(params.message),
      status: "failed",
      error_message: "서버에 SOLAPI_SENDER_PHONE이 설정되어 있지 않습니다.",
    });
    return;
  }

  try {
    const result = await provider.sendSms({
      to: digitsOnly(params.recipientPhone),
      from: digitsOnly(from),
      text: params.message,
    });
    await admin.from("sms_logs").insert({
      ...baseRow,
      provider_message_id: result.providerMessageId,
      message_type: computeMessageType(params.message),
      status: result.ok ? "sent" : "failed",
      error_message: result.error,
    });
  } catch (e) {
    await admin.from("sms_logs").insert({
      ...baseRow,
      message_type: computeMessageType(params.message),
      status: "failed",
      error_message: e instanceof Error ? e.message : "SMS 발송 중 오류가 발생했습니다.",
    });
  }
}
