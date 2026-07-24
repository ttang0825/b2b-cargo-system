import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }

  const body = await req.json();
  const {
    company_name,
    business_reg_no,
    contact_name,
    contact_phone,
    contact_email,
    main_origin,
    main_destination,
    monthly_volume_estimate,
    notes,
  } = body;

  if (!company_name?.trim() || !contact_name?.trim() || !contact_phone?.trim() || !contact_email?.trim()) {
    return NextResponse.json({ error: "회사명, 담당자명, 담당자 연락처, 담당자 이메일은 필수입니다." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 같은 업체의 기존 신청 이력을 이메일·사업자등록번호 기준으로 조회 (재신청 여부 판단용)
  const email = contact_email.trim();
  const bizRegNo = business_reg_no?.trim() || null;

  const { data: emailMatches, error: emailError } = await admin
    .from("customer_applications")
    .select("id,status,company_id")
    .eq("contact_email", email);
  if (emailError) {
    return NextResponse.json({ error: emailError.message }, { status: 400 });
  }

  let bizMatches: { id: string; status: string; company_id: string | null }[] = [];
  if (bizRegNo) {
    const { data, error: bizError } = await admin
      .from("customer_applications")
      .select("id,status,company_id")
      .eq("business_reg_no", bizRegNo);
    if (bizError) {
      return NextResponse.json({ error: bizError.message }, { status: 400 });
    }
    bizMatches = data || [];
  }

  const existing = [...(emailMatches || []), ...bizMatches];

  // 이미 승인되어 화주로 등록된 업체는 재신청 대신 화주포털 로그인으로 안내
  if (existing.some((r) => r.company_id)) {
    return NextResponse.json(
      { error: "이미 등록된 화주입니다. 화주포털로 로그인해주세요.", reason: "approved" },
      { status: 409 }
    );
  }

  // 검토중인 신청이 이미 있으면 중복 접수 방지 (거절·보류 이력은 재신청 허용)
  if (existing.some((r) => r.status === "검토중")) {
    return NextResponse.json(
      { error: "이미 접수되어 검토 중인 신청이 있습니다. 담당자 확인 후 연락드리겠습니다.", reason: "pending" },
      { status: 409 }
    );
  }

  const { error: insertError } = await admin.from("customer_applications").insert({
    company_name,
    business_reg_no: bizRegNo,
    contact_name,
    contact_phone,
    contact_email: email,
    main_origin: main_origin || null,
    main_destination: main_destination || null,
    monthly_volume_estimate: monthly_volume_estimate || null,
    notes: notes || null,
    status: "검토중",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
