// 차량·요금 안내의 「기준가」 — 유일 정의처.
//
// ══ 🔴 32차에 **운임기준표와 실시간으로 이어졌다** ═══════════════════════════
//
// 30차까지는 이 파일에 적힌 숫자가 화면에 그대로 나가는 값이었고, 그래서
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

import { createServiceClient } from "@/lib/supabaseServiceClient";

export type StartPrice = { ton: string; amount: number };

// 🔴 **게시하는 차급은 6종뿐이다**(사용자 결정 2026-09-01).
//    30차 리뷰 1라운드에 「운임기준표 기준으로 세분화」 지시로 6 → 11행이 됐던 것을
//    다시 6행으로 되돌린 것이다. **30차 기록을 근거로 11행으로 되돌리지 말 것.**
//    ⚠️ 근거 — FAQ 3번이 「5톤 플러스/축 차량까지 배차가 가능하며」라고 답한다. 그 문장과
//       정확히 맞는 범위다.
//    ⚠️ **25톤 게시가가 화면에서 사라진다**(61차 ⑭ 기록은 이제 낡았다). 랜딩 문구
//       「1톤부터 5톤 이상, 특수차량까지」와의 간극은 아래 설명글의 **「5톤보다 큰 차량도
//       문의」** 한 문장이 메운다 — 🔴 **그 문장을 빼지 말 것.**
//    🔴 아래 폴백 배열에서 7~11번째(8·11·15·18·25톤)를 **지우지 않았다** — 나중에
//       다시 게시할 때 값을 찾지 않아도 되게 두고, **게시할 때만 이 목록으로 자른다.**
export const PUBLISHED_START_PRICE_TONS = [
  "1톤",
  "1.4톤",
  "2.5톤",
  "3.5톤",
  "5톤",
  "5톤 플러스/축",
] as const;

// 🔴 기준가 표 위에 놓는 설명글 — **유일 정의처**. 팝업과 `/vehicles` 가 같이 읽는다.
//    화면에 직접 적으면 두 곳이 조용히 갈린다(30차가 두 벌로 두었다가 실제로 갈렸다).
//
// 🔴 **네 가지를 빼지 말 것** — 하나라도 빠지면 표시가격 분쟁의 근거가 된다.
//    ① 「10km 이내」 — 이 금액이 성립하는 조건. 빼면 모든 거리에 적용되는 것으로 읽힌다
//    ② 「부가가치세는 별도」
//    ③ 「견적으로 안내」 — 확정 금액이 아니라는 것
//    ④ 「5톤보다 큰 차량도 문의」 — 6행으로 줄면서 **더 중요해진** 문장이다(위 참고)
//
// ⚠️ 「내려갑니다」의 근거는 **혼적(합짐) 할인**이다 — 견적 자동계산이
//    `applyMixedDiscount()` 로 최종금액에서 실제로 차감한다(`app/admin/quotes/page.tsx`).
//    🔴 그 기능이 없어지면 이 문장부터 고칠 것. 실제로 안 내려가는데 내려간다고
//       쓰면 표시광고 문제다.
// ⚠️ 「최소 운임」이라는 말은 뺐다 — 「기준가」(오르내린다)와 뜻이 부딪힌다.
export const START_PRICE_NOTE =
  "아래 금액은 10km 이내 운송 기준이며 부가가치세는 별도입니다. " +
  "운송 거리와 상·하차 조건, 시간대, 화물 특성에 따라 기준가에서 올라가고, " +
  "같은 방향 화물과 함께 싣는 혼적(합짐)이면 내려갑니다. " +
  "정확한 금액은 견적으로 안내드리며, 5톤보다 큰 차량도 문의 주시면 확인해 드립니다.";

/** 🔴 이 라벨 문자열로 매칭한다(`distance_from_km` 숫자가 아니다) — 16차 마이그레이션과 같은 규칙. */
export const START_PRICE_DISTANCE_LABEL = "10km 이내";

// 🔴 **폴백 금액을 코드에 두지 않는다** — 두면 반드시 낡는다.
//    2026-09-01 실측에서 실제로 겪었다: 코드 폴백은 1톤 48,000 인데 운영 DB 는 이미
//    **40,000**(전 구간 ×0.833 인하)이었다. 폴백이 떴다면 **게시가 40,000 ≠ 견적가**
//    가 되어 그대로 표시가격 분쟁이다. 그래서 **조회가 실패하면 표를 아예 그리지 않고**
//    「견적으로 안내드립니다」만 남긴다(팝업·`/vehicles` 둘 다).
//    ⚠️ 8~25톤 값을 잃는 것이 아니다 — `rate_distance_tiers` 가 갖고 있고, 다시
//       게시하려면 위 `PUBLISHED_START_PRICE_TONS` 에 차급을 더하기만 하면 된다.

/** 「48,000원」 — 팝업과 `/vehicles` 가 같은 문자열을 쓰게 하는 정의처.
 *  ⚠️ 「기준가」라는 말은 **표 제목(팝업) · 열 머리(`/vehicles`)** 가 이미 하고 있다 —
 *     행마다 또 붙이면 한 화면에 같은 낱말이 일곱 번 나온다. 여기에 붙이지 말 것. */
export function formatStartPrice(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export type StartPriceResult = { prices: StartPrice[]; stale: boolean };

/** 운임기준표의 「10km 이내」 행을 게시 차급 순서대로 읽어온다.
 *  🔴 실패하면 **빈 배열 + `stale: true`** 다 — 낡은 숫자를 게시하느니 안 보여준다(위 참고). */
export async function fetchStartPrices(): Promise<StartPriceResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { prices: [], stale: true };

  try {
    const supabase = createServiceClient(url, key);
    const { data, error } = await supabase
      .from("rate_distance_tiers")
      .select("vehicle_type,base_fare")
      .eq("distance_label", START_PRICE_DISTANCE_LABEL);

    if (error || !data || !data.length) return { prices: [], stale: true };

    const byTon = new Map<string, number>();
    data.forEach((r: { vehicle_type: string | null; base_fare: number | null }) => {
      if (!r.vehicle_type || r.base_fare == null) return;
      byTon.set(r.vehicle_type, Number(r.base_fare));
    });

    // 🔴 차급 순서도, **무엇을 게시할지도** 배열이 정한다 — DB 반환 순서를 그대로
    //    쓰면 화면 순서가 조용히 바뀌고, 자르지 않으면 8~25톤이 다시 새어 나온다.
    const prices = (PUBLISHED_START_PRICE_TONS as readonly string[])
      .map((ton) => ({ ton, amount: byTon.get(ton) }))
      .filter((r): r is StartPrice => typeof r.amount === "number");

    return { prices, stale: false };
  } catch {
    return { prices: [], stale: true };
  }
}
