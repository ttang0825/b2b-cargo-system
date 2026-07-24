import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function randomPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

function translateAuthError(message: string, email: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already been registered") || lower.includes("already registered")) {
    return `이미 등록된 이메일입니다 (${email}). 화주 관리에서 같은 이메일의 기존 계정이 있는지 먼저 확인해주세요.`;
  }
  if (lower.includes("invalid") && lower.includes("email")) {
    return "올바르지 않은 이메일 형식입니다.";
  }
  return message;
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { application_id, portal_email, processed_by } = await req.json();
  if (!application_id || !portal_email) {
    return NextResponse.json({ error: "신청 정보와 포털 로그인 이메일이 필요합니다." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. 신청서 조회
  const { data: application, error: fetchError } = await admin
    .from("customer_applications")
    .select("*")
    .eq("id", application_id)
    .single();
  if (fetchError || !application) {
    return NextResponse.json({ error: "신청 정보를 찾을 수 없습니다." }, { status: 404 });
  }
  // 이미 처리된 신청은 다시 승인 못 하도록 차단 (중복 화주 생성 방지)
  if (application.status === "승인됨" || application.company_id) {
    return NextResponse.json(
      { error: "이미 승인 처리된 신청입니다. 화주 관리에서 해당 회사를 확인해주세요." },
      { status: 400 }
    );
  }

  // 2. 화주 회사 신규 등록
  const extraNoteParts = [
    application.main_origin ? `주요 출발지: ${application.main_origin}` : null,
    application.main_destination ? `주요 도착지: ${application.main_destination}` : null,
    application.monthly_volume_estimate ? `월 예상 운송건수: ${application.monthly_volume_estimate}` : null,
    application.notes ? `신청 메모: ${application.notes}` : null,
  ].filter(Boolean);

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: application.company_name,
      biz_reg_no: application.business_reg_no || null,
      contact_name: application.contact_name,
      contact_mobile: application.contact_phone,
      contact_email: application.contact_email || null,
      status: "견적요청",
      industry: application.industry || null,
      main_pickup_region: application.preferred_regions || null,
      main_dropoff_region: application.preferred_regions || null,
      recommended_vehicle: application.preferred_vehicle || null,
      manual_source_type: "온라인 등록신청",
      manual_source_note: extraNoteParts.length > 0 ? extraNoteParts.join(" / ") : null,
    })
    .select("id")
    .single();

  if (companyError || !company) {
    return NextResponse.json(
      { error: companyError?.message || "화주 회사 등록에 실패했습니다." },
      { status: 400 }
    );
  }

  // 3. 포털 계정 발급 (Auth 사용자 생성 + customer_accounts 연결)
  const tempPassword = randomPassword();
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: portal_email,
    password: tempPassword,
    email_confirm: true,
  });

  if (userError || !userData?.user) {
    // 실패 시 방금 만든 화주 회사를 롤백(삭제) - 고아 데이터/중복 방지
    await admin.from("companies").delete().eq("id", company.id);
    return NextResponse.json(
      { error: translateAuthError(userError?.message || "포털 계정 생성에 실패했습니다.", portal_email) },
      { status: 400 }
    );
  }

  const { error: linkError } = await admin.from("customer_accounts").insert({
    auth_user_id: userData.user.id,
    company_id: company.id,
    name: application.contact_name,
    email: portal_email,
    contact_mobile: application.contact_phone,
    must_change_password: true,
  });

  if (linkError) {
    // 여기서 실패해도 마찬가지로 전부 롤백
    await admin.auth.admin.deleteUser(userData.user.id);
    await admin.from("companies").delete().eq("id", company.id);
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  // 4. 신청서 상태 갱신 (모든 단계가 성공했을 때만 도달)
  await admin
    .from("customer_applications")
    .update({ status: "승인됨", company_id: company.id, processed_by: processed_by || null })
    .eq("id", application_id);

  return NextResponse.json({ email: portal_email, password: tempPassword, company_id: company.id });
}
