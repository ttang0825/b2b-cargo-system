// 정산 자동등록 — 배차가 「운송완료」가 될 때 그 오더에 정산 건이 없으면 만든다.
//
// 🔴 **이 파일이 유일한 정의처다**(35차 A-6). 그전에는 같은 이름의 함수가
//    `app/admin/dispatches/[id]/page.tsx` 와 `app/admin/dispatches/page.tsx`
//    **두 곳에 각각** 있었고, 실제로 한 번 갈렸다 — 목록 쪽에는
//    *"예전부터 settlement_type 자체가 누락돼있던 버그가 있었음"* 이라는
//    주석이 남아 있다. 🔴 **화면 파일에 다시 만들지 말 것.**
//
// 🔴 24시콜 가져오기 차수(ⓒ 정산 엑셀로 운송완료)가 이 함수를 그대로 부른다.
//    이름과 위치를 바꾸려면 그 설계서도 같이 고칠 것.
//
// 🔴 **월정산 건이면 묶음도 여기서 자동으로 붙는다**(2026-09-15, 맨 아래 참고) —
//    `/api/admin/billing-batches/auto-attach` 를 fire-and-forget 으로 부른다.
//
// 🔴 **수금방식에 따라 「받을 돈·줄 돈」이 다르다**(35차 A-1 · 사용자 확정 2026-09-11).
//
//      broker(주선사정산)    화주 ──청구액──▶ 위캐리 ──지급액──▶ 차주
//                            받을 돈 = 화주 청구액 · 줄 돈 = 차주 지급액
//
//      driver_direct(선착불)  화주 ──합계──▶ 차주 · 차주 ──수수료──▶ 위캐리
//                            받을 돈 = **주선수수료** · 줄 돈 = **0**
//                            🔴 화주 청구액이 아니다. 그 돈은 위캐리를 안 거친다.
//
//    ⚠️ 그전에는 수금방식과 무관하게 「받을 돈 = 화주 청구액 · 줄 돈 = 차주 지급액」
//       으로 만들었고, 그래서 선착불 건의 미수금이 실제보다 훨씬 크게 잡혔다.
//
// 🔴 `customer_charge_total`·`driver_payout_total` 은 **생성 시점 스냅샷**이다
//    (원칙 47번). 이 함수는 만들 때 한 번만 쓰고, 그 뒤 배차 운임이 바뀌어도
//    자동으로 따라가지 않는다 — 따라가게 만들면 확정된 과거 정산이 흔들린다.
//
//    🔴 **뒤늦게 맞추는 경로는 `app/api/admin/invoices/resync/route.ts` 다**(35차 A-7).
//       ⚠️ 이 주석은 한동안 *"담당자가 화면에서 하는 별도 경로다"* 라고만 적고 있었는데
//       **그 경로가 실제로는 없었다** — 정산 상세의 금액 칸은 읽기 전용이고
//       `invoices/save` 화이트리스트에도 금액·부가세 구분이 없어서, 옛 건의 마진·수수료가
//       틀려도 고칠 방법이 하나도 없었다(사용자 신고 2026-09-13, PR #146 리뷰 1라운드).
//       🔴 **두 파일의 받을 돈·줄 돈 계산식은 같아야 한다** — 한쪽만 고치면 새로 만든
//       건과 다시 맞춘 건이 조용히 갈린다.

import { supabase } from "./supabaseClient";
import { fetchActiveExtraCharges } from "./fetchDispatchExtraCharges";
import { calcMargin } from "./marginCalc";
import { getCurrentStaffId } from "./currentStaff";

export type AutoCreateInvoiceInput = {
  /** 배차 행의 id — 현장 추가비를 찾는 데 쓴다 */
  dispatchId: string;
  /** 정산을 붙일 오더 id */
  orderId: string | null | undefined;

  customerCharge: number | null;
  driverPayout: number | null;

  settlementType: string | null | undefined;
  collectionMethod: string | null | undefined;
  billingCycle: string | null | undefined;
  directCollectionPoint: string | null | undefined;
  networkSettlementType: string | null | undefined;

  totalFreightAmount: number | null;
  driverDirectCollectionAmount: number | null;
  /** 🔴 주선수수료는 **부가세 포함가**로 기입한다(사용자 6·9번 확정, 35차 A-3) */
  brokerageFee: number | null;

  /** 화주 청구금액이 부가세 포함가인가. 기본 false = 공급가액 (35차 A-3) */
  customerChargeVatIncluded?: boolean;
  /** 차주 지급금액이 부가세 포함가인가. 기본 false = 공급가액 */
  driverVatIncluded?: boolean;

  /** 운송완료로 넘어간 시각 — 선착불의 입금·지급 완료일로 쓴다 */
  completedOn?: string;
};

// 🔴 판별자는 **문자열**이다 — 이 저장소는 `strict: false` 라 boolean(`created`)
//    으로는 타입이 안 좁혀진다(32차가 `kind: "ok"|"failed"|"locked"` 로 같은 자리를
//    겪었고, 이번에도 boolean 으로 짰다가 그대로 컴파일 에러가 났다).
export type AutoCreateInvoiceResult = {
  kind: "created" | "skipped" | "error";
  /** kind === "skipped" 일 때만 */
  reason?: "no_order" | "already_exists";
  /** kind === "error" 일 때만 */
  message?: string;
};

export async function autoCreateInvoice(
  input: AutoCreateInvoiceInput
): Promise<AutoCreateInvoiceResult> {
  if (!input.orderId) return { kind: "skipped", reason: "no_order" };

  // 로드맵③ 이후로는 한 오더에 정정청구 invoice 가 추가로 있을 수 있어
  // `.maybeSingle()` 이 2행 이상이면 에러를 던진다(원칙 48번) — 존재 여부만 확인한다
  const { data: existing, error: existingError } = await supabase
    .from("invoices")
    .select("id")
    .eq("order_id", input.orderId)
    .limit(1);
  if (existingError) {
    return { kind: "error", message: existingError.message };
  }
  if (existing && existing.length > 0) return { kind: "skipped", reason: "already_exists" };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("company_id,individual_customer_id")
    .eq("id", input.orderId)
    .single();
  if (orderError) {
    return { kind: "error", message: orderError.message };
  }

  // 로드맵③ 현장 추가비 — 정산 건이 아직 없는 상태에서 미리 등록된 활성
  // 추가비가 있으면 최초 스냅샷에 포함해서 얼린다(3-2)
  const activeExtras = await fetchActiveExtraCharges(input.dispatchId);
  const extraCharge = activeExtras.reduce((s, e) => s + (e.customer_charge_amount || 0), 0);
  const extraPayout = activeExtras.reduce((s, e) => s + (e.driver_payout_amount || 0), 0);

  // 혼적 할인은 이미 견적 단계 최종금액에 반영되어 저장되므로 별도 변환 없이
  // 화주 청구운임을 그대로 쓴다
  const charge = (input.customerCharge || 0) + extraCharge;
  const payout = (input.driverPayout || 0) + extraPayout;
  const now = new Date();
  const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const completedOn = input.completedOn || now.toISOString().slice(0, 10);

  const isDirect = input.collectionMethod === "driver_direct";

  // 🔴 `commission_total` 은 **화면이 읽지 않는다** — 정산 목록·상세·대시보드가 전부
  //    `lib/marginCalc.ts` 로 표시 시점에 계산한다(35차 리뷰 2라운드). 그래도 저장값을
  //    같은 공식으로 맞춰 두어야 나중에 이 컬럼을 읽는 코드가 또 갈리지 않는다.
  //    ⚠️ 그전 공식은 `청구액 × 1.1 − 지급액` 이라 부가세 구분을 무시했다.
  const fee = input.brokerageFee ?? null;
  const commission = calcMargin({
    collectionMethod: input.collectionMethod,
    customerCharge: charge,
    customerChargeVatIncluded: input.customerChargeVatIncluded,
    driverPayout: payout,
    driverVatIncluded: input.driverVatIncluded,
    brokerageFee: fee,
  });

  // 🔴 A-1 — 받을 돈·줄 돈은 수금방식이 정한다(위 주석 참고).
  const receivable = isDirect ? fee : charge || null;
  const payable = isDirect ? 0 : payout || null;

  // 🔴 A-2 — 선착불은 운임이 위캐리를 거치지 않으므로 「화주 입금」·「차주 지급」이
  //    처음부터 해당 없음이다. 운송완료 시점에 완료로 둔다.
  //    🔴 **받을 수수료는 여기에 뭉개지 않는다** — `brokerage_fee_paid` 가 따로 있고
  //       그것이 선착불 정산 건의 유일한 미수금이다.
  const directDone = isDirect ? { received_at: completedOn } : null;

  const { data: inserted, error: invoiceError } = await supabase.from("invoices").insert({
    order_id: input.orderId,
    company_id: order?.company_id || null,
    individual_customer_id: order?.individual_customer_id || null,
    billing_period: billingPeriod,
    settlement_reference_date: completedOn,
    customer_charge_total: charge || null,
    driver_payout_total: payout || null,
    commission_total: commission || null,
    receivable_amount: receivable,
    payable_amount: payable,
    settlement_type: input.settlementType || "general",
    collection_method: input.collectionMethod || "broker",
    billing_cycle: input.billingCycle || "per_order",
    direct_collection_point: input.directCollectionPoint || null,
    network_settlement_type: input.networkSettlementType || "none",
    total_freight_amount: input.totalFreightAmount ?? charge ?? null,
    driver_direct_collection_amount: input.driverDirectCollectionAmount ?? null,
    brokerage_fee: fee,
    customer_charge_vat_included: !!input.customerChargeVatIncluded,
    driver_vat_included: !!input.driverVatIncluded,
    payment_received: isDirect ? true : false,
    payment_received_date: directDone?.received_at ?? null,
    driver_paid: isDirect ? true : false,
    driver_paid_date: directDone?.received_at ?? null,
    status: "정산대기",
    created_by: await getCurrentStaffId(),
  }).select("id").single();
  if (invoiceError) {
    return { kind: "error", message: invoiceError.message };
  }

  // 🔴 월정산 묶음 자동 생성(2026-09-15) — 사용자 신고 *"월정산건은 운송 완료시
  //    자동으로 월정산 묶음이 만들어지고…"*. 그전에는 정산 건만 자동으로 생기고
  //    묶음은 담당자가 화주·정산월을 골라 손으로 만들어야 했다(실측: 월정산 2건 중
  //    묶음에 담긴 것 0건).
  //
  // 🔴 **fire-and-forget 이다**(원칙 53번). 묶음은 정산 건에 얹히는 부가 작업이라,
  //    여기서 실패해도 운송완료와 정산 건 생성은 그대로여야 한다. `await` 를 걸면
  //    묶음 API 가 느리거나 죽었을 때 **배차 상태 변경 자체가 멈춘다.**
  //
  // 🔴 **호출을 화면 파일로 옮기지 말 것** — `autoCreateInvoice` 를 부르는 곳이
  //    배차 상세·배차 목록 **두 곳**이고(24시콜 ⓒ 가 세 번째가 된다), 화면에 두면
  //    한쪽만 고쳐져 「목록에서 완료하면 묶음이 안 생긴다」가 된다. 정산 건이
  //    만들어지는 자리가 여기 하나이므로 묶음도 여기서 붙는다.
  //
  // 🔴 **조건을 여기서 판정하지 않는다** — 수금방식·청구주기·상태를 서버 API 가
  //    다시 읽는다(원칙 44번과 같은 결). 여기서 걸러면 판정이 두 곳이 된다.
  const newInvoiceId = (inserted as any)?.id;
  if (newInvoiceId) {
    void fetch("/api/admin/billing-batches/auto-attach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id: newInvoiceId }),
    }).catch(() => {
      /* 묶음은 부가 작업이다 — 실패해도 정산 건 생성은 성공이다 */
    });
  }

  return { kind: "created" };
}
