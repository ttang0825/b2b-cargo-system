import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { sendSmsWithLog } from "@/lib/sendSms";
import {
  dispatchConfirmedMessage,
  pickupCompletedMessage,
  deliveryCompletedMessage,
} from "@/lib/sms/templates";

// 배차확정/상차완료/하차완료는 client가 anon 키로 dispatches를 직접 update하는
// 4곳(배차 상세의 확정 버튼·상태 드롭다운·체크박스, 배차 목록의 상태 드롭다운)에서
// 일어나서 SMS(비밀키 필요)를 그 자리에 바로 못 끼워넣는다(사전조사 1-3 결과).
// 대신 그 update가 성공한 직후 client가 이 API를 fire-and-forget으로 한 번 더
// 호출하고, 이 API가 dispatch를 다시 조회해서(client 값을 믿지 않고) 수신자와
// 문구를 정해 발송한다. 실패해도 배차확정 등 메인 액션에는 전혀 영향 없음
// (client가 응답을 기다리지 않으므로).
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
  if (!dispatch_id || !["dispatch_confirmed", "pickup_completed", "delivery_completed"].includes(event)) {
    return NextResponse.json({ error: "dispatch_id와 올바른 event가 필요합니다." }, { status: 400 });
  }

  const { data: dispatch, error: dispatchError } = await admin
    .from("dispatches")
    .select(
      "id,assignment_type,driver_id,external_driver_phone,order_id,drivers(phone),orders(order_no,origin,destination,requested_pickup_at,company_id,guest_phone,individual_customer_id,companies(contact_mobile),individual_customers(phone))"
    )
    .eq("id", dispatch_id)
    .single();
  if (dispatchError || !dispatch) {
    return NextResponse.json({ error: "배차 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const order = (dispatch as any).orders as any;

  if (event === "dispatch_confirmed") {
    const phone =
      (dispatch as any).assignment_type === "internal"
        ? (dispatch as any).drivers?.phone || null
        : (dispatch as any).external_driver_phone || null;
    await sendSmsWithLog({
      relatedType: "dispatch",
      relatedId: dispatch_id,
      templateType: "dispatch_confirmed",
      recipientType: "driver",
      recipientPhone: phone,
      message: dispatchConfirmedMessage({
        orderNo: order?.order_no || null,
        origin: order?.origin || null,
        destination: order?.destination || null,
        pickupAt: order?.requested_pickup_at || null,
      }),
    });
    return NextResponse.json({ ok: true });
  }

  // 상차완료/하차완료는 화주(고객) 대상 — 회사 연결 건은 담당자 휴대폰
  // (companies.contact_mobile), 개인고객은 individual_customers.phone,
  // 게스트는 orders.guest_phone 순으로 폴백
  const customerPhone: string | null =
    order?.companies?.contact_mobile || order?.individual_customers?.phone || order?.guest_phone || null;

  if (event === "pickup_completed") {
    await sendSmsWithLog({
      relatedType: "dispatch",
      relatedId: dispatch_id,
      templateType: "pickup_completed",
      recipientType: "customer",
      recipientPhone: customerPhone,
      message: pickupCompletedMessage({ orderNo: order?.order_no || null, origin: order?.origin || null }),
    });
  } else {
    await sendSmsWithLog({
      relatedType: "dispatch",
      relatedId: dispatch_id,
      templateType: "delivery_completed",
      recipientType: "customer",
      recipientPhone: customerPhone,
      message: deliveryCompletedMessage({ orderNo: order?.order_no || null, destination: order?.destination || null }),
    });
  }
  return NextResponse.json({ ok: true });
}
