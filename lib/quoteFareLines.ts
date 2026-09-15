// 화주가 받는 견적서의 금액 줄 — 🔴 **유일 정의처**  (운임기준표 v12 C장)
//
// 사용자 확정 2026-09-15 — 지시서 2-5 3-3 의 **(가)안**:
//   *견적서에서 **가산을 한 줄로 합산**해 표시한다.*
//
// ── 🔴 왜 합치는가 ────────────────────────────────────────────────────
//
//   ① **줄 합 = 최종금액**이라 「조정」 줄이 생기지 않습니다.
//      C장이 **가산 소계**를 격자에 올리는데(`lib/roundToUnit.ts`) `quote_items` 에는
//      **반올림 전 개별 줄**이 그대로 남습니다. 개별 줄을 그대로 그리면 합이 최종금액과
//      어긋나 **거의 모든 견적에 조정 줄이 붙습니다.**
//   ② **28차 확정과 맞습니다** — 가산 「금액」은 화주에게 비공개입니다
//      (`/api/customer/surcharge-options` 가 이름만 내려줍니다).
//
// ── 🔴 무엇을 합치고 무엇을 남기는가 ──────────────────────────────────
//
//   합친다   가산(양수) 줄 전부  →  한 줄  (값은 `quotes.surcharge_amount`)
//   남긴다   **할인(음수) 줄은 그대로**  — 혼적 할인처럼 화주가 **동의해서 받은 것**이라
//            합쳐서 감추면 안 됩니다. 🔴 **할인까지 합치지 마십시오.**
//   남긴다   **조정 줄**(36차 E장) — 담당자가 「최종금액 직접 입력」으로 고친 차액입니다.
//            🔴 **반올림 차액은 여기 오지 않습니다** — 가산 줄이 이미 반올림된
//            `surcharge_amount` 라서, 이 값은 **수동 조정일 때만** 0 이 아닙니다.
//
// ── 🔴 관리자 견적 상세는 이 파일을 쓰지 않습니다 ─────────────────────
//
//   `/admin/quotes/[id]` 는 **내부 화면**이라 개별 가산 줄을 그대로 봅니다(사용자 확정).
//   담당자는 「왜 이 금액인가」를 되짚을 수 있어야 합니다.
//   ⚠️ 그래서 그 화면의 「조정」 줄에는 **반올림 차액이 나타납니다** — 고장이 아닙니다.
//   ⚠️ 그 화면은 원래부터 「공급가액 (부가세 별도)」 줄이 없고 「최종 견적금액」 + 캡션
//      구조입니다(2026-09-15 실측) — v12 가 만든 차이가 아닙니다.

export type QuoteFareQuote = {
  base_fare?: number | null;
  /** 🔴 **반올림된 가산 소계**가 저장돼 있다(견적 등록 시점). 상세 수정은 이 값을 안 고친다. */
  surcharge_amount?: number | null;
  final_amount?: number | null;
};

export type QuoteFareItem = { item_name?: string | null; amount?: number | null };

/** 합쳐진 가산 줄의 이름 — 🔴 여섯 산출물이 같은 말을 쓰도록 여기서 정한다. */
export const QUOTE_SURCHARGE_LINE_LABEL = "가산";

// ── 🔴 무엇에 대한 가산인지는 **적는다** (사용자 지시 2026-09-15) ─────
//
//   *"견적서에 가산금에 대한 내용이 있어야 한다. 지금은 그냥 「가산」으로만 되어 있어
//     고객입장에서 오해할수 있다."*
//
//   🔴 **이름은 적고 금액·요율은 적지 않습니다.** 28차 확정(가산 「금액」은 화주에게
//      비공개 — `/api/customer/surcharge-options` 가 **이름만** 내려줍니다)과 이 지시가
//      부딪히지 않는 지점이 정확히 여기입니다.
//
//        가산 (윙바디 · 새벽 · 왕복 · 상차 수작업 · 대기료)      90,000원
//
//   🔴 **요율 표기 `(80%)` 는 떼어냅니다** — 기본운임이 바로 윗줄에 있어서 요율을 보면
//      그 줄의 금액이 그대로 계산됩니다(왕복 80% × 기본운임). 금액을 감추기로 한 결정이
//      요율 한 글자로 무너집니다. 🔴 **되살리지 마십시오.**
//   ⚠️ `(47분)`·`2곳` 처럼 **금액이 계산되지 않는 괄호는 남깁니다** — 무엇에 대한
//      가산인지 알려주는 정보이고, 이 지시가 원하는 바로 그것입니다.

/** 이름에서 요율 표기만 떼어낸다 — `왕복 (80%)` → `왕복` */
export function stripRateSuffix(name: string): string {
  return name.replace(/\s*\(\s*-?[\d.]+\s*%\s*\)\s*$/, "").trim();
}

export type QuoteFareLines = {
  /** 운임기준표에서 산출된 기본운임 */
  base: number;
  /** 한 줄로 합쳐진 가산 (0이면 줄을 그리지 않는다) */
  surcharge: number;
  /** 🔴 그 가산이 **무엇에 대한 것인지** — 이름만, 요율·금액 없이 */
  surchargeNames: string[];
  /** 화면이 그대로 쓰는 라벨 — `가산` 또는 `가산 (윙바디 · 새벽)` */
  surchargeLabel: string;
  /** 할인(음수) 줄 — 원래 이름과 금액 그대로 */
  discountLines: { item_name: string; amount: number }[];
  /** 🔴 수동 조정 차액. 0이면 줄을 그리지 않는다(반올림은 여기 안 온다) */
  adjustment: number;
};

/**
 * 화주 견적서가 그릴 금액 줄을 만든다.
 *
 * 🔴 **`items` 를 아직 안 불러온 상태에서 부르지 말 것** — 빈 배열로 계산하면
 *    할인 줄이 사라지고 그만큼이 「조정」으로 보인다(`lib/quoteAdjustment.ts` 와 같은 함정).
 *
 * 🔴 **합이 반드시 맞는다** — `base + surcharge + ΣdiscountLines + adjustment === final_amount`.
 *    산출물마다 따로 더하지 말고 이 함수가 준 값을 그대로 그릴 것.
 */
export function buildQuoteFareLines(
  quote: QuoteFareQuote,
  items: QuoteFareItem[]
): QuoteFareLines {
  const base = quote.base_fare || 0;
  const list = items || [];

  const discountLines = list
    .filter((it) => (it.amount || 0) < 0)
    .map((it) => ({ item_name: it.item_name || "할인", amount: it.amount || 0 }));
  const discountTotal = discountLines.reduce((sum, it) => sum + it.amount, 0);

  // 🔴 저장된 반올림 소계가 정본이다. 없는 옛 견적만 양수 줄을 더해서 메운다
  //    (v12 이전 견적은 둘이 같은 값이라 출력이 한 글자도 안 바뀐다).
  const surcharge =
    quote.surcharge_amount != null
      ? Number(quote.surcharge_amount)
      : list.reduce((sum, it) => sum + Math.max(it.amount || 0, 0), 0);

  // 🔴 이름은 **양수 줄에서만** 모은다 — 할인 줄은 제 이름으로 따로 그려진다.
  //    중복은 없앤다(상차·하차가 같은 조건이면 한 번만 적는 편이 읽기 쉽다).
  const surchargeNames = Array.from(
    new Set(
      list
        .filter((it) => (it.amount || 0) > 0)
        .map((it) => stripRateSuffix(it.item_name || ""))
        .filter(Boolean)
    )
  );
  const surchargeLabel = surchargeNames.length
    ? `${QUOTE_SURCHARGE_LINE_LABEL} (${surchargeNames.join(" · ")})`
    : QUOTE_SURCHARGE_LINE_LABEL;

  const final = quote.final_amount;
  const adjustment =
    final === null || final === undefined
      ? 0
      : Math.round(Number(final) - (base + surcharge + discountTotal));

  return { base, surcharge, surchargeNames, surchargeLabel, discountLines, adjustment };
}
