// ─────────────────────────────────────────────────────────────────────────────
// 견적 금액 → **연결된 운송오더 청구금액** 자동 반영 — 유일 정의처 (2026-09-17)
//
// 사용자 지시: *「배차확정전 배차가 잘되지 않아 금액을 좀더 올려서 배차를 해야 할 경우,
// 우선 고객에게 전화를 해서 금액을 더 올려서 견적조정을 하려고 하는 상황이다. 이때
// 기존견적에서 금액을 올리는 수정을 하면 이와 연결되어 있던 오더도 그 금액이 자동으로
// 적용되면 좋겠다」*
//
// 그전에는 **견적에서 오더로 금액이 넘어가는 길이 「오더 등록 때 한 번」뿐**이었다
// (`app/admin/orders/page.tsx` 의 `?from_quote=` 프리필). 그래서 배차가 안 잡혀 견적을
// 올려도 오더는 옛 금액 그대로였고, 담당자가 두 화면에서 같은 숫자를 두 번 고쳐야 했다.
//
// 🔴 **부가세 구분을 같이 쓴다** — `quotes.final_amount` 는 **공급가액(부가세 별도)**이다.
//    금액만 덮어쓰면 오더가 `customer_charge_vat_included = true` 인 경우 **같은 숫자가
//    포함가로 읽혀 공급가액이 10% 줄어든 채로** 배차·정산까지 승계된다(PR #153 이 프리필
//    에서 겪은 그 자리다). 🔴 **`false` 를 빼지 말 것.**
//
// 🔴 **정산(`invoices`)은 따라오지 않는다** — 정산 건의 금액은 생성 시점 스냅샷이다
//    (원칙 47번). 이미 정산이 만들어진 오더의 금액을 여기서 고쳐도 청구서는 안 바뀌고,
//    맞추는 자리는 정산 상세의 **「배차 기준으로 금액 다시 맞추기」**(35차 A-7)다.
//    🔴 여기서 `invoices` 를 같이 고치지 말 것 — 그것이 원칙 47번이 막는 바로 그 일이다.
//
// 🔴 **배차(`dispatches.customer_charge`)도 따라오지 않는다** — 사용자가 말한 것은
//    오더이고, 배차의 화주 청구금액은 배차 담당자가 배차 상세에서 정한다(혼적 할인·
//    현장 조정이 거기서 붙는다). 그래서 **화면이 「배차 금액은 따로 확인하라」고 알린다.**
//    🔴 조용히 같이 고치지 말 것 — 돈이고, 고치는 사람이 다르다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 🔴 **이 상태부터는 물어보고 고친다** — 오더가 이미 배차·운송 단계로 내려간 뒤라
 *    금액이 아래로(배차·정산) 퍼져 있을 수 있다.
 *    🔴 원칙 39번이 오더의 정산방식을 잠그는 것과 **같은 목록**이다 — 갈라 적지 말 것.
 */
export const ORDER_AMOUNT_SYNC_CONFIRM_STATUSES: string[] = [
  "배차완료",
  "운송중",
  "운송완료",
];

export type LinkedOrder = {
  id: string;
  order_no: string | null;
  status: string | null;
  customer_charge: number | null;
};

/** 최소한의 질의 인터페이스 — 화면이 쓰는 클라이언트를 그대로 받는다(목으로 갈아끼우기 쉽다). */
type OrderClient = { from: (table: string) => any };

export function needsAmountSyncConfirm(orders: LinkedOrder[]): boolean {
  return orders.some((o) => ORDER_AMOUNT_SYNC_CONFIRM_STATUSES.includes(o.status || ""));
}

/**
 * 🔴 **바뀌는 오더만** 고른다 — 이미 같은 금액이면 건드리지 않는다(`updated_at` 이
 *    괜히 움직이면 화주포털 목록에 「업데이트」 표시가 뜬다).
 */
export function ordersNeedingAmountSync(
  orders: LinkedOrder[],
  amount: number
): LinkedOrder[] {
  return orders.filter((o) => Math.round(o.customer_charge ?? NaN) !== Math.round(amount));
}

/** 확인 창 문구. 🔴 화면에서 이어 붙이지 말 것 — 나중에 같은 동작이 다른 화면에 생긴다. */
export function amountSyncConfirmMessage(orders: LinkedOrder[], amount: number): string {
  const list = orders.map((o) => `${o.order_no || o.id} (${o.status || "-"})`).join(", ");
  return (
    `연결된 운송오더의 화주 청구금액을 ${amount.toLocaleString()}원(부가세 별도)으로 함께 바꿉니다.\n` +
    `대상: ${list}\n\n` +
    `이미 배차·운송이 진행된 오더입니다. 배차의 화주 청구금액과 이미 만들어진 정산 건은 ` +
    `함께 바뀌지 않으니 따로 확인해주세요.\n계속하시겠습니까?`
  );
}

/**
 * 연결된 오더의 청구금액을 견적 금액으로 맞춘다.
 *
 * 🔴 **견적 금액이 비어 있으면 아무것도 하지 않는다** — 금액을 안 적은 견적으로
 *    오더의 청구금액을 **지워 버리면** 배차·정산이 0원으로 흘러간다.
 * 🔴 **성공/실패를 삼키지 말 것** — 화면이 「오더도 함께 수정했습니다」를 말하거나
 *    실패를 보여줘야 한다(원칙 55번). 다만 **견적 저장 자체를 되돌리지는 않는다**
 *    (견적은 이미 저장됐고, 오더는 담당자가 오더 화면에서 고칠 수 있다).
 */
export async function syncQuoteAmountToOrders(
  client: OrderClient,
  orders: LinkedOrder[],
  amount: number,
  staffId: string | null
): Promise<{ updated: LinkedOrder[]; error: string | null }> {
  if (orders.length === 0) return { updated: [], error: null };
  const { error } = await (client as any)
    .from("orders")
    .update({
      customer_charge: Math.round(amount),
      // 🔴 `final_amount` 는 공급가액이다 — 이 줄을 빼지 말 것(위 머리말 참고).
      customer_charge_vat_included: false,
      updated_by: staffId,
    })
    .in(
      "id",
      orders.map((o) => o.id)
    );
  if (error) return { updated: [], error: error.message };
  return { updated: orders, error: null };
}
