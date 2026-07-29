import { supabase } from "@/lib/supabaseClient";

// 오더/배차/정산 확정 이후 정산방식이 바뀔 때마다 사유를 남기는 공용 로그 기록 함수.
// settlement_type_change_logs 테이블에 씀 (2차 세션: 운임 정산방식)
export async function logSettlementTypeChange(params: {
  targetTable: "orders" | "dispatches" | "invoices";
  targetId: string;
  beforeType: string | null;
  afterType: string;
  reason: string;
  changedBy: string | null;
}) {
  await supabase.from("settlement_type_change_logs").insert({
    target_table: params.targetTable,
    target_id: params.targetId,
    before_type: params.beforeType,
    after_type: params.afterType,
    reason: params.reason,
    changed_by: params.changedBy,
  });
}
