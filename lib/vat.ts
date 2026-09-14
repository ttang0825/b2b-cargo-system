// 부가세(×0.1)/부가세 포함 합계(×1.1) 계산 공용 함수 — 로드맵 ②-A 세션에서
// 여러 화면(admin/quotes, customer/quotes, customer/invoices)에 각자 중복
// 구현돼 있던 로컬 계산과 lib/settlementCalc.ts 내부의 인라인 계산을 여기
// 하나로 통합했다. 원 단위는 반올림(기존 화면 표시 관례 기준, 산재보험료
// 계산의 절사와는 별개 — 산재보험료 쪽은 lib/settlementCalc.ts에 그대로 둠).
export function calcVatAmount(supplyAmount: number): number {
  return Math.round(supplyAmount * 0.1);
}

export function calcInclusiveAmount(supplyAmount: number): number {
  return Math.round(supplyAmount * 1.1);
}

// 부가세 포함가 → 공급가액. 35차 A-3 에서 부가세 구분 컬럼을 되살리면서 필요해졌다.
//
// ⚠️ 7차 세션에 `lib/settlementCalc.ts` 의 `toSupplyAmount()` 를 지운 적이 있다 —
//    그때는 입력값을 항상 공급가액으로 고정했기 때문에 변환할 일이 없어서였다.
//    🔴 **이번 것은 그것과 자리가 다르다** — 계산기 안이 아니라 공용 부가세 파일이고,
//    `calcInclusiveAmount()` 의 역연산이라 한 쌍으로 여기 있는 것이 맞다.
export function toSupplyAmount(inclusiveAmount: number): number {
  return Math.round(inclusiveAmount / 1.1);
}

/**
 * 한 금액을 **공급가액 · 부가세 · 합계** 세 쪽으로 가른다. 35차 리뷰 8라운드 신설.
 *
 * 🔴 **셋은 항상 `공급가액 + 부가세 = 합계` 로 맞아떨어진다** — 부가세를
 *    `공급가액 × 0.1` 로 따로 반올림하지 않고 **차액으로** 뽑기 때문이다.
 *
 * 🔴 **입력값은 절대 안 바뀐다.** 포함가로 적은 금액은 합계가 그 값 그대로이고,
 *    별도로 적은 금액은 공급가액이 그 값 그대로다.
 *    ⚠️ 그전에는 포함가로 적은 금액도 `공급가액 × 1.1` 로 **다시 계산**해서
 *       돌려줬는데, `round(x/1.1) × 1.1` 은 원래 값으로 안 돌아온다 —
 *       11,000원마다 1원씩 어긋났다(6,000 → 6,001 · 17,000 → 17,001 …).
 *       세금계산서에 찍히는 금액과 우리 화면이 1원 달라지던 원인이다
 *       (사용자 신고 2026-09-14 — 24시콜 대조).
 *    🔴 **`inclusive` 를 `supply * 1.1` 로 되돌리지 말 것.**
 *
 *      포함가 6,000 기입  →  공급 5,455 · 부가세   545 · 합계  6,000  ✅
 *      별도  5,455 기입  →  공급 5,455 · 부가세   546 · 합계  6,001
 *      🔴 둘이 1원 다른 것은 **버그가 아니다** — 서로 다른 입력이다.
 */
export type VatSplit = { supply: number; vat: number; inclusive: number };

export function splitVat(
  amount: number | null | undefined,
  vatIncluded: boolean | null | undefined
): VatSplit {
  const n = Math.round(amount || 0);
  if (vatIncluded) {
    const supply = toSupplyAmount(n);
    return { supply, vat: n - supply, inclusive: n };
  }
  const vat = calcVatAmount(n);
  return { supply: n, vat, inclusive: n + vat };
}
