import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { issuePortalAccount } from "@/lib/portalAccountCredentials";
import { applicationApprovedWithAccountMessage } from "@/lib/sms/templates";
import { getPortalLoginUrl } from "@/lib/siteUrl";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { application_id, processed_by } = await req.json();
  if (!application_id) {
    return NextResponse.json({ error: "신청 정보가 필요합니다." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const staff = await getCurrentStaff();

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
  // "월 예상 운송건수"/"신청 메모"는 일반 메모(notes)로 남김 — manual_source_note는
  // 출처분류가 "기타"일 때만 쓰는 "기타 출처 설명" 전용 칸이라 여기 넣으면 안 됨
  // (넣으면 나중에 담당자가 출처분류를 "기타"로 바꿀 때 엉뚱한 텍스트가 자동으로 보임)
  const noteParts = [
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
      address: application.main_origin || null,
      status: "견적요청",
      industry: application.industry || null,
      main_pickup_region: application.preferred_regions || null,
      main_dropoff_region: application.preferred_regions || null,
      main_pickup_address: application.main_origin || null,
      main_pickup_sido: application.main_origin_sido || null,
      main_pickup_sigungu: application.main_origin_sigungu || null,
      main_dropoff_address: application.main_destination || null,
      main_dropoff_sido: application.main_destination_sido || null,
      main_dropoff_sigungu: application.main_destination_sigungu || null,
      recommended_vehicle: application.preferred_vehicle || null,
      manual_source_type: "온라인 등록신청",
      notes: noteParts.length > 0 ? noteParts.join(" / ") : null,
      created_by: staff?.id || null,
    })
    .select("id")
    .single();

  if (companyError || !company) {
    return NextResponse.json(
      { error: companyError?.message || "화주 회사 등록에 실패했습니다." },
      { status: 400 }
    );
  }

  // 주요 출발지/도착지가 입력된 신청 건은 승인 즉시 화주 상세의 "저장된 주소"에도
  // 상차지/하차지로 각 1건씩 반영 (동일 주소가 이미 있으면 중복 생성하지 않음)
  const locationsToInsert = [
    application.main_origin
      ? {
          company_id: company.id,
          address: application.main_origin,
          location_type: "상차지",
          sido: application.main_origin_sido || null,
          sigungu: application.main_origin_sigungu || null,
        }
      : null,
    application.main_destination
      ? {
          company_id: company.id,
          address: application.main_destination,
          location_type: "하차지",
          sido: application.main_destination_sido || null,
          sigungu: application.main_destination_sigungu || null,
        }
      : null,
  ].filter(Boolean) as { company_id: string; address: string; location_type: string; sido: string | null; sigungu: string | null }[];

  if (locationsToInsert.length > 0) {
    const { data: existingLocations } = await admin
      .from("customer_locations")
      .select("address,location_type")
      .eq("company_id", company.id);
    const toInsert = locationsToInsert.filter(
      (loc) =>
        !(existingLocations || []).some(
          (e) => e.address === loc.address && e.location_type === loc.location_type
        )
    );
    if (toInsert.length > 0) {
      await admin.from("customer_locations").insert(toInsert);
    }
  }

  // 3. 포털 계정 발급 (Auth 사용자 생성 + customer_accounts 연결) — 로그인 아이디는
  // 자동 생성되므로 관리자가 이메일을 입력할 필요 없음. 신청서에 담당자 이메일이
  // 있으면 그대로 "연락처 이메일"(로그인용 아님)로만 이어받음.
  const { data: issued, error: issueError } = await issuePortalAccount(admin, {
    company_id: company.id,
    name: application.contact_name,
    email: application.contact_email || null,
    contact_mobile: application.contact_phone,
  });

  if (!issued) {
    // 실패 시 방금 만든 화주 회사를 롤백(삭제) - 고아 데이터/중복 방지
    await admin.from("companies").delete().eq("id", company.id);
    return NextResponse.json(
      { error: issueError || "포털 계정 생성에 실패했습니다." },
      { status: 400 }
    );
  }

  // 4. 신청서 상태 갱신 (모든 단계가 성공했을 때만 도달)
  await admin
    .from("customer_applications")
    .update({
      status: "승인됨",
      company_id: company.id,
      processed_by: processed_by || null,
      updated_by: staff?.id || null,
    })
    .eq("id", application_id);

  // 5. 승인 안내 SMS 미리보기(발송은 안 함) — 승인과 동시에 포털계정도 발급되므로
  // "승인"과 "계정발급" 문구를 따로 두 통 보내지 않고 하나로 합침(사전조사 1-6
  // 결정사항). 실제 발송은 client가 이 미리보기를 SmsConfirmModal로 보여주고
  // 확인·수정한 뒤 /api/admin/send-sms를 호출해야만 일어남(PR #73 리뷰 반영).
  const smsPreview = {
    relatedType: "application" as const,
    relatedId: application_id,
    templateType: "application_approved" as const,
    recipientType: "applicant" as const,
    recipientPhone: application.contact_phone || null,
    message: applicationApprovedWithAccountMessage({
      companyName: application.company_name,
      loginId: issued.login_id,
      password: issued.password,
      portalUrl: getPortalLoginUrl(),
    }),
  };

  return NextResponse.json({
    login_id: issued.login_id,
    password: issued.password,
    email: issued.email,
    company_id: company.id,
    smsPreview,
  });
}
