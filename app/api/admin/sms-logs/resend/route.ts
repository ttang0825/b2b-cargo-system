import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { sendSmsWithLog } from "@/lib/sendSms";
import { resolveSmsSender } from "@/lib/smsSenderPhone";
import { QUOTE_SMS_SUBJECT } from "@/lib/sms/templates";
import type { SmsRelatedType, SmsRecipientType, SmsTemplateType } from "@/lib/sendSms";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// 발송 실패한 건을 그대로(같은 수신자·같은 문구) 다시 시도. 새 로그 행을 추가로
// 남기고(원 실패 행은 그대로 이력 보존), sent_by에 실행한 직원을 기록.
export async function POST(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const { data: original, error: fetchError } = await admin.from("sms_logs").select("*").eq("id", id).single();
  if (fetchError || !original) {
    return NextResponse.json({ error: "발송 이력을 찾을 수 없습니다." }, { status: 404 });
  }
  if (original.status !== "failed") {
    return NextResponse.json({ error: "발송 실패 건만 재발송할 수 있습니다." }, { status: 400 });
  }
  if (!original.recipient_phone) {
    return NextResponse.json({ error: "수신자 전화번호가 없어 재발송할 수 없습니다." }, { status: 400 });
  }

  // 재발송도 "지금 누른 사람" 기준으로 발신번호를 정한다 — 원래 로그에 남은 번호를
  // 그대로 쓰면 퇴사자 번호로 다시 나갈 수 있다(문구는 원본 그대로 유지).
  const sender = await resolveSmsSender();

  await sendSmsWithLog({
    relatedType: original.related_type as SmsRelatedType,
    relatedId: original.related_id,
    templateType: original.template_type as SmsTemplateType,
    recipientType: original.recipient_type as SmsRecipientType,
    recipientPhone: original.recipient_phone,
    message: original.message_content,
    sentBy: staff.id,
    senderPhone: sender.phone,
    subject: original.template_type === "quote_summary" ? QUOTE_SMS_SUBJECT : null,
  });

  return NextResponse.json({ ok: true });
}
