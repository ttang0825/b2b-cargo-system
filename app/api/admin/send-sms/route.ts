import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { sendSmsWithLog } from "@/lib/sendSms";
import { resolveSmsSender } from "@/lib/smsSenderPhone";
import { QUOTE_SMS_SUBJECT } from "@/lib/sms/templates";
import type { SmsRelatedType, SmsRecipientType, SmsTemplateType } from "@/lib/sendSms";

const RELATED_TYPES: SmsRelatedType[] = ["dispatch", "application", "portal_account", "quote"];
const RECIPIENT_TYPES: SmsRecipientType[] = ["driver", "customer", "applicant"];

// 발송 전 확인·수정 모달(components/SmsConfirmModal.tsx)에서 "발송"을 눌렀을 때만
// 호출되는 공용 엔드포인트 — 각 트리거(배차확정/승인/거절/계정발급/재발급/견적안내)가
// 미리보기(문구·수신번호)만 계산해서 돌려주고, 실제 발송은 admin이 확인(또는 수정)한
// 뒤 이 API로 한 번 더 호출해야만 일어남(PR #73 리뷰 반영 — 모든 SMS를 발송 직전에
// 확인·수정할 수 있게 해달라는 요청).
export async function POST(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { relatedType, relatedId, templateType, recipientType, recipientPhone, message } = await req.json();
  if (
    !RELATED_TYPES.includes(relatedType) ||
    !relatedId ||
    !templateType ||
    !RECIPIENT_TYPES.includes(recipientType) ||
    !message
  ) {
    return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
  }

  // 🔴 발신번호는 **서버에서 세션으로만** 결정한다. 클라이언트가 보낸 값을 쓰면
  // 솔라피에 등록되지 않은 번호로 발송을 시도하거나 남의 번호로 사칭할 수 있다.
  // 모달은 발신번호를 읽기 전용으로 보여주기만 하고 전송하지 않는다.
  const sender = await resolveSmsSender();

  await sendSmsWithLog({
    relatedType: relatedType as SmsRelatedType,
    relatedId,
    templateType: templateType as SmsTemplateType,
    recipientType: recipientType as SmsRecipientType,
    recipientPhone: recipientPhone || null,
    message,
    sentBy: staff.id,
    senderPhone: sender.phone,
    // 견적안내만 LMS 제목을 준다(35차). 나머지 7종은 제목 없이 기존과 동일하게 나감
    subject: templateType === "quote_summary" ? QUOTE_SMS_SUBJECT : null,
  });

  if (!recipientPhone) {
    return NextResponse.json({ error: "수신자 전화번호가 없어 발송하지 못했습니다." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
