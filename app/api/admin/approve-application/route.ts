import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
// 🔴 화주 항목 정의·payload 조립은 이 파일 하나다(33차 A장) — 여기서 컬럼을
//    직접 조립하면 온라인 신청으로 만든 화주만 빈칸으로 남는다.
import { buildCompanyPayload, emptyCompanyForm } from "@/lib/companyFields";
import { issuePortalAccount } from "@/lib/portalAccountCredentials";
import { applicationApprovedWithAccountMessage } from "@/lib/sms/templates";
import { getPortalLoginUrl } from "@/lib/siteUrl";
import { resolveSmsSender, contactPhoneForBody } from "@/lib/smsSenderPhone";

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
  //
  // 🔴 세 번째 입구다 — 신규 등록 폼·상세 수정 폼과 **같은 정의·같은 payload 함수**를
  //    쓴다(33차 A장). 여기서 직접 컬럼을 조립하면 온라인으로 들어온 화주만 계속
  //    빈칸으로 남는다(그게 이 차수 전의 상태였다).
  //
  // 🔴 「월 예상 운송건수」는 대응 컬럼(`monthly_expected_orders`, integer)에 넣는다 —
  //    전에는 `notes` 문자열에 뭉쳐 넣어서 **검색·필터가 안 됐다.**
  //    ⚠️ 신청서 쪽은 자유 텍스트(`text`)라 「30건 정도」처럼 숫자로 못 읽는 값이 온다.
  //       그때는 컬럼을 비우고 원문을 `notes` 에 남긴다 — 값을 잃지 않는 쪽을 고른다.
  const rawVolume = (application.monthly_volume_estimate || "").trim();
  const volumeDigits = rawVolume.replace(/[^0-9]/g, "");
  const parsedVolume =
    volumeDigits && Number(volumeDigits) > 0 && Number(volumeDigits) < 100000
      ? Number(volumeDigits)
      : null;

  // 🔴 `manual_source_note` 에 넣지 말 것 — 출처분류가 「기타」일 때만 쓰는 전용 칸이라,
  //    나중에 담당자가 분류를 「기타」로 바꾸면 엉뚱한 글이 화면에 나타난다(CLAUDE.md §7).
  const noteParts = [
    // 숫자로 읽힌 값은 컬럼에 들어갔으므로 메모에 다시 적지 않는다(중복 표시 방지).
    parsedVolume === null && rawVolume ? `월 예상 운송건수: ${rawVolume}` : null,
    application.notes ? `신청 메모: ${application.notes}` : null,
  ].filter(Boolean);

  // 신청서 값을 폼과 같은 모양으로 만든 뒤 공통 함수에 넘긴다.
  // ⚠️ 신청서에 대응 항목이 없는 컬럼은 빈 값으로 남고, 담당자가 승인 직후
  //    화주 상세 화면에서 채운다(승인 화면에서 바로 채우게 하지는 않는다).
  const approvedForm: Record<string, any> = {
    ...emptyCompanyForm(),
    name: application.company_name,
    biz_reg_no: application.business_reg_no || "",
    contact_name: application.contact_name || "",
    contact_mobile: application.contact_phone || "",
    contact_email: application.contact_email || "",
    address: application.main_origin || "",
    status: "견적요청",
    industry: application.industry || "",
    monthly_expected_orders: parsedVolume === null ? "" : parsedVolume,
    main_pickup_region: application.preferred_regions || "",
    main_dropoff_region: application.preferred_regions || "",
    main_pickup_address: application.main_origin || "",
    main_pickup_sido: application.main_origin_sido || "",
    main_pickup_sigungu: application.main_origin_sigungu || "",
    main_dropoff_address: application.main_destination || "",
    main_dropoff_sido: application.main_destination_sido || "",
    main_dropoff_sigungu: application.main_destination_sigungu || "",
    manual_source_type: "온라인 등록신청",
    notes: noteParts.length > 0 ? noteParts.join(" / ") : "",
  };

  // 🔴 신청서에는 톤수+형태가 아니라 단일 값(`preferred_vehicle`)이 온다 —
  //    `buildCompanyPayload` 가 두 칸을 합치는 것을 덮어써서 원문을 그대로 넣는다.
  const payload = buildCompanyPayload(approvedForm);
  payload.recommended_vehicle = application.preferred_vehicle || null;
  payload.created_by = staff?.id || null;

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert(payload)
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
      // ⚠️ 승인 건은 `company_id` 가 붙어 파기 대상에서 빠지므로 이 값이 파기 판정에
      //    쓰이지는 않는다. 그래도 채우는 것은 「처리 완료 시각」이라는 컬럼의 뜻을
      //    승인·거절·보류 셋에서 같게 유지하려는 것이다(비어 있으면 다음에 헷갈린다).
      processed_at: new Date().toISOString(),
      updated_by: staff?.id || null,
    })
    .eq("id", application_id);

  // 5. 승인 안내 SMS 미리보기(발송은 안 함) — 승인과 동시에 포털계정도 발급되므로
  // "승인"과 "계정발급" 문구를 따로 두 통 보내지 않고 하나로 합침(사전조사 1-6
  // 결정사항). 실제 발송은 client가 이 미리보기를 SmsConfirmModal로 보여주고
  // 확인·수정한 뒤 /api/admin/send-sms를 호출해야만 일어남(PR #73 리뷰 반영).
  // 발신번호·본문 안내번호는 반드시 서버에서 세션으로 결정한다(클라이언트 입력값 신뢰 금지)
  const sender = await resolveSmsSender();
  const senderFields = {
    senderDisplay: sender.display,
    senderStaffName: sender.staffName,
    senderIsStaffPhone: sender.isStaffPhone,
  };
  const contact = { contactPhone: contactPhoneForBody(sender), staffName: sender.staffName };

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
      ...contact,
    }),
    ...senderFields,
  };

  return NextResponse.json({
    login_id: issued.login_id,
    password: issued.password,
    email: issued.email,
    company_id: company.id,
    smsPreview,
  });
}
