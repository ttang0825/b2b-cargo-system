import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordConsents } from "@/lib/consent";

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
    main_origin_sido,
    main_origin_sigungu,
    main_destination,
    main_destination_sido,
    main_destination_sigungu,
    monthly_volume_estimate,
    industry,
    preferred_regions,
    preferred_vehicle,
    notes,
    agreed,
    termsAgreed,
  } = body;

  if (!company_name?.trim() || !contact_name?.trim() || !contact_phone?.trim()) {
    return NextResponse.json({ error: "회사명, 담당자명, 담당자 연락처는 필수입니다." }, { status: 400 });
  }
  // 🔴 화면에서 이미 막지만 서버에서도 확인한다(원칙 25번) — 브라우저 콘솔에서 직접
  // 호출하면 화면 검증은 우회되고, 동의 없이 접수된 건이 남으면 기록의 의미가 없다.
  // 🔴 **게이트가 두 개다**(18차). 법 제22조 1항이 각각 구분해 받도록 하고 있어
  // 동의도 검증도 항목별로 따로 한다 — 한쪽만 확인하면 다른 쪽은 동의 없이 통과한다.
  // ⚠️ `!== true` **엄격 비교**여야 한다. `!x`로 쓰면 문자열 `"true"`나 `1`이 통과한다.
  if (termsAgreed !== true) {
    return NextResponse.json(
      { error: "이용약관에 동의해주셔야 신청을 접수할 수 있습니다." },
      { status: 400 }
    );
  }
  if (agreed !== true) {
    return NextResponse.json(
      { error: "개인정보 수집·이용에 동의해주셔야 신청을 접수할 수 있습니다." },
      { status: 400 }
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 같은 업체의 기존 신청 이력을 이메일·사업자등록번호 기준으로 조회 (재신청 여부 판단용)
  const email = contact_email?.trim() || null;
  const bizRegNo = business_reg_no?.trim() || null;

  let emailMatches: { id: string; status: string; company_id: string | null }[] = [];
  if (email) {
    const { data, error: emailError } = await admin
      .from("customer_applications")
      .select("id,status,company_id")
      .eq("contact_email", email);
    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 400 });
    }
    emailMatches = data || [];
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
      { error: "이미 등록된 고객입니다. 로그인해주세요.", reason: "approved" },
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

  const { data: inserted, error: insertError } = await admin.from("customer_applications").insert({
    company_name,
    business_reg_no: bizRegNo,
    contact_name,
    contact_phone,
    contact_email: email,
    main_origin: main_origin || null,
    main_origin_sido: main_origin_sido || null,
    main_origin_sigungu: main_origin_sigungu || null,
    main_destination: main_destination || null,
    main_destination_sido: main_destination_sido || null,
    main_destination_sigungu: main_destination_sigungu || null,
    monthly_volume_estimate: monthly_volume_estimate || null,
    industry: industry || null,
    preferred_regions: preferred_regions || null,
    preferred_vehicle: preferred_vehicle || null,
    notes: notes || null,
    status: "검토중",
  })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message || "신청 접수 중 오류가 발생했습니다." },
      { status: 400 }
    );
  }

  // 🔴 동의 기록. 트랜잭션이 없으므로 여기서 실패하면 **동의 없는 신청서가 남는다** —
  // 방금 만든 행을 되돌린다(quote-submit·approve-application과 같은 롤백 패턴).
  const { error: consentError } = await recordConsents(admin, {
    subjectType: "application",
    subjectId: inserted.id,
    source: "/apply",
  });

  if (consentError) {
    await admin.from("customer_applications").delete().eq("id", inserted.id);
    return NextResponse.json(
      { error: "신청 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
