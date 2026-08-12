// SMS 발신 Provider 추상화 — 업무 코드(배차확정 처리 등)는 이 인터페이스만 알고,
// 실제 벤더(솔라피)의 SDK/REST를 직접 호출하지 않는다. 나중에 발송량이 늘어
// 다른 벤더(비즈고 등)로 옮길 때 solapiProvider.ts 구현체 하나만 교체하면 되도록.

export interface SendSmsParams {
  to: string; // 숫자만(하이픈 없이)
  from: string; // 숫자만(하이픈 없이)
  text: string;
}

export interface SendSmsResult {
  ok: boolean;
  providerMessageId: string | null;
  error: string | null;
}

export type SmsOutcome = "sent" | "delivered" | "failed";

export interface MessageStatusResult {
  outcome: SmsOutcome;
  messageType: string | null; // 벤더가 보고하는 실제 타입(SMS/LMS/MMS 등)
  statusCode: string | null;
  statusMessage: string | null;
}

export interface SmsProvider {
  sendSms(params: SendSmsParams): Promise<SendSmsResult>;
  getMessageStatus(providerMessageId: string): Promise<MessageStatusResult>;
}
