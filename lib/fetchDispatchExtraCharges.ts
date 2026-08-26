// 19차 — 현장 추가비를 **관리자 화면에서** 조회하는 유일한 경로.
//
// 🔴 관리자 화면에서 supabase.from("dispatch_extra_charges") 로 직접 조회하지 말 것.
//   19차부터 관리자 질의가 로그인 세션(= authenticated 롤)으로 나가는데, 16차가
//   차주 지급액(driver_payout_amount)을 화주에게 감추려고 그 롤의 전체 SELECT 권한을
//   회수하고 안전한 컬럼만 다시 GRANT 해 두었다. 직접 조회하면 지급액을 읽으려다
//   권한 오류가 난다. 자세한 이유는
//   app/api/admin/dispatch-extra-charges/list/route.ts 주석 참고.
//
// ⚠️ 화주포털(app/customer/invoices)은 여기를 쓰지 않는다 — 화주는 지금도 컬럼
//   GRANT 로 제한된 안전 컬럼만 직접 읽는다(16차 구조 그대로).
// ⚠️ 카테고리 라벨 등 표시용 상수는 lib/dispatchExtraCharges.ts 에 그대로 있다.

export type AdminExtraChargeRow = {
  id: string;
  dispatch_id: string;
  category?: string | null;
  customer_charge_amount: number | null;
  driver_payout_amount: number | null;
  status: string | null;
  note?: string | null;
  created_at: string;
  correction_invoice_id?: string | null;
};

async function request(params: string): Promise<AdminExtraChargeRow[]> {
  try {
    const res = await fetch(`/api/admin/dispatch-extra-charges/list?${params}`);
    const json = await res.json();
    if (!res.ok) return [];
    return (json.data || []) as AdminExtraChargeRow[];
  } catch {
    return [];
  }
}

/** 배차 여러 건의 현장 추가비를 한 번에. 상태 필터 없음 — 호출부가 거른다. */
export async function fetchExtraChargesByDispatchIds(
  dispatchIds: string[]
): Promise<AdminExtraChargeRow[]> {
  const ids = dispatchIds.filter(Boolean);
  if (ids.length === 0) return [];
  return request(`dispatch_ids=${encodeURIComponent(ids.join(","))}`);
}

/** 활성 추가비만. 정산 금액 합산에 쓰는 형태. */
export async function fetchActiveExtraCharges(
  dispatchId: string
): Promise<AdminExtraChargeRow[]> {
  const rows = await fetchExtraChargesByDispatchIds([dispatchId]);
  return rows.filter((r) => r.status === "active");
}

/** 이 정산 건이 어떤 추가비 때문에 만들어진 정정청구인지 확인용. */
export async function fetchCorrectionSource(
  invoiceId: string
): Promise<AdminExtraChargeRow[]> {
  return request(`correction_invoice_id=${encodeURIComponent(invoiceId)}`);
}
