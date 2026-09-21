// 기업고객 리워드 — **계산 정의처 하나** (A장, 2026-09-20)
//
// 🔴 **이 파일의 의존성은 `lib/vat.ts` 하나뿐이다**(그쪽도 순수 함수만 있다).
//    supabase 클라이언트를 들이지 말 것 — 서버 라우트가 이 파일을 import 하는데,
//    `lib/supabaseClient` 는 **읽는 순간** 브라우저 클라이언트를 만들어서
//    `next build` 가 *"Failed to collect page data"* 로 멈춘다
//    (PR #151 `lib/quoteValidity.ts` · PR #179 `lib/callScript.ts` 와 같은 자리).
//    조회는 부르는 쪽이 하고, 여기는 **받은 값으로 계산만** 한다.
//
// ── 🔴 적립 기준 (사용자 확정 2026-09-18) ──────────────────────────────────
//
//   적립률      운임 **공급가액**(부가세 제외)의 5% · 🔴 **10원 미만 내림**
//               (2026-09-21 확정 — 그전에는 1원 미만 절사였다. 되돌리지 말 것)
//   대상 금액   🔴 **기본 운임 공급가액만** — 현장 추가비 제외
//   적립 시점   🔴 **수금방식마다 다르다**(아래)
//   선착불      🟢 **포함**(2026-09-21 사용자 확정 — 그전에는 제외였다)
//
// ── 🚨 선착불이 「제외」에서 「포함」으로 뒤집혔다 (2026-09-21) ───────────────
//
//   🔴 **아래 옛 근거를 읽고 되돌리지 마십시오.** 1차 착수 시점(2026-09-18)에는
//      선착불을 뺐고 사유는 이랬다 —
//
//        선착불(`driver_direct`)은 **화주가 위캐리에 입금하지 않는다.** 운임은
//        차주가 직접 받고 위캐리가 받는 것은 주선수수료뿐이며 화주 미수금은 0이다
//        (HANDOFF §5-12 · `lib/receivableCalc.ts`). 그래서 ① 「화주 입금 확인」이라는
//        사건이 일어나지 않고 ② `customer_charge_total` 은 화주가 우리에게 낸 돈이
//        아니라, 기준이 될 **금액과 시점이 존재하지 않는다**고 봤다.
//
//   🟢 **사용자가 「선착불도 적립 대상에 넣어줘」로 확정했고, 없다던 둘을 이렇게 정했다** —
//
//     시점   🔴 **주선수수료 입금**(`invoices.brokerage_fee_paid`)이다.
//            선착불 건에는 `payment_received` 체크박스가 **화면에 아예 없고**
//            (`collection_method === "broker"` 일 때만 그려진다) 수수료가 그 건의
//            **유일한 수금 사건**이다(35차 확정). 🔴 화주 입금으로 되돌리지 말 것 —
//            그 칸은 선착불에서 담당자가 만질 수 없어 **영영 적립되지 않는다.**
//     금액   🔴 **운임 공급가액 그대로**(broker 와 같다). 화주가 낸 운임인 것은
//            사실이고, 프로모션이 약속한 것도 「운임의 5%」다. 🔴 주선수수료의 5% 로
//            바꾸지 말 것 — 화주에게 약속한 것과 다른 금액이 된다.
//            🚨 **그리고 그 운임은 저장된 부가세 구분을 보지 않는다**(2026-09-21 확정 —
//            *"선착불건의 전체 운송료는 기본적으로 부가세 별도 금액이다"*).
//            자세한 것은 `rewardBaseAmount` 머리말.
//
//   ⚠️ **보고한 대가** — 선착불에서 위캐리 매출은 주선수수료뿐인데 적립은 **운임**
//      기준이라, 그 건의 매출 대비 적립 비중이 broker 보다 훨씬 크다(운임 80,000 ·
//      수수료 15,000 이면 적립 4,000 원 = 매출의 약 27%). **사용자가 알고 고른 것이다.**
//
// ── ⚠️ 현장 추가비가 스냅샷에 섞여 있을 수 있다 (실측 2026-09-20) ───────────
//
//   `lib/autoCreateInvoice.ts` 가 정산 건을 만들 때 **그 시점의 활성 추가비를
//   `customer_charge_total` 에 더해서 얼린다**(`charge = customerCharge + extraCharge`).
//   🟢 지금 운영에는 추가비가 **0행**이라 섞인 건이 없지만 **구조상 섞인다.**
//   → 그래서 `includedExtraChargeTotal` 을 받아서 **빼고** 공급가액을 낸다.
//      🔴 부르는 쪽이 넘기는 값은 **그 정산 건 생성 시점에 이미 포함된 것만**이다
//         (`created_at <= invoice.created_at` · `status='active'` ·
//          `correction_invoice_id is null` — 35차 A-7 과 같은 규칙).
//      🔴 **그 뒤에 등록된 추가비는 애초에 스냅샷에 없으므로 빼면 안 된다** —
//         빼면 기본 운임에서 두 번 깎인다.

import { splitVat } from "./vat";

/** 🔴 원장 유형 — DB CHECK 와 같아야 한다. 3차에 늘릴 때 제약도 같이 고칠 것. */
export type RewardTransactionType = "transport_earn" | "reversal" | "adjustment";
/** 🔴 원본 종류 — DB CHECK 와 같아야 한다. */
export type RewardSourceType = "invoice" | "billing_batch" | "manual";
/** 🔴 혜택 제공 방식 — DB CHECK 와 같아야 한다. */
export type RewardMethod = "freight_discount" | "giftcard" | "manual";

export const REWARD_METHOD_OPTIONS: { value: RewardMethod; label: string }[] = [
  { value: "freight_discount", label: "운임 할인" },
  { value: "giftcard", label: "상품권" },
  { value: "manual", label: "담당자 협의" },
];

export function rewardMethodLabel(v: string | null | undefined): string {
  return REWARD_METHOD_OPTIONS.find((o) => o.value === v)?.label ?? "담당자 협의";
}

export type RewardBaseInput = {
  /** `invoices.customer_charge_total` — 🔴 생성 시점 스냅샷이다 */
  customerChargeTotal: number | null | undefined;
  /** `invoices.customer_charge_vat_included` — 🔴 실측상 포함가 건이 실재한다 */
  customerChargeVatIncluded: boolean | null | undefined;
  /** 🔴 그 스냅샷에 **이미 섞여 들어간** 현장 추가비 합계(화주 청구분) */
  includedExtraChargeTotal?: number | null;
  /**
   * 🚨 **선착불(`driver_direct`)이면 저장된 부가세 구분을 쓰지 않는다**
   *    (사용자 확정 2026-09-21 — *"선착불건의 전체 운송료는 기본적으로 부가세
   *    별도 금액이다"*). 없으면 저장된 구분을 그대로 쓴다.
   */
  collectionMethod?: string | null;
};

/**
 * 적립 기준이 되는 **공급가액**을 뽑는다 — 부가세 제외 · 현장 추가비 제외.
 *
 * 🔴 **부가세를 1.1 로 직접 나누지 말 것.** `splitVat` 이 정의처다 — 되돌리면
 *    **11,000원마다 1원**이 어긋난다(35차 리뷰 8라운드 · HANDOFF §5-12).
 * 🔴 **추가비를 부가세보다 먼저 뺀다** — 추가비도 같은 기준(포함/별도)으로 적힌
 *    금액이라 합계에서 빼고 나서 가르는 것이 맞다. 순서를 바꾸면 포함가 건에서
 *    추가비의 부가세만큼 어긋난다.
 *
 * ── 🚨 선착불은 부가세 구분을 보지 않는다 (2026-09-21 사용자 확정) ──────────
 *
 * 선착불은 **화주가 차주에게 직접 내는 운임**이고 위캐리가 그 금액으로 세금계산서를
 * 끊지 않는다. 그래서 `customer_charge_vat_included` 가 그 건에서는 **우리 장부의
 * 뜻을 갖지 않고**(담당자가 무엇을 골라 뒀든) 적힌 금액이 곧 운임이다.
 * 실제로 운영 3건 중 둘이 「포함」으로 저장돼 있었는데, 그대로 1.1 로 가르면
 * **화주에게 약속한 「운임의 5%」보다 적게 적립**된다.
 *
 * 🔴 **이 분기를 지우지 말 것** — 지우면 80,000원 건이 72,727원 기준이 되어
 *    적립이 3,600원으로 떨어진다(약속한 값은 4,000원이다).
 * 🔴 **반대로 `broker` 에까지 넓히지 말 것** — 그쪽은 우리가 화주에게 청구하고
 *    세금계산서를 끊는 금액이라 구분이 실제 뜻을 갖는다(포함가 건이 실재한다).
 * ⚠️ **정산 화면의 부가세 표시는 그대로다** — 그 화면은 저장된 구분을 보여 준다.
 *    선착불 건에서 적립 기준과 그 표시가 갈리는 것은 **의도된 것**이다.
 */
export function rewardBaseAmount(input: RewardBaseInput): number {
  const total = Math.round(input.customerChargeTotal || 0);
  const extra = Math.round(input.includedExtraChargeTotal || 0);
  const freightOnly = total - extra;
  if (freightOnly <= 0) return 0;
  const vatIncluded =
    input.collectionMethod === "driver_direct" ? false : input.customerChargeVatIncluded;
  return splitVat(freightOnly, vatIncluded).supply;
}

/**
 * 🔴 **적립 단위 — 10원**(사용자 확정 2026-09-21).
 *
 * ⚠️ **같은 날 두 번 바뀌었다** — 1원 절사(09-18) → **100원**(09-21) → **10원**(09-21).
 *    🔴 **100원으로 되돌리지 말 것.** 100원으로 했더니 **5%가 100원 단위로 안 떨어지는
 *    건에서 최대 90원씩 깎였고**, 담당자가 월 정산에서 그 차이를 발견했다
 *    (공급가액 1,172,000원 13건이 58,600 이어야 하는데 **58,500** 이 됐다 —
 *    65,000 과 125,000 두 건이 3,250 → 3,200 · 6,250 → 6,200 으로 50원씩 잃었다).
 *    🟢 **10원이면 그 두 건이 그대로 남아 합이 58,600 이 된다** — 화주에게 약속한
 *    5% 에 붙고, 화면에 1원 단위 끝자리가 나오지도 않는다.
 *
 * ⚠️ **깎이는 것 자체는 단위를 두는 한 없어지지 않는다**(10원 단위면 최대 9원).
 *    🔴 없애려면 1원 절사로 돌아가야 하는데 그것은 09-21 에 사용자가 뒤집은 것이다.
 */
export const REWARD_EARN_UNIT = 10;

/**
 * 공급가액 × 요율 → 적립액. 🔴 **10원 미만 내림**(`Math.round` 가 아니다).
 *
 *   100,000 × 5% = 5,000        (딱 떨어지면 그대로)
 *    65,000 × 5% = 3,250        (10원 배수라 그대로 — 100원 단위면 3,200 이었다)
 *    99,999 × 5% = 4,999.95  → **4,990**
 *    72,727 × 5% = 3,636.35  → **3,630**
 *
 * 🚨 **「표시만 10원 단위」로 만들지 말 것.** 적립액 자체를 10원 단위로 낸다 —
 *    화면에서만 내리면 **원장 합계와 화면의 잔액이 갈린다**(원장은 1원 단위인데
 *    화면은 10원 단위라, 건이 쌓일수록 어긋남이 커진다). 원장에 들어가는 값이
 *    이미 10원 배수이면 그 합도 10원 배수라 **두 숫자가 영원히 같다.**
 *    ⚠️ 수동 조정만 예외다 — 담당자가 1원 단위로 넣을 수 있다(그것은 의도다).
 *
 * 🔴 **합계에 요율을 걸어 「정확한 5%」를 내지 말 것** — 적립은 **운송 건별로 원장에
 *    한 줄씩** 쌓이므로(월정산 묶음도 마찬가지), 합계 기준 금액은 원장 줄의 합과
 *    어긋난다. 그 어긋남을 없애려고 단위를 둔 것이다.
 *
 * ⚠️ `toFixed(6)` 을 거치는 이유 — 요율 5% 는 이진수로 정확히 담기지 않아
 *    `base * rate` 가 정확값보다 **아주 조금 큰** 값이 되는 일이 있다
 *    (1,000,000 × 5% 가 50000.00000000001 로 나온다). 그대로 내림해도 답은 같지만,
 *    요율이 바뀌었을 때 **아주 조금 작아지는** 쪽이 나오면 한 단위를 잃는다.
 *    소수 여섯째 자리에서 정리한 뒤 내리면 두 경우가 다 맞는다.
 * 🔴 **`Math.round` 로 바꾸지 말 것** — 확정값이 「내림」이다.
 */
export function rewardEarnAmount(
  baseAmount: number,
  earnRate: number | null | undefined
): number {
  const rate = Number(earnRate || 0);
  if (!(baseAmount > 0) || !(rate > 0)) return 0;
  const exact = Number((baseAmount * rate).toFixed(6));
  return Math.floor(exact / REWARD_EARN_UNIT) * REWARD_EARN_UNIT;
}

export type RewardEligibilityInput = {
  /**
   * `invoices.collection_method`
   * ⚠️ **더 이상 적립 여부를 가르지 않는다**(2026-09-21 — 선착불도 대상이다).
   *    가르는 것은 **적립 시점의 칸**뿐이다(`rewardReceiptConfirmed`).
   * 🔴 여기에 `driver_direct` 제외를 되살리지 말 것.
   */
  collectionMethod?: string | null | undefined;
  /** 화주가 없는 건(게스트 오더)은 적립할 대상이 없다 */
  companyId: string | null | undefined;
  /** `rewardBaseAmount()` 결과 */
  baseAmount: number;
};

export type RewardIneligibleReason =
  // ⚠️ `direct_collection` 은 2026-09-21 에 없어졌다 — 선착불도 적립 대상이다.
  //    🔴 되살리지 말 것(위 머리말).
  | "no_company"
  | "zero_amount";

/**
 * 이 정산 건이 **금액·시점 기준으로** 적립 대상인가.
 *
 * 🔴 **멤버십·캠페인 기간 판정은 여기서 하지 않는다** — 그것은 DB 를 읽어야 알 수
 *    있어서 서버 라우트가 한다. 이 함수는 **정산 건 자체의 성질**만 본다.
 * ⚠️ **수금방식으로 거르지 않는다**(2026-09-21) — 선착불도 대상이고, 갈리는 것은
 *    **어느 칸을 입금으로 볼 것인가**뿐이다(`rewardReceiptConfirmed`).
 */
export function rewardIneligibleReason(
  input: RewardEligibilityInput
): RewardIneligibleReason | null {
  if (!input.companyId) return "no_company";
  if (!(input.baseAmount > 0)) return "zero_amount";
  return null;
}

/**
 * 🚨 **수금방식마다 「돈이 들어온 사건」이 다르다** (2026-09-21 · 선착불 포함 확정).
 *
 *   broker(주선사 수금)  → `payment_received`      화주가 위캐리에 입금
 *   driver_direct(선착불) → `brokerage_fee_paid`   차주가 주선수수료를 입금
 *
 * 🔴 **선착불을 `payment_received` 로 재지 말 것** — 그 체크박스는 정산 상세에서
 *    `collection_method === "broker"` 일 때만 그려진다. 선착불 건에서는 담당자가
 *    켤 수가 없어서 **영영 적립되지 않는다**(실측: 선착불 3건 모두 `false`).
 * 🔴 **반대로 broker 를 `brokerage_fee_paid` 로 재지도 말 것** — 그 칸은 선착불의
 *    유일한 미수금을 쓰는 자리라 broker 건에서는 의미가 없다(35차 확정).
 */
export function rewardReceiptConfirmed(input: {
  collectionMethod?: string | null;
  paymentReceived?: boolean | null;
  brokerageFeePaid?: boolean | null;
}): boolean {
  return input.collectionMethod === "driver_direct"
    ? input.brokerageFeePaid === true
    : input.paymentReceived === true;
}

/** 위 판정이 거짓일 때의 사유 — 화면이 수금방식에 맞는 말을 쓰게 한다 */
export function rewardNotReceivedReason(collectionMethod?: string | null): string {
  return collectionMethod === "driver_direct" ? "fee_not_received" : "not_received";
}

export function isRewardEligible(input: RewardEligibilityInput): boolean {
  return rewardIneligibleReason(input) === null;
}

export const REWARD_INELIGIBLE_LABEL: Record<RewardIneligibleReason, string> = {
  no_company: "대상 아님 — 화주가 연결되지 않은 건",
  zero_amount: "대상 아님 — 적립 기준 금액이 0원",
};

export type RewardLedgerAmountRow = {
  transaction_type?: string | null;
  amount: number | null;
};

export type RewardBalance = {
  /** 원장 합계 — 적립 + 회수 + 조정 */
  balance: number;
  /** 누적 적립(+) 만 */
  earned: number;
  /** 누적 사용·회수(−) 의 절대값 */
  used: number;
};

/**
 * 🔴 **잔액은 원장 합계의 표시 시점 계산이다.** `companies` 에 잔액 컬럼을 만들지 말 것 —
 *    `outstanding_amount` 가 저장 스냅샷이라 **선착불 화주는 영영 안 고쳐졌던** 사고가
 *    이 저장소에 있다(36차 C장). 표시 시점 계산이면 **옛 건도 자동으로 맞는다.**
 */
export function rewardBalance(rows: RewardLedgerAmountRow[]): RewardBalance {
  let earned = 0;
  let used = 0;
  for (const r of rows || []) {
    const n = Math.round(r.amount || 0);
    if (n > 0) earned += n;
    else used += -n;
  }
  return { balance: earned - used, earned, used };
}
