import { supabase } from "@/lib/supabaseClient";

// 혼적(적재구분) 할인 중 율(%) 방식에만 쓰는 표준 할인율 — 정부 고시값이
// 아니라 회사 자체 정책 기본값이라는 점만 insurance_rate_settings(원칙 40번)
// 패턴과 다르다. 금액(정액) 방식은 거리·중량마다 달라지는 게 당연해서 표준값을
// 두지 않는다.
//
// 🔴 이 값은 **입력창 기본값**이지 계산에 쓰이는 할인율이 아니다. 실제 할인은
//    건별 저장값(quotes/orders.mixed_discount_percent · _amount)이고, 담당자가
//    고치면 그 값이 이긴다 — applyMixedDiscount() 는 이 표를 보지 않는다.
//    거리로 계수를 강제하는 설계(지시서 원안)는 ① 담당자 건별 조정값을 덮어쓰고
//    ② orders 에 distance_km 이 없어 오더 상세에서 같은 금액을 재현할 수 없어
//    채택하지 않았다.
//
// 🔴 단일 행이 아니라 거리 3구간이다(2026-09-09). 한 행만 읽는 헬퍼를 다시
//    만들지 말 것 — 구간이 늘어난 뒤에도 조용히 한 행만 돌려주게 된다.
export type MixedLoadingDiscountTierRow = {
  id: string;
  distance_label: string;
  distance_to_km: number | null;
  standard_discount_percent: number;
  updated_by: string | null;
  updated_at: string;
};

// 🔴 error 를 버리고 빈 배열로 만들지 말 것(원칙 55번) — 조회가 실패하면
//    "표준값이 없다"와 구분이 안 돼서 화면이 조용히 기본값 없이 뜬다.
export async function getMixedLoadingDiscountTiers(): Promise<{
  rows: MixedLoadingDiscountTierRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("mixed_loading_discount_settings")
    .select("*")
    // 상한이 열린(무제한) 구간이 항상 맨 뒤로 오게 한다 — pickMixedDiscountPercent()의
    // "상한 이하 첫 구간" 판정이 이 정렬을 전제로 한다.
    .order("distance_to_km", { ascending: true, nullsFirst: false });
  if (error) return { rows: [], error: error.message };
  return { rows: (data as MixedLoadingDiscountTierRow[]) || [], error: null };
}

// 거리에 해당하는 표준 할인율 구간을 고른다.
// 🔴 매칭은 rate_distance_tiers 와 같은 **"상한 이하 첫 구간"**이고 하한을 조건에
//    넣지 않는다(원칙 44번) — 하한을 넣으면 정수 사이 빈틈에서 소수 거리(30.4km 등)가
//    조용히 아무 구간에도 안 걸린다.
export function pickMixedDiscountTier(
  tiers: MixedLoadingDiscountTierRow[],
  distanceKm: number | null | undefined
): MixedLoadingDiscountTierRow | null {
  if (distanceKm == null || !Number.isFinite(distanceKm) || distanceKm <= 0) return null;
  const sorted = [...tiers].sort((a, b) => {
    if (a.distance_to_km == null) return 1;
    if (b.distance_to_km == null) return -1;
    return a.distance_to_km - b.distance_to_km;
  });
  return (
    sorted.find((t) => t.distance_to_km == null || distanceKm <= t.distance_to_km) || null
  );
}
