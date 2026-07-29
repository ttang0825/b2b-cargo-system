import { supabase } from "@/lib/supabaseClient";

// 산재보험료 계산에 쓰는 필요경비공제율/산재보험료율 — 고용노동부가 매년
// 재고시하는 값이라 코드에 하드코딩하지 않고 이 테이블(관리자 수정 가능)에서
// 가장 최근 값을 읽어온다.
export type InsuranceRateSettingsRow = {
  id: string;
  expense_deduction_rate: number;
  insurance_rate_total: number;
  updated_by: string | null;
  updated_at: string;
};

export const DEFAULT_INSURANCE_RATE_SETTINGS = {
  expense_deduction_rate: 49.9,
  insurance_rate_total: 1.76,
};

export async function getLatestInsuranceRateSettings(): Promise<InsuranceRateSettingsRow | null> {
  const { data } = await supabase
    .from("insurance_rate_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as InsuranceRateSettingsRow) || null;
}
