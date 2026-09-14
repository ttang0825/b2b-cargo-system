import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { calcMargin } from "@/lib/marginCalc";

// 정산 건을 **배차의 현재 값으로 다시 맞추는** 경로 (35차 A-7 · PR #146 리뷰 1라운드).
//
// 🔴 **왜 필요한가** — `invoices` 의 금액은 생성 시점 스냅샷이라(원칙 47번) 정산 건이
//    먼저 만들어진 뒤에 배차에서 운임을 적으면 **영영 따라오지 않는다.** 그런데 그
//    스냅샷을 고칠 경로가 코드 어디에도 없었다 — 정산 상세의 금액 칸은 읽기 전용이고
//    `invoices/save` 화이트리스트에도 금액·부가세 구분이 없다. 그래서 「예전 오더의
//    마진·수수료가 틀렸는데 고칠 수가 없다」가 됐다(사용자 신고 2026-09-13).
//    ⚠️ `lib/autoCreateInvoice.ts` 주석이 *"뒤늦게 맞추는 것은 담당자가 화면에서 하는
//    별도 경로다"* 라고 적고 있었는데 **그 경로가 실제로는 없었다.** 이 파일이 그것이다.
//
// 🔴 **원칙 47번을 어기는 것이 아니다.** 그 원칙이 금지하는 것은 「나중에 생긴 **추가**
//    금액(현장 추가비)을 스냅샷에 직접 더하는 것」이고, 그건 지금도 그대로 금지다
//    (아래 추가비 필터 참고). 이 라우트는 **처음부터 틀리게 얼려진 기준 금액을
//    바로잡는 것**이라 성격이 다르다. 그래서 ① 사유를 반드시 받고 ② 전/후를
//    `invoice_amendment_logs` 에 남기고 ③ 확정(잠금) 건은 관리자만 할 수 있다.
//
// 🔴 **추가비를 이중으로 세지 말 것** — 정산 상세는 `created_at > invoice.created_at`
//    인 활성 추가비를 **표시 시점에** 더한다(원칙 51번). 그래서 여기서 스냅샷에
//    넣는 추가비는 생성 시점과 똑같이 **`created_at <= invoice.created_at`** 인
//    것뿐이다. 이 필터를 빼면 그 뒤에 등록된 추가비가 스냅샷과 화면 양쪽에
//    들어가 **두 번 청구된다.**
//
// 🔴 **`created_at` 을 건드리지 말 것** — 위 필터의 기준선이라 바꾸는 순간 어떤
//    추가비가 스냅샷 안에 있는지가 달라진다.
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { id, reason } = body as { id: string; reason?: string };
  if (!id) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  // 🔴 사유는 잠금 여부와 무관하게 **항상** 받는다 — 금액을 바꾸는 일이라
  //    "누가 왜 바꿨는지"가 남지 않으면 나중에 대조할 근거가 사라진다.
  if (!reason || !reason.trim()) {
    return NextResponse.json({ error: "다시 맞추려면 사유를 입력해야 합니다." }, { status: 400 });
  }

  // 클라이언트가 들고 있는 값이 아니라 저장 직전 fresh 조회(원칙 44번)
  const { data: current, error: fetchError } = await admin
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 });
  if (!current) return NextResponse.json({ error: "정산 건을 찾을 수 없습니다." }, { status: 404 });

  if (current.locked && currentStaff.role !== "admin") {
    return NextResponse.json(
      { error: "확정(잠금)된 정산 건입니다. 관리자만 다시 맞출 수 있습니다." },
      { status: 403 }
    );
  }

  if (!current.order_id) {
    return NextResponse.json(
      { error: "오더에 연결되지 않은 정산 건이라 배차에서 가져올 값이 없습니다." },
      { status: 400 }
    );
  }

  // 🔴 `.maybeSingle()` 을 쓰지 않는다 — 한 오더에 배차가 2건 이상일 때 에러를
  //    던져버린다(원칙 48번과 같은 결). 가장 최근 배차를 기준으로 본다.
  const { data: dispatchRows, error: dispatchError } = await admin
    .from("dispatches")
    .select("*")
    .eq("order_id", current.order_id)
    .order("created_at", { ascending: false })
    .limit(1);
  if (dispatchError) return NextResponse.json({ error: dispatchError.message }, { status: 400 });
  const dispatch = dispatchRows && dispatchRows[0];
  if (!dispatch) {
    return NextResponse.json(
      { error: "이 오더에 배차 건이 없어 가져올 값이 없습니다." },
      { status: 400 }
    );
  }

  // 스냅샷에 들어가야 할 추가비 = 생성 시점 기준(위 주석 참고).
  // 정정청구로 따로 떼어낸 추가비(`correction_invoice_id` 있음)는 제외한다.
  const { data: extraRows, error: extraError } = await admin
    .from("dispatch_extra_charges")
    .select("customer_charge_amount,driver_payout_amount,created_at,status,correction_invoice_id")
    .eq("dispatch_id", dispatch.id)
    .eq("status", "active")
    .is("correction_invoice_id", null)
    .lte("created_at", current.created_at);
  if (extraError) return NextResponse.json({ error: extraError.message }, { status: 400 });

  const extraCharge = (extraRows || []).reduce(
    (s: number, e: any) => s + (e.customer_charge_amount || 0),
    0
  );
  const extraPayout = (extraRows || []).reduce(
    (s: number, e: any) => s + (e.driver_payout_amount || 0),
    0
  );

  const charge = (dispatch.customer_charge || 0) + extraCharge;
  const payout = (dispatch.driver_payout || 0) + extraPayout;

  // 🔴 A-1 과 같은 규칙 — 받을 돈·줄 돈은 수금방식이 정한다.
  //    `lib/autoCreateInvoice.ts` 와 **같은 식**이어야 한다. 한쪽만 고치면 새로
  //    만든 건과 다시 맞춘 건이 조용히 갈린다.
  const collectionMethod = dispatch.collection_method || "broker";
  const isDirect = collectionMethod === "driver_direct";
  const fee = dispatch.brokerage_fee ?? null;

  // 🔴 마진도 `lib/marginCalc.ts` 하나로 — 화면은 이 저장값을 읽지 않지만
  //    (표시 시점 계산), 저장값이 옛 공식으로 남으면 다시 갈린다.
  const commission = calcMargin({
    collectionMethod,
    customerCharge: charge,
    customerChargeVatIncluded: !!dispatch.customer_charge_vat_included,
    driverPayout: payout,
    driverVatIncluded: !!dispatch.driver_vat_included,
    brokerageFee: fee,
  });

  const patch: Record<string, any> = {
    customer_charge_total: charge || null,
    driver_payout_total: payout || null,
    commission_total: commission || null,
    receivable_amount: isDirect ? fee : charge || null,
    payable_amount: isDirect ? 0 : payout || null,
    customer_charge_vat_included: !!dispatch.customer_charge_vat_included,
    driver_vat_included: !!dispatch.driver_vat_included,
    settlement_type: dispatch.settlement_type || current.settlement_type || "general",
    collection_method: collectionMethod,
    direct_collection_point:
      dispatch.direct_collection_point ?? current.direct_collection_point ?? null,
    brokerage_fee: fee,
    total_freight_amount: dispatch.total_freight_amount ?? charge ?? null,
    driver_direct_collection_amount: dispatch.driver_direct_collection_amount ?? null,
    updated_by: currentStaff.id,
  };

  // 🔴 `billing_cycle`(청구주기)은 **건드리지 않는다** — 화주별 계약이라 담당자가
  //    정산 쪽에서 정하는 값이고 배차에 정본이 없다(27차 4라운드 확정).
  // 🔴 입금·지급 완료 플래그도 건드리지 않는다 — 실제로 돈이 오갔는지는 배차가
  //    아니라 담당자가 아는 사실이다. 되돌리면 받은 돈이 안 받은 것이 된다.

  const { error: updateError } = await admin.from("invoices").update(patch).eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  const { error: logError } = await admin.from("invoice_amendment_logs").insert({
    invoice_id: id,
    staff_id: currentStaff.id,
    before_json: current,
    after_json: { ...current, ...patch },
    reason: `[배차 기준 재동기화] ${reason.trim()}`,
  });
  if (logError) return NextResponse.json({ error: logError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
