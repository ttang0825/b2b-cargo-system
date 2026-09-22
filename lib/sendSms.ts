import { createClient } from "@supabase/supabase-js";
import { solapiProvider } from "@/lib/sms/solapiProvider";
import type { SmsProvider } from "@/lib/sms/provider";
import { SMS_BYTE_LIMIT, byteLength } from "@/lib/sms/byteLength";

// Provider 구현체는 여기 한 곳에서만 선택됨 — 나중에 벤더를 바꾸면 이 한 줄만 교체
const provider: SmsProvider = solapiProvider;

// 🔴 **DB `sms_logs_related_type_check` 와 같아야 한다** — 값을 늘릴 때는
//    마이그레이션이 **먼저** 나가야 한다(2026-09-21 `reward` 추가). 코드가 먼저면
//    문자는 나가는데 **이력만 조용히 안 남는다**(이 파일은 예외를 안 던진다).
export type SmsRelatedType = "dispatch" | "application" | "portal_account" | "quote" | "reward";
export type SmsRecipientType = "driver" | "customer" | "applicant";
// 🔴 **`pickup_completed`·`delivery_completed` 를 지우지 말 것**(2026-09-18 폐지).
//    문구·발송 경로는 없앴지만 **이 두 값은 유니언에 남는다** — `sms-logs/resend` 가
//    옛 실패 건의 `template_type` 을 그대로 다시 넘기기 때문이고, 지우면 그 경로가
//    타입에서 막힌다. 🔴 **재발송은 일부러 막지 않았다** — 원문을 그대로 다시 보내는
//    것이라 틀린 문자가 아니다(새로 만들어지는 경로가 없을 뿐이다).
//    ⚠️ DB 의 `sms_logs_template_type_check` 에도 두 값이 그대로 남아 있다
//       (`migrations/2026-09-18_sms_dispatch_customer.sql`).
export type SmsTemplateType =
  | "dispatch_confirmed" // 차주 「화물정보 안내」 — 🔴 키를 바꾸지 말 것(옛 이력과 끊긴다)
  | "dispatch_confirmed_customer" // 고객 「배차확정 안내」 (2026-09-18 신설)
  | "pickup_completed" // 🔴 2026-09 폐지 · 옛 이력 재발송용
  | "delivery_completed" // 🔴 2026-09 폐지 · 옛 이력 재발송용
  | "application_approved"
  | "application_rejected"
  | "portal_account_issued"
  | "portal_password_reissued"
  | "quote_summary"
  | "reward_earned" // 적립 안내 (2026-09-21 신설) — 🔴 DB CHECK 도 같이 늘렸다
  | "reward_deducted" // 적립금 사용(차감) 안내 (2026-09-21 신설) — 🔴 DB CHECK 도 같이
  // 🔴 **`reward_earned` 와 합치지 말 것** — 앞엣것은 「쌓였다」, 이것은 「쌓일 것이다」.
  | "reward_status"; // 적립 현황 안내 (예상 적립 · 2026-09-21 신설)

export interface SendSmsLogParams {
  relatedType: SmsRelatedType;
  relatedId: string;
  templateType: SmsTemplateType;
  recipientType: SmsRecipientType;
  recipientPhone: string | null; // null이면 스킵 처리(전화번호 없음)
  message: string;
  sentBy?: string | null; // 수동 재발송일 때만 담당자 id, 자동발송이면 비워둠
  /**
   * 발신번호(숫자만). 로그인한 담당자의 번호이며 **서버에서 세션으로 결정한 값만**
   * 넘길 것(`lib/smsSenderPhone.ts`의 resolveSmsSender) — 클라이언트가 보낸 값을
   * 그대로 넘기면 안 된다. 비우면 대표 발신번호(SOLAPI_SENDER_PHONE)를 쓴다.
   */
  senderPhone?: string | null;
  /** LMS 제목(선택) */
  subject?: string | null;
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
// 미리 계산해 저장함.
function computeMessageType(text: string): "SMS" | "LMS" {
  return byteLength(text) > SMS_BYTE_LIMIT ? "LMS" : "SMS";
}

// Provider 호출 + sms_logs 기록을 한 번에 처리하는 공용 발송 유틸.
// **절대 예외를 밖으로 던지지 않음** — 배차확정/승인처리 같은 메인 액션이 SMS
// 실패 때문에 막히거나 에러 화면을 띄우면 안 되기 때문(작업지시서 결정사항).
export async function sendSmsWithLog(params: SendSmsLogParams): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return; // 서버 환경변수 자체가 없으면 로그도 못 남기고 조용히 포기

  // sms_logs.sender_phone은 35차에 추가된 컬럼이고, 이 저장소는 마이그레이션을
  // 사용자가 Supabase에서 직접 실행하는 구조라 **코드가 먼저 배포되는 구간**이 생긴다.
  // 그 사이 insert가 통째로 실패하면 발송 기록이 조용히 사라지므로(이 함수는 예외를
  // 밖으로 던지지 않는다), 컬럼이 없다는 에러면 그 컬럼만 빼고 한 번 더 시도한다.
  // 마이그레이션 적용 후에는 첫 시도가 항상 성공하므로 부담이 없다.
  async function insertLog(row: Record<string, unknown>) {
    const { error } = await admin!.from("sms_logs").insert(row);
    if (!error) return;
    const msg = `${error.message || ""} ${(error as any).details || ""}`;
    if (msg.includes("sender_phone")) {
      const { sender_phone, ...withoutSender } = row;
      await admin!.from("sms_logs").insert(withoutSender);
    }
  }

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
    await insertLog({
      ...baseRow,
      sender_phone: null,
      message_type: null,
      status: "skipped",
      error_message: "수신자 전화번호가 없습니다.",
    });
    return;
  }

  const fallbackFrom = digitsOnly(process.env.SOLAPI_SENDER_PHONE || "");
  const preferredFrom = digitsOnly(params.senderPhone || "");
  const from = preferredFrom || fallbackFrom;

  if (!from) {
    await insertLog({
      ...baseRow,
      sender_phone: null,
      message_type: computeMessageType(params.message),
      status: "failed",
      error_message: "서버에 SOLAPI_SENDER_PHONE이 설정되어 있지 않습니다.",
    });
    return;
  }

  const to = digitsOnly(params.recipientPhone);
  const subject = params.subject || undefined;

  async function attempt(sender: string) {
    try {
      return await provider.sendSms({ to, from: sender, text: params.message, subject });
    } catch (e) {
      return {
        ok: false,
        providerMessageId: null,
        error: e instanceof Error ? e.message : "SMS 발송 중 오류가 발생했습니다.",
      };
    }
  }

  let result = await attempt(from);
  let usedFrom = from;
  let fallbackNote: string | null = null;

  // 🔴 담당자 번호가 솔라피에 사전 등록되어 있지 않으면 발송이 실패한다. 그대로 두면
  // **고객이 문자를 아예 못 받는다** — 그게 가장 나쁜 결과이므로 대표 발신번호로 한 번
  // 더 시도한다(지시서 3-2). 조용히 대체하지 않고 사유를 로그에 남겨서, 관리자가
  // "왜 회신이 담당자에게 안 오지"를 나중에 추적할 수 있게 한다.
  if (!result.ok && preferredFrom && fallbackFrom && preferredFrom !== fallbackFrom) {
    fallbackNote = `담당자 번호(${preferredFrom}) 발송 실패로 대표번호로 재발송함. 원인: ${
      result.error || "알 수 없음"
    }`;
    result = await attempt(fallbackFrom);
    usedFrom = fallbackFrom;
  }

  await insertLog({
    ...baseRow,
    sender_phone: usedFrom,
    provider_message_id: result.providerMessageId,
    message_type: computeMessageType(params.message),
    status: result.ok ? "sent" : "failed",
    error_message: [fallbackNote, result.error].filter(Boolean).join(" / ") || null,
  });
}
