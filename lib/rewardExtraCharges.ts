// 기업고객 리워드 — 「정산 스냅샷에 이미 섞여 들어간 현장 추가비」를 뽑는다
// (A장, 2026-09-20 · 서버 전용)
//
// ── 🚨 왜 필요한가 ────────────────────────────────────────────────────────
//
// 적립 기준은 **기본 운임 공급가액만**이다(사용자 확정). 그런데
// `lib/autoCreateInvoice.ts` 가 정산 건을 만들 때 **그 시점의 활성 추가비를
// `customer_charge_total` 에 더해서 얼린다**:
//
//     const charge = (input.customerCharge || 0) + extraCharge;
//
// 🟢 실측(2026-09-20) — 운영 `dispatch_extra_charges` 는 **0행**이라 지금 섞인 건은
//    없다. 🔴 **그래도 구조상 섞이므로 빼고 계산한다** — 나중에 추가비를 쓰기 시작한
//    뒤에 「왜 적립이 큰가」를 찾는 일이 없어야 한다.
//
// ── 🔴 무엇을 빼는가 — 35차 A-7 과 **같은 규칙**이다 ──────────────────────
//
//     status = 'active'                     취소된 추가비는 애초에 안 들어갔다
//     correction_invoice_id is null         정정청구로 빠진 것은 그 invoice 쪽에 있다
//     created_at <= invoice.created_at      🔴 **그 뒤에 등록된 것은 스냅샷에 없다**
//
// 🔴 **마지막 조건을 빼면 기본 운임에서 두 번 깎인다** — 나중에 생긴 추가비는
//    스냅샷에 들어 있지도 않은데 빼는 셈이 된다(원칙 47번의 「표시 시점 합산」이
//    그것을 따로 더해 보여주는 이유이기도 하다).
//
// 🔴 **service_role 로 읽는다** — `dispatch_extra_charges` 는 16차가 차주 지급액을
//    화주에게 감추려고 `authenticated` 전체 SELECT 를 회수해 둔 표다. 여기서
//    읽는 것은 **화주 청구분 하나뿐**이고 지급액은 건드리지 않는다.

type InvoiceRef = {
  id: string;
  order_id: string | null;
  created_at: string;
};

/**
 * 정산 건마다 「그 스냅샷에 이미 포함된 현장 추가비(화주 청구분) 합계」를 낸다.
 *
 * 🔴 **조회가 실패하면 0 으로 때우지 말 것**(원칙 55번)… 이지만 여기는 **예외다**:
 *    추가비 조회가 실패했을 때 0 을 쓰면 **적립이 커지고**, 청구액 전체를 빼면
 *    **적립이 0** 이 된다. 둘 다 조용히 틀린 값이다. 🔴 그래서 **던진다** —
 *    부르는 쪽(`accrue`)이 그 건을 `error` 로 돌려주고 담당자가 정산 상세에서 본다.
 */
export async function fetchIncludedExtraChargeTotals(
  admin: any,
  invoices: InvoiceRef[]
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  const orderIds = Array.from(new Set(invoices.map((i) => i.order_id).filter(Boolean))) as string[];
  if (orderIds.length === 0) return result;

  // 배차 → 오더 잇기 (추가비는 배차에 달린다)
  const { data: dispatches, error: dErr } = await admin
    .from("dispatches")
    .select("id,order_id")
    .in("order_id", orderIds);
  if (dErr) throw new Error(`현장 추가비 조회 실패(배차): ${dErr.message}`);

  const dispatchIds = (dispatches || []).map((d: any) => d.id).filter(Boolean);
  if (dispatchIds.length === 0) return result;

  const orderIdByDispatch: Record<string, string> = {};
  for (const d of (dispatches || []) as any[]) {
    if (d.order_id) orderIdByDispatch[d.id] = d.order_id;
  }

  const { data: charges, error: cErr } = await admin
    .from("dispatch_extra_charges")
    .select("dispatch_id,customer_charge_amount,status,correction_invoice_id,created_at")
    .in("dispatch_id", dispatchIds)
    .eq("status", "active")
    .is("correction_invoice_id", null);
  if (cErr) throw new Error(`현장 추가비 조회 실패: ${cErr.message}`);

  for (const inv of invoices) {
    if (!inv.order_id) continue;
    let sum = 0;
    for (const c of (charges || []) as any[]) {
      if (orderIdByDispatch[c.dispatch_id] !== inv.order_id) continue;
      // 🔴 **그 정산 건이 만들어지기 전에 등록된 것만** — 위 주석 참고.
      if (new Date(c.created_at) > new Date(inv.created_at)) continue;
      sum += Math.round(c.customer_charge_amount || 0);
    }
    if (sum > 0) result[inv.id] = sum;
  }
  return result;
}
