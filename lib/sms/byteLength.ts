// SMS/LMS 전환 기준 byte 계산 유일 정의처(EUC-KR 기준 한글 1자=2byte,
// 영숫자/기호=1byte로 근사). lib/sendSms.ts(발송 시 message_type 저장)·
// lib/sms/templates.ts(견적 문구 압축)·components/SmsConfirmModal.tsx(발송
// 전 확인 모달의 실시간 byte 카운터)가 전부 이 값을 공유해야 서로 다른
// 계산식으로 어긋나지 않음.
export const SMS_BYTE_LIMIT = 90;

export function byteLength(text: string): number {
  let bytes = 0;
  for (const ch of text) bytes += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  return bytes;
}
