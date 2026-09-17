// 견적서 「조정」 줄 (36차 E장 · 사용자 지시 2026-09-14).
//
// 사용자 원문:
//   *"견적관리에서 「최종금액 직접 입력」을 수정했을 때 기본운임에서 + - 되어서 해당
//     최종금액이 맞춰 줘야 한다. 그래서 화주가 보는 견적서상에 오해가 없어야 한다."*
//
// 🔴 **문제는 견적서의 항목 합이 최종금액과 안 맞는 것이었다.**
//    담당자가 「최종금액 직접 입력」으로 금액을 조정하면 `final_amount` 만 바뀌고
//    항목 줄(기본운임 · 가산 · 할인)은 그대로라, 화주가 받은 견적서에서
//    **더해도 합계가 안 나왔다.**
//
//      기본운임      60,000
//      야간 할증     10,000
//      ─────────────────────
//      공급가액      68,000   ← 🔴 68,000 이 어디서 나왔는지 설명이 없다
//
// ⚠️ **2026-09-17 에 뒤집혔다 — 지금은 기본운임에 흡수시킨다.**
//    36차 E장은 **「줄을 하나 더하는 것」**으로 고쳤고 그것을 「사용자 확정」으로 적었는데,
//    🔴 **그때의 사용자 원문도 위의 「기본운임에서 + - 되어서」였다.** 같은 지시가 다시
//    왔으므로(*「계산 내역에 "조정"으로 들어가지 말고 기본운임에 들어가게 하자.
//    계산서 증액된 금액이 조정으로 들어가면 안좋을 것 같다」*) 이제 글자 그대로 한다.
//    자리는 **`lib/quoteFareLines.ts` 의 `baseFareAbsorbingAdjustment()`** 하나다.
//
//    🔴 **아래 「기본운임을 바꾸면 되짚을 수 없다」는 걱정은 수정 이력이 답한다** —
//       `activity_logs` 에 `기본운임 120,000원 → 140,000원` 이 남는다(2026-09-17 신설).
//       🔴 **이 문단을 근거로 「줄을 하나 더하는」 쪽으로 되돌리지 말 것.**
//
//    ⚠️ **이 파일이 죽은 것은 아니다** — 관리자 견적 상세는 여전히 **개별 가산 줄**로
//       계산하므로(v12 C장 확정) **반올림 차액만큼의 조정 줄이 그 화면에 남는다.**
//       화주가 받는 견적서 쪽은 `buildQuoteFareLines()` 가 0으로 맞춘다.
//
//    (아래는 그때의 설명 — 무엇을 왜 그렇게 정했었는지의 근거로 남긴다)
//    ~~고치는 방법은 「줄을 하나 더하는 것」이다 — 기본운임을 덮어쓰지 않는다.
//    기본운임을 바꾸면 운임기준표에서 산출된 값이라는 사실이 사라지고, 나중에
//    「왜 이 거리에 이 금액인가」를 되짚을 수 없다.~~
//
//      기본운임      60,000
//      야간 할증     10,000
//      조정          -2,000   ← 🟢 이 줄이 답한다
//      ─────────────────────
//      공급가액      68,000
//
// 🔴 **식은 지시서가 적은 것과 다르다.** 지시서는 `기본운임 + 가산 − 혼적할인` 이라 했는데,
//    견적서가 실제로 그리는 줄은 **`quote_items`**(가산)와 **`discount_amount`**(할인)이고
//    **혼적할인은 이미 `quote_items` 안에 음수 행으로 들어 있다.** 혼적할인을 따로 빼면
//    **두 번 빠진다.**
//
//      조정 = final_amount − (base_fare + Σ quote_items.amount − discount_amount)
//
// ⚠️ **실측(2026-09-14)**: `quote_items` **0행** · 조정이 걸린 견적 **1건(−2,000)** ·
//    `discount_amount` 는 전 건 0. 🔴 **그래서 「할인 줄이 화면 둘에는 없고 PDF·엑셀에만
//    있는」 불일치가 지금은 잠복 상태다** — 값이 0이라 안 보일 뿐이고, 누가 할인을 넣는
//    순간 화면과 PDF 가 갈린다. 이 파일은 그 줄을 만들지 않는다(E장 범위 밖).

export type QuoteAdjustmentInput = {
  /** 운임기준표에서 산출된 기본운임 */
  base_fare?: number | null;
  /** 🔴 담당자가 「최종금액 직접 입력」으로 확정한 공급가액 */
  final_amount?: number | null;
  /** 🔴 별도 할인 칸. 혼적할인이 아니다(그건 아래 items 안에 있다) */
  discount_amount?: number | null;
};

export type QuoteItemLike = { amount?: number | null };

/**
 * 견적서 항목 합과 최종금액의 차이 — 「조정」 줄에 그릴 값.
 *
 * 🔴 **`final_amount` 가 없으면 0을 돌려준다** — 조정할 기준 자체가 없는 상태다.
 *    0을 돌려줘야 화면이 줄을 안 그린다(아래 `shouldShowAdjustment`).
 * 🔴 **`quote_items` 를 아직 안 불러온 상태에서 부르지 말 것** — 빈 배열로 계산하면
 *    가산액만큼이 통째로 「조정」으로 보인다. 각 화면이 items 조회를 마친 뒤에 부른다.
 */
export function calcQuoteAdjustment(
  quote: QuoteAdjustmentInput,
  items: QuoteItemLike[]
): number {
  if (quote.final_amount === null || quote.final_amount === undefined) return 0;
  const base = quote.base_fare || 0;
  const itemsTotal = (items || []).reduce((sum, it) => sum + (it.amount || 0), 0);
  const discount = quote.discount_amount || 0;
  return Math.round(quote.final_amount - (base + itemsTotal - discount));
}

/**
 * 「조정」 줄을 그릴지 — 🔴 **0이면 그리지 않는다.**
 * 조정이 없는 견적의 출력이 종전과 **한 글자도 달라지면 안 된다**(회귀 0의 근거다).
 */
export function shouldShowAdjustment(adjustment: number): boolean {
  return adjustment !== 0;
}

/**
 * 「조정」 줄의 금액 표기. 🔴 **증액은 `+`, 감액은 `−` 를 붙인다** — 부호가 없으면
 * 화주가 어느 쪽으로 움직였는지 모른다.
 *
 * ⚠️ 감액에 쓰는 것은 **빼기 기호(U+2212)가 아니라 하이픈**이다 — 견적서의 기존 할인 줄이
 *    `-{won(...)}` 로 하이픈을 쓰고 있어, 여기만 다른 글자를 쓰면 두 줄의 모양이 갈린다.
 *
 * @param won 각 화면이 이미 쓰고 있는 금액 포맷 함수(천단위·「원」 표기가 화면마다 다르다)
 */
export function formatAdjustment(
  adjustment: number,
  won: (n: number) => string
): string {
  const sign = adjustment > 0 ? "+" : "-";
  return `${sign}${won(Math.abs(adjustment))}`;
}

/** 견적서에 그리는 줄 이름 — 🔴 네 산출물이 같은 말을 쓰도록 여기서 정한다. */
export const QUOTE_ADJUSTMENT_LABEL = "조정";
