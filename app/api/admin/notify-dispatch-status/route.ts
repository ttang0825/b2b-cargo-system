import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { dispatchConfirmedMessage, dispatchConfirmedCustomerMessage } from "@/lib/sms/templates";
import { resolveSmsSender, contactPhoneForBody } from "@/lib/smsSenderPhone";

// 배차확정은 client가 anon 키로 dispatches를 직접 update하는 4곳(배차 상세의
// 확정 버튼·상태 드롭다운·체크박스, 배차 목록의 상태 드롭다운)에서 일어나서
// SMS(비밀키 필요)를 그 자리에 바로 못 끼워넣는다(사전조사 1-3 결과).
//
// 🔴 **상차완료·하차완료 문자는 2026-09-18 에 폐지했다** — 그 두 event 는 이제
//    400 이다(사용자 확정: *「알림으로만 충분하다」*). 화주는 운송관리 알림
//    (화면 배너 + 웹 푸시)으로 받는다(HANDOFF §5-17). 🔴 **되살리지 말 것.**
// 대신 그 update가 성공한 직후 client가 이 API를 호출해서 수신자·문구
// 미리보기만 받고(**여기선 발송하지 않음**), components/SmsConfirmModal.tsx로
// 확인·수정 후 "발송"을 눌러야만 /api/admin/send-sms가 실제로 호출됨
// (PR #73 리뷰 반영 — 모든 SMS를 발송 직전에 확인·수정할 수 있게 해달라는 요청).
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

  const { dispatch_id, event } = await req.json();
  // 🔴 **상차완료·하차완료는 2026-09-18 에 빠졌다** — 지금 여기 오면 400 이다
  //    (사용자 확정: *「알림으로만 충분하다」*). 화주는 운송관리 알림으로 받는다.
  //
  // 🔴 **배차확정은 두 통이다** — 차주 `dispatch_confirmed`(화물정보 안내)와
  //    고객 `dispatch_confirmed_customer`(배차확정 안내). 이 라우트는 **한 번에
  //    한 통씩** 돌려주고, 자동 흐름에서 두 통을 차례로 띄우는 일은
  //    `lib/notifyDispatchSms.ts` 가 한다 — 수동 버튼이 **한 통만** 띄워야 해서
  //    응답을 배열로 만들지 않았다.
  if (!dispatch_id || !["dispatch_confirmed", "dispatch_confirmed_customer"].includes(event)) {
    return NextResponse.json({ error: "dispatch_id와 올바른 event가 필요합니다." }, { status: 400 });
  }

  const { data: dispatch, error: dispatchError } = await admin
    .from("dispatches")
    .select(
      // 🔴 **없는 컬럼을 적지 말 것** — PostgREST 가 42703 을 돌려주는데 이 라우트는
      //    그것을 404 「배차 정보를 찾을 수 없습니다」로 바꿔 내보낸다(원칙 55번 ·
      //    PR #152 가 견적서 공유 링크에서 정확히 그 함정을 밟았다).
      //    ⚠️ 상·하차 **조건**은 `dispatches` 에 없고 `orders` 에만 있다(실측).
      "id,assignment_type,driver_id,external_driver_name,external_driver_phone," +
        "external_vehicle_plate,external_vehicle_type,order_id," +
        "origin_company_name,origin_contact_name,origin_contact_phone," +
        "destination_company_name,destination_contact_name,destination_contact_phone," +
        "drivers(name,phone,vehicles(vehicle_number,vehicle_type))," +
        "orders(origin,destination,requested_pickup_at,requested_delivery_at,item,vehicle_type," +
        "load_condition,unload_condition,special_notes," +
        "origin_company_name,origin_contact_name,origin_contact_phone," +
        "destination_company_name,destination_contact_name,destination_contact_phone," +
        "company_id,guest_phone,individual_customer_id," +
        "companies(contact_mobile),individual_customers(phone))"
    )
    .eq("id", dispatch_id)
    .single();
  if (dispatchError || !dispatch) {
    return NextResponse.json({ error: "배차 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const d = dispatch as any;
  const order = d.orders as any;

  // 발신번호·본문 안내번호는 반드시 서버에서 세션으로 결정한다(클라이언트 입력값 신뢰 금지)
  const sender = await resolveSmsSender();
  const senderFields = {
    senderDisplay: sender.display,
    senderStaffName: sender.staffName,
    senderIsStaffPhone: sender.isStaffPhone,
  };
  const contact = { contactPhone: contactPhoneForBody(sender), staffName: sender.staffName };

  const isInternal = d.assignment_type === "internal";

  if (event === "dispatch_confirmed") {
    const phone = isInternal ? d.drivers?.phone || null : d.external_driver_phone || null;

    // 🔴 **배차 값이 먼저이고 비었으면 오더 값이다.** 상·하차지 담당자는 오더 등록 때
    //    채워져 배차로 복사되지만, 배차 담당자가 **이 배차에서만** 고칠 수 있다
    //    (배차 상세 「상차지·하차지 담당자」 카드). 마지막으로 고친 쪽이 정확하다.
    //    ⚠️ 🔴 `||` 만으로 가르지 않는다 — **공백만 남은 값**도 오더 값으로 떨어져야
    //       한다(`""` 는 falsy 라 `||` 로 걸리지만 `" "` 는 안 걸린다).
    const pick = (a: string | null | undefined, b: string | null | undefined) =>
      ((a || "").trim() ? a : b) || null;

    return NextResponse.json({
      relatedType: "dispatch",
      relatedId: dispatch_id,
      templateType: "dispatch_confirmed",
      recipientType: "driver",
      recipientPhone: phone,
      message: dispatchConfirmedMessage({
        origin: order?.origin || null,
        destination: order?.destination || null,
        pickupAt: order?.requested_pickup_at || null,
        deliveryAt: order?.requested_delivery_at || null,
        originCompanyName: pick(d.origin_company_name, order?.origin_company_name),
        originContactName: pick(d.origin_contact_name, order?.origin_contact_name),
        originContactPhone: pick(d.origin_contact_phone, order?.origin_contact_phone),
        destinationCompanyName: pick(d.destination_company_name, order?.destination_company_name),
        destinationContactName: pick(d.destination_contact_name, order?.destination_contact_name),
        destinationContactPhone: pick(d.destination_contact_phone, order?.destination_contact_phone),
        loadCondition: order?.load_condition || null,
        unloadCondition: order?.unload_condition || null,
        item: order?.item || null,
        specialNotes: order?.special_notes || null,
        ...contact,
      }),
      ...senderFields,
    });
  }

  // ── 고객용 배차확정 안내 ────────────────────────────────────────────────
  //
  // 🔴 받는 번호는 상차·하차완료가 쓰던 그대로다 —
  //    화주 담당자 휴대폰 → 개인고객 전화 → 게스트 연락처.
  const companyPhone: string | null =
    order?.companies?.contact_mobile || order?.individual_customers?.phone || order?.guest_phone || null;

  // 🔴 **차종은 「실제로 온 차」가 먼저다.** 내부 배정은 등록된 차량의 차종, 외부 배정은
  //    담당자가 배차 상세에 적은 `external_vehicle_type`. 둘 다 비었을 때만 **오더의
  //    요청 차종**으로 떨어진다 — 이 문자의 목적이 *「잘못된 차량배차를 사전에 발견」*
  //    (사용자 원문)하는 것이라, 요청 차종을 먼저 쓰면 문자가 **스스로를 확인해 항상
  //    맞는 것처럼 보인다.**
  //    ⚠️ 운영 배차는 전부 외부 배정이다(`_verify.sql` ㉚-f) — 이쪽이 기본 경로다.
  const vehicleType = isInternal
    ? d.drivers?.vehicles?.[0]?.vehicle_type || order?.vehicle_type || null
    : d.external_vehicle_type || order?.vehicle_type || null;

  return NextResponse.json({
    relatedType: "dispatch",
    relatedId: dispatch_id,
    templateType: "dispatch_confirmed_customer",
    recipientType: "customer",
    recipientPhone: companyPhone,
    message: dispatchConfirmedCustomerMessage({
      origin: order?.origin || null,
      destination: order?.destination || null,
      pickupAt: order?.requested_pickup_at || null,
      deliveryAt: order?.requested_delivery_at || null,
      driverName: isInternal ? d.drivers?.name || null : d.external_driver_name || null,
      driverPhone: isInternal ? d.drivers?.phone || null : d.external_driver_phone || null,
      vehicleNumber: isInternal
        ? d.drivers?.vehicles?.[0]?.vehicle_number || null
        : d.external_vehicle_plate || null,
      vehicleType,
      ...contact,
    }),
    ...senderFields,
  });
}
