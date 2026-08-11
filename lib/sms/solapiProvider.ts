import { SolapiMessageService } from "solapi";
import type {
  MessageStatusResult,
  SendSmsParams,
  SendSmsResult,
  SmsOutcome,
  SmsProvider,
} from "./provider";

function getMessageService(): InstanceType<typeof SolapiMessageService> | null {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  if (!apiKey || !apiSecret) return null;
  return new SolapiMessageService(apiKey, apiSecret);
}

// 솔라피 statusCode 해석 — 사전조사(1-5) 당시 이 세션의 네트워크 제약으로 공식
// 코드표(docs.solapi.com) 전체를 확인하지 못해, 검색으로 확인된 구간만 보수적으로
// 매핑함: 2000=정상 발송(성공), 3000 초과 4000 미만=발송 실패. 그 외 코드는 아직
// 결과가 불확실한 것으로 보고 'sent'(발송요청됨, 결과 미확정)로 남겨둔다 — 원본
// statusCode/statusMessage는 항상 그대로 sms_logs에 같이 저장되므로, 이 매핑이
// 부정확하더라도 관리자가 원본 값을 보고 직접 판단할 수 있다. 나중에 공식 코드표를
// 확인할 수 있게 되면 이 함수만 고치면 됨.
function interpretStatusCode(statusCode: string | null | undefined): SmsOutcome {
  if (!statusCode) return "sent";
  const code = Number(statusCode);
  if (!Number.isFinite(code)) return "sent";
  if (code === 2000) return "delivered";
  if (code > 3000 && code < 4000) return "failed";
  return "sent";
}

export const solapiProvider: SmsProvider = {
  async sendSms({ to, from, text }: SendSmsParams): Promise<SendSmsResult> {
    const service = getMessageService();
    if (!service) {
      return {
        ok: false,
        providerMessageId: null,
        error: "서버에 SOLAPI_API_KEY/SOLAPI_API_SECRET이 설정되어 있지 않습니다.",
      };
    }
    try {
      const res = await service.send({ to, from, text }, { showMessageList: true });
      const sentItem = res.messageList?.[0];
      if (!sentItem) {
        const failed = res.failedMessageList?.[0];
        return {
          ok: false,
          providerMessageId: failed?.messageId || null,
          error: failed?.statusMessage || "발송 접수에 실패했습니다.",
        };
      }
      return { ok: true, providerMessageId: sentItem.messageId, error: null };
    } catch (e) {
      return {
        ok: false,
        providerMessageId: null,
        error: e instanceof Error ? e.message : "SMS 발송 중 오류가 발생했습니다.",
      };
    }
  },

  async getMessageStatus(providerMessageId: string): Promise<MessageStatusResult> {
    const service = getMessageService();
    if (!service) {
      throw new Error("서버에 SOLAPI_API_KEY/SOLAPI_API_SECRET이 설정되어 있지 않습니다.");
    }
    const res = await service.getMessages({ messageId: providerMessageId });
    // getMessages()의 messageList는 배열이 아니라 messageId를 key로 하는 Record임
    // (send()의 응답과 응답 형태가 다름 — SDK 소스로 직접 확인함)
    const item = Object.values(res.messageList || {})[0] as
      | { statusCode?: string | null; status?: string | null; type?: string | null; reason?: string | null }
      | undefined;
    if (!item) {
      return { outcome: "sent", messageType: null, statusCode: null, statusMessage: "조회된 결과가 없습니다." };
    }
    return {
      outcome: interpretStatusCode(item.statusCode),
      messageType: item.type || null,
      statusCode: item.statusCode || null,
      statusMessage: item.status || item.reason || null,
    };
  },
};
