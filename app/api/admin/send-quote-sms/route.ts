import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { quoteSummaryMessage, QUOTE_SMS_SUBJECT } from "@/lib/sms/templates";
import { resolveSmsSender, contactPhoneForBody } from "@/lib/smsSenderPhone";

// 견적 안내는 자동발송이 아니라 견적 상세의 "견적서 출력(PDF)" 옆 수동 버튼으로만
// 나감(사전조사 1-3 결과 — 견적 상태값이 내부 영업퍼널 단계라 상태 변경마다
// 자동으로 문자를 보내면 의도치 않게 반복 발송될 수 있음). 이 API는 문구·수신번호
// 미리보기만 계산해서 돌려주고(**발송하지 않음**), 실제 발송은
// components/SmsConfirmModal.tsx에서 확인·수정 후 /api/admin/send-sms를
// 호출해야만 일어남(PR #73 리뷰 반영 — 모든 SMS를 발송 직전에 확인·수정할 수
// 있게 해달라는 요청).
export async function POST(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { quote_id } = await req.json();
  if (!quote_id) {
    return NextResponse.json({ error: "quote_id가 필요합니다." }, { status: 400 });
  }

  const { data: quote, error: quoteError } = await admin
    .from("quotes")
    .select("id,item,vehicle_type,final_amount,requested_pickup_at,origin,destination,selected_options,guest_phone,company_id,companies(contact_mobile)")
    .eq("id", quote_id)
    .single();
  if (quoteError || !quote) {
    return NextResponse.json({ error: "견적 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const phone: string | null = (quote as any).companies?.contact_mobile || quote.guest_phone || null;

  // 발신번호는 반드시 서버에서 세션으로 결정한다(클라이언트 입력값 신뢰 금지)
  const sender = await resolveSmsSender();

  // ⚠️ quotes는 상·하차 조건을 별도 컬럼이 아니라 selected_options(jsonb) 안에
  // 한글 키로 담는다(orders/portal_order_requests는 반대로 flat 컬럼) — CLAUDE.md 참고
  const options = (quote as any).selected_options || {};

  const message = quoteSummaryMessage({
    item: quote.item,
    vehicleType: quote.vehicle_type,
    finalAmount: quote.final_amount,
    pickupAt: quote.requested_pickup_at,
    origin: (quote as any).origin,
    destination: (quote as any).destination,
    loadCondition: options["상차조건"] || null,
    unloadCondition: options["하차조건"] || null,
    contactPhone: contactPhoneForBody(sender),
    staffName: sender.staffName,
  });

  return NextResponse.json({
    relatedType: "quote",
    relatedId: quote_id,
    templateType: "quote_summary",
    recipientType: "customer",
    recipientPhone: phone,
    message,
    subject: QUOTE_SMS_SUBJECT,
    senderDisplay: sender.display,
    senderStaffName: sender.staffName,
    senderIsStaffPhone: sender.isStaffPhone,
  });
}
