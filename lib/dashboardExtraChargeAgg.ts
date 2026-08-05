// 로드맵⑥ 운영 대시보드 — 현장 추가비 "표시시점 합산"을 대량(여러 invoice) 집계용으로
// 재구현. 정산관리 목록(`app/admin/invoices/page.tsx`의 loadExtraChargeInfo)·상세·
// 화주포털·월정산묶음 4곳에 이미 각자 인라인으로 구현된 것과 동일한 3규칙을 그대로
// 지키되, 그 4곳은 "화면에 로드된 소수 invoice"용이라 대시보드처럼 "최근 12개월
// 전체 invoice"를 한 번에 훑는 용도에는 그대로 재사용하기 어려워 신규로 분리함
// (CLAUDE.md 원칙47 "표시시점 합산" 정신은 동일하게 유지).
export interface DashboardExtraChargeRow {
  dispatch_id: string;
  category: string;
  customer_charge_amount: number | null;
  driver_payout_amount: number | null;
  correction_invoice_id: string | null;
  created_at: string;
}

export interface DashboardDispatchRef {
  id: string;
  order_id: string | null;
}

export interface DashboardInvoiceRef {
  id: string;
  order_id: string | null;
  created_at: string;
}

export interface AttributedExtraChargeTotal {
  count: number;
  customerAmount: number;
  driverAmount: number;
}

/**
 * 규칙: (1) status='active'인 추가비만(호출 전 쿼리에서 이미 필터링해서 넘길 것)
 * (2) correction_invoice_id가 없는 것만(있으면 이미 별도 정정청구 invoice의
 * customer_charge_total로 반영되어 있으므로 중복 합산 방지) (3) 그 오더의
 * "가장 최근 invoice" 생성일 이후에 등록된 것만(그 이전 건은 이미 그 invoice의
 * 최초 스냅샷에 포함되어 있음).
 *
 * 반환값은 "가장 최근 invoice.id"를 키로 하는 합계 맵.
 */
export function attributeActiveExtraCharges(
  activeExtraCharges: DashboardExtraChargeRow[],
  dispatches: DashboardDispatchRef[],
  invoices: DashboardInvoiceRef[]
): Record<string, AttributedExtraChargeTotal> {
  const orderIdByDispatchId: Record<string, string> = {};
  dispatches.forEach((d) => {
    if (d.order_id) orderIdByDispatchId[d.id] = d.order_id;
  });

  const latestInvoiceByOrderId: Record<string, DashboardInvoiceRef> = {};
  invoices.forEach((inv) => {
    if (!inv.order_id) return;
    const cur = latestInvoiceByOrderId[inv.order_id];
    if (!cur || new Date(inv.created_at) > new Date(cur.created_at)) {
      latestInvoiceByOrderId[inv.order_id] = inv;
    }
  });

  const result: Record<string, AttributedExtraChargeTotal> = {};
  activeExtraCharges.forEach((e) => {
    if (e.correction_invoice_id) return;
    const orderId = orderIdByDispatchId[e.dispatch_id];
    if (!orderId) return;
    const invoice = latestInvoiceByOrderId[orderId];
    if (!invoice) return;
    if (new Date(e.created_at) <= new Date(invoice.created_at)) return;
    const cur = result[invoice.id] || { count: 0, customerAmount: 0, driverAmount: 0 };
    cur.count += 1;
    cur.customerAmount += e.customer_charge_amount || 0;
    cur.driverAmount += e.driver_payout_amount || 0;
    result[invoice.id] = cur;
  });
  return result;
}
