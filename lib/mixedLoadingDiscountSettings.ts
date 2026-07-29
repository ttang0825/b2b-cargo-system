import { supabase } from "@/lib/supabaseClient";

// 혼적(적재구분) 할인 중 율(%) 방식에만 쓰는 표준 할인율 — 정부 고시값이
// 아니라 회사 자체 정책 기본값이라는 점만 insurance_rate_settings(원칙 40번)
// 패턴과 다르고, 구조는 동일하게 관리자 수정 가능한 단일값 설정 테이블로 둔다.
// 금액(정액) 방식은 거리·중량마다 달라지는 게 당연해서 표준값을 두지 않는다.
export type MixedLoadingDiscountSettingsRow = {
  id: string;
  standard_discount_percent: number;
  updated_by: string | null;
  updated_at: string;
};

export const DEFAULT_MIXED_LOADING_DISCOUNT_SETTINGS = {
  standard_discount_percent: 0,
};

export async function getLatestMixedLoadingDiscountSettings(): Promise<MixedLoadingDiscountSettingsRow | null> {
  const { data } = await supabase
    .from("mixed_loading_discount_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as MixedLoadingDiscountSettingsRow) || null;
}
