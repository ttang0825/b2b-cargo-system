// 차량·요금 안내의 「기준가」 — 유일 정의처.
//
// ══ 🔴 32차에 **운임기준표와 실시간으로 이어졌다** ═══════════════════════════
//
// 30차까지는 아래 `START_PRICE_FALLBACK` 이 화면에 그대로 나가는 값이었고, 그래서
// `/admin/rates` 에서 운임기준표를 고쳐도 **랜딩·`/vehicles` 금액이 바뀌지 않았다**
// (사용자 신고 2026-09-01 — "내부시스템에서 운임기준표를 수정했는데 랜딩페이지의
// 차량요금안내 금액이 바뀌지 않는다"). 이제 `fetchStartPrices()` 가 `rate_distance_tiers`
// 의 「10km 이내」 행을 매번 읽어온다.
//
// 🔴 **`rate_distance_tiers` 는 21차에 잠겼다** — anon 은 못 읽고 재직 직원 정책만 있다.
//    그래서 반드시 **service_role 서버 경로**를 거친다(`/api/public/start-prices`).
//    화면에서 `supabase.from("rate_distance_tiers")` 로 직접 읽으려 하지 말 것 — 0행이 온다.
//
// 🔴 **공개 범위는 「10km 이내」 한 칸뿐이다**(28차 확정 — 전체 운임표·추가비 기준은 비공개).
//    이 파일이나 API 에 다른 구간·가산 값을 얹지 말 것.
//
// ⚠️ 그래서 이제 **`/admin/rates` 에서 숫자를 고치는 순간 공개 게시가가 바뀐다.**
//    그 화면은 클릭이 곧 저장이고 되돌리기가 없다 — 오타 하나가 그대로 게시된다.
//    (자동 연동은 사용자가 요청한 것이고, 이 위험은 그 대가다.)
//
// ⚠️ 조회가 실패하면 아래 폴백을 쓴다 — 값이 통째로 비어 보이는 것보다 낫고,
//    폴백 값도 실측으로 맞춘 값이다. **원칙 55번대로 `error` 를 삼키지는 않는다**
//    (API 가 `stale: true` 를 함께 내려준다).

import { VEHICLE_TYPES_ALL } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabaseServiceClient";

export type StartPrice = { ton: string; amount: number };

/** 🔴 이 라벨 문자열로 매칭한다(`distance_from_km` 숫자가 아니다) — 16차 마이그레이션과 같은 규칙. */
export const START_PRICE_DISTANCE_LABEL = "10km 이내";

// 🔴 폴백 — 22차(11차급 165행) 반영 후의 실측값이다. `app/vehicles/page.tsx` 와 랜딩
//    요금 가이드 모달이 **둘 다 이 배열을 읽는다**. 다시 갈라 적지 말 것.
export const START_PRICE_FALLBACK: StartPrice[] = [
  { ton: "1톤", amount: 48000 },
  { ton: "1.4톤", amount: 60000 },
  { ton: "2.5톤", amount: 84000 },
  { ton: "3.5톤", amount: 96000 },
  { ton: "5톤", amount: 108000 },
  { ton: "5톤 플러스/축", amount: 133000 },
  { ton: "8톤", amount: 151000 },
  { ton: "11톤", amount: 169000 },
  { ton: "15톤", amount: 176000 },
  { ton: "18톤", amount: 182000 },
  { ton: "25톤", amount: 217000 },
];

/** 「기준가 48,000원」 — 화면 3곳(모달·`/vehicles`)이 같은 문자열을 쓰게 하는 정의처. */
export function formatStartPrice(amount: number) {
  return `기준가 ${amount.toLocaleString("ko-KR")}원`;
}

export type StartPriceResult = { prices: StartPrice[]; stale: boolean };

/** 운임기준표의 「10km 이내」 행을 차급 순서대로 읽어온다. 실패하면 폴백 + `stale: true`. */
export async function fetchStartPrices(): Promise<StartPriceResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { prices: START_PRICE_FALLBACK, stale: true };

  try {
    const supabase = createServiceClient(url, key);
    const { data, error } = await supabase
      .from("rate_distance_tiers")
      .select("vehicle_type,base_fare")
      .eq("distance_label", START_PRICE_DISTANCE_LABEL);

    if (error || !data || !data.length) return { prices: START_PRICE_FALLBACK, stale: true };

    const byTon = new Map<string, number>();
    data.forEach((r: { vehicle_type: string | null; base_fare: number | null }) => {
      if (!r.vehicle_type || r.base_fare == null) return;
      byTon.set(r.vehicle_type, Number(r.base_fare));
    });

    // 🔴 차급 순서는 배열이 정한다 — DB 반환 순서를 그대로 쓰면 화면 순서가 조용히 바뀐다.
    const prices = VEHICLE_TYPES_ALL
      .map((ton) => ({ ton, amount: byTon.get(ton) }))
      .filter((r): r is StartPrice => typeof r.amount === "number");

    if (!prices.length) return { prices: START_PRICE_FALLBACK, stale: true };
    return { prices, stale: false };
  } catch {
    return { prices: START_PRICE_FALLBACK, stale: true };
  }
}
