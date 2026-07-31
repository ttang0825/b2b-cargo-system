// 로드맵 ②-A 신규 정산방식 필드(collection_method/billing_cycle/
// direct_collection_point 등) 변경 시 사유를 기록하는 클라이언트 헬퍼.
// settlement_field_change_logs에는 클라이언트가 직접 insert하지 않고
// 반드시 이 함수(서버 API 경유)만 사용할 것 — lib/settlementTypeChangeLog.ts
// (구형 settlement_type 전용, legacy)와는 별개.
export async function logSettlementFieldChange(params: {
  targetTable: "orders" | "dispatches" | "invoices";
  targetId: string;
  fieldName: string;
  beforeValue: string | null;
  afterValue: string | null;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/admin/settlement-field-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error || "기록에 실패했습니다." };
  return { ok: true };
}
