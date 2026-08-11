import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { sendSmsWithLog } from "@/lib/sendSms";
import { quoteSummaryMessage } from "@/lib/sms/templates";

// 견적 안내는 자동발송이 아니라 견적 상세의 "견적서 출력(PDF)" 옆 수동 버튼으로만
// 나감(사전조사 1-3 결과 — 견적 상태값이 내부 영업퍼널 단계라 상태 변경마다
// 자동으로 문자를 보내면 의도치 않게 반복 발송될 수 있음)
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
    .select("id,vehicle_type,final_amount,requested_pickup_at,guest_phone,company_id,companies(contact_mobile)")
    .eq("id", quote_id)
    .single();
  if (quoteError || !quote) {
    return NextResponse.json({ error: "견적 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const phone: string | null = (quote as any).companies?.contact_mobile || quote.guest_phone || null;

  await sendSmsWithLog({
    relatedType: "quote",
    relatedId: quote_id,
    templateType: "quote_summary",
    recipientType: "customer",
    recipientPhone: phone,
    message: quoteSummaryMessage({
      vehicleType: quote.vehicle_type,
      finalAmount: quote.final_amount,
      pickupAt: quote.requested_pickup_at,
    }),
    sentBy: staff.id,
  });

  if (!phone) {
    return NextResponse.json({ error: "수신자 전화번호가 없어 발송하지 못했습니다." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
