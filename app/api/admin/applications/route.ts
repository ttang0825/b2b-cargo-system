import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { applicationRejectedMessage } from "@/lib/sms/templates";
import { resolveSmsSender, contactPhoneForBody } from "@/lib/smsSenderPhone";

// Next.js가 GET 응답(및 그 안에서 호출되는 fetch)을 캐시해버리면, 방금 처리한 결과가
// 재조회 시 예전 값으로 보이는 문제가 있을 수 있어 매 요청마다 실제 DB를 다시 조회하도록 강제
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { data, error } = await admin
    .from("customer_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { action } = body;

  // 개별 삭제
  if (action === "delete") {
    const staff = await getCurrentStaff();
    if (!staff || staff.role !== "admin") {
      return NextResponse.json({ error: "삭제는 관리자만 할 수 있습니다." }, { status: 403 });
    }
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    const { error } = await admin.from("customer_applications").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // 오래된 거절/보류 건 일괄 삭제 (기본 90일 이전)
  if (action === "bulk_cleanup") {
    const staff = await getCurrentStaff();
    if (!staff || staff.role !== "admin") {
      return NextResponse.json({ error: "삭제는 관리자만 할 수 있습니다." }, { status: 403 });
    }
    const days = body.days || 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const { data, error } = await admin
      .from("customer_applications")
      .delete()
      .in("status", ["거절", "보류"])
      .lt("created_at", cutoff.toISOString())
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, deletedCount: data?.length || 0 });
  }

  // 상태 변경 (승인/거절/보류)
  const { id, status, staff_note, processed_by } = body;
  if (!id || !status) {
    return NextResponse.json({ error: "id와 status가 필요합니다." }, { status: 400 });
  }
  const staff = await getCurrentStaff();
  const { data: updated, error } = await admin
    .from("customer_applications")
    .update({
      status,
      staff_note: staff_note || null,
      processed_by: processed_by || null,
      updated_by: staff?.id || null,
    })
    .eq("id", id)
    .select("company_name,contact_phone")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 거절 안내 SMS 미리보기(발송은 안 함) — 보류는 사전조사 1-6에서 확인한 대로
  // 이번 범위에 포함하지 않음(승인/거절만). 실제 발송은 client가
  // SmsConfirmModal로 확인·수정 후 /api/admin/send-sms를 호출해야만 일어남
  // (PR #73 리뷰 반영).
  // 발신번호·본문 안내번호는 반드시 서버에서 세션으로 결정한다(클라이언트 입력값 신뢰 금지)
  const sender = await resolveSmsSender();
  const senderFields = {
    senderDisplay: sender.display,
    senderStaffName: sender.staffName,
    senderIsStaffPhone: sender.isStaffPhone,
  };
  const contact = { contactPhone: contactPhoneForBody(sender), staffName: sender.staffName };

  const smsPreview =
    status === "거절" && updated
      ? {
          relatedType: "application" as const,
          relatedId: id,
          templateType: "application_rejected" as const,
          recipientType: "applicant" as const,
          recipientPhone: updated.contact_phone || null,
          message: applicationRejectedMessage({
            companyName: updated.company_name,
            reason: staff_note || null,
            ...contact,
          }),
          ...senderFields,
        }
      : null;

  return NextResponse.json({ ok: true, smsPreview });
}
