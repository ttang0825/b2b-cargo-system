import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { sendSmsWithLog } from "@/lib/sendSms";
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

  await sendSmsWithLog({
    relatedType: relatedType as SmsRelatedType,
    relatedId,
    templateType: templateType as SmsTemplateType,
    recipientType: recipientType as SmsRecipientType,
    recipientPhone: recipientPhone || null,
    message,
    sentBy: staff.id,
  });

  if (!recipientPhone) {
    return NextResponse.json({ error: "수신자 전화번호가 없어 발송하지 못했습니다." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
