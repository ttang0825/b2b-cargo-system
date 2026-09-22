// 기업고객 리워드 — **운임 할인** 관문·계산의 유일한 정의처 (2026-09-22)
//
// 사용자 요청: *"운임 할인 적용도 만들어줘."*
// 1차가 `reward_method = 'freight_discount'` 를 저장만 하고 **읽는 코드를 0건**으로
// 남겨 둔 자리다. 쌓인 적립금을 **운임에서 깎아 주는** 경로다.
//
// ── 🚨 금액을 어디에 적는가 — 이 파일이 전제하는 구조 ──────────────────────
//
//   할인은 **화주가 낼 돈을 바꾼다.** 금액을 보여주는 자리가 여덟 곳이 넘어서
//   (관리자 목록·상세 · 포털 정산확인·홈·월별통계 · 대시보드 · 미수금 ·
//   월정산 묶음), 한 곳만 빠뜨리면 **화면마다 금액이 갈린다** — 36차 C장의
//   미수금 신고가 정확히 그 모양이었다.
//
//   🟢 **그래서 `invoices.customer_charge_total` 자체가 「깎은 뒤 금액」이다.**
//      읽는 자리가 **저절로 전부 맞고**, 저장소 밖에 있는 월정산 묶음 DB 함수 둘
//      (`add_item_to_billing_batch` · `refresh_item_snapshot`)도 **한 글자도
//      안 고쳐도 된다**(둘 다 그 컬럼만 읽는다 — `_verify.sql` ㊲-e 로 실측했다).
//
//        깎기 전 공급가액 = customer_charge_total + reward_discount_amount
//        깎은 뒤 공급가액 = customer_charge_total          ← 화면이 읽는 값
//
//   🔴 **원칙 47번을 어기는 것이 아니다** — 그 원칙이 막는 것은 「**나중에 생긴
//      추가** 금액(현장 추가비)을 스냅샷에 섞는 것」이고, 이것은 담당자가 사유를
//      적고 내리는 **청구 금액 결정**이다(35차 A-7 과 같은 결).
//      🔴 **이 판단을 근거로 「추가비도 스냅샷에 넣자」로 넓히지 말 것.**
//
// ── 🔴 원장은 그대로 append-only 다 ───────────────────────────────────────
//
//   처음 걸 때      `freight_discount` 한 줄 (−금액)
//   금액을 바꿀 때  그 줄은 **그대로 두고** 차액만큼 `adjustment` 한 줄
//   0 으로 되돌릴 때 같은 방식(= 전액 되돌림)
//
//   🔴 **`freight_discount` 줄을 지우거나 고치지 말 것.** 부분 UNIQUE
//      (`campaign_id, transaction_type, source_type, source_id`)가 **한 정산 건에
//      할인 한 줄**을 강제하므로, 고치는 길은 차액 조정뿐이다 — 그리고 그 편이
//      맞다(무엇을 언제 얼마로 바꿨는지가 줄로 남는다).

import type { RewardCampaign } from "./rewardCampaign";

/** 🔴 원장 유형 — DB CHECK 와 같아야 한다(`lib/rewardCalc.ts` 의 것을 늘린 값이다). */
export const REWARD_USE_TYPE = "freight_discount" as const;

// ── 관문 ────────────────────────────────────────────────────────────────────

export type RewardUseBlockReason =
  | "not_member"
  | "member_no_campaign"
  | "use_period_over"
  | "direct_collection"
  | "invoice_locked"
  | "payment_received"
  | "in_confirmed_batch"
  | "no_charge"
  | "no_balance"
  | "below_minimum";

/** 🔴 화면에 그대로 나가는 말이다 — 화면 파일에 다시 적지 말 것(두 벌이 되면 갈린다). */
export const REWARD_USE_BLOCK_LABEL: Record<RewardUseBlockReason, string> = {
  not_member: "리워드에 참여하지 않는 화주입니다",
  member_no_campaign: "활성 캠페인이 없습니다",
  use_period_over: "적립금 사용 기간이 지났습니다",
  // 🚨 실측(㊲-d) — 선착불 3건. 화주가 차주에게 직접 내므로 **위캐리가 끊는
  //    청구서가 애초에 없다.** 깎을 대상 자체가 없다.
  direct_collection: "선착불 건은 화주에게 청구하는 금액이 없어 할인할 수 없습니다",
  invoice_locked: "확정(잠금)된 정산 건은 할인을 걸 수 없습니다",
  payment_received: "이미 입금 완료된 건은 할인을 걸 수 없습니다",
  in_confirmed_batch: "확정된 월정산 묶음에 담겨 있어 금액이 굳었습니다",
  no_charge: "청구 금액이 아직 정해지지 않았습니다",
  no_balance: "쓸 수 있는 적립금이 없습니다",
  below_minimum: "최소 사용액에 못 미칩니다",
};

export function rewardUseBlockLabel(reason: string | null | undefined): string {
  if (!reason) return "";
  return REWARD_USE_BLOCK_LABEL[reason as RewardUseBlockReason] ?? reason;
}

export type RewardUseGateInput = {
  campaign: RewardCampaign | null;
  /** 멤버십 행이 있는가. 🔴 `enabled` 는 보지 않는다 — 아래 설명 참고. */
  isMember: boolean;
  invoice: {
    collection_method?: string | null;
    locked?: boolean | null;
    customer_side_locked?: boolean | null;
    payment_received?: boolean | null;
    customer_charge_total?: number | null;
    reward_discount_amount?: number | null;
  };
  /** 이 정산 건이 담긴 **해제되지 않은** 묶음의 상태(`draft`/`confirmed`/없으면 null) */
  batchStatus?: string | null;
  /** 원장 합계(현재 잔액) */
  balance: number;
  /** 오늘(YYYY-MM-DD) — 시험에서 고정하려고 인자로 받는다 */
  today?: string;
};

/**
 * 「지금 이 정산 건에 할인을 걸 수 있는가」 — 못 걸면 사유를, 걸 수 있으면 `null`.
 *
 * 🔴 **`enabled = false` 가 막지 않는다.** 그 칸의 뜻은 **「신규 적립 중단」**이고
 *    (1차 확정 · `reward_core.sql` ③), 이미 쌓인 적립금을 못 쓰게 하는 칸이 아니다.
 *    🔴 **「꺼졌으니 못 쓴다」로 바꾸지 말 것** — 적립을 멈춘 화주가 남은 적립금을
 *       영영 못 쓰게 되고, 그것은 우리가 약속한 것과 다르다.
 *
 * 🔴 **`portal_visible` 도 보지 않는다** — 그것은 화주에게 보여줄지의 칸이지
 *    담당자가 깎아 줄 수 있는지가 아니다.
 *
 * ⚠️ 순서에 뜻이 있다 — **바꿀 수 없는 사실부터** 본다(참여 → 기간 → 수금방식 →
 *    잠금 → 입금 → 묶음 → 금액 → 잔액). 담당자가 무엇을 해야 하는지가 그 순서다.
 */
export function rewardUseBlockReason(input: RewardUseGateInput): RewardUseBlockReason | null {
  const { campaign, isMember, invoice, batchStatus, balance } = input;
  if (!isMember) return "not_member";
  if (!campaign) return "member_no_campaign";

  const today = input.today || new Date().toISOString().slice(0, 10);
  if (campaign.use_end_date && today > campaign.use_end_date) return "use_period_over";

  if (invoice.collection_method === "driver_direct") return "direct_collection";
  if (invoice.locked || invoice.customer_side_locked) return "invoice_locked";
  if (invoice.payment_received) return "payment_received";

  // 🚨 **확정 묶음은 금액이 굳었다** — `customer_charge_total` 을 바꿔도 묶음 항목의
  //    `supply_amount_snapshot` 은 안 따라오고, 그것이 화주에게 나가는 금액이다.
  //    🟢 **draft 묶음은 막지 않는다** — 서버가 할인 뒤 `refresh_item_snapshot` 을
  //       불러 그 항목을 다시 맞춘다(저장소 밖 함수를 **고치지 않고 조합해 쓴다**).
  if (batchStatus && batchStatus !== "draft") return "in_confirmed_batch";

  const gross = grossCharge(invoice);
  if (!gross || gross <= 0) return "no_charge";

  if (balance <= 0) return "no_balance";
  if (balance < (campaign.minimum_use_amount || 0)) return "below_minimum";
  return null;
}

// ── 금액 ────────────────────────────────────────────────────────────────────

/**
 * **깎기 전 공급가액.** 🔴 `customer_charge_total` 은 이미 깎인 값이므로 할인액을
 * 도로 더해야 한다 — 이 한 줄을 빠뜨리면 할인을 고칠 때마다 **금액이 계속 줄어든다.**
 */
export function grossCharge(invoice: {
  customer_charge_total?: number | null;
  reward_discount_amount?: number | null;
}): number {
  return Math.round(invoice.customer_charge_total || 0) + Math.round(invoice.reward_discount_amount || 0);
}

/**
 * 이 건에 걸 수 있는 **최대 할인액**.
 *
 * 🔴 **깎은 뒤 금액이 0 보다 커야 한다** — 0 이하가 되면 월정산 묶음이 그 건을
 *    후보에서 빼 버린다(`is_billing_batch_candidate` 가 `customer_charge_total > 0`
 *    을 본다 · ㊲-e 실측). 그래서 **1원은 남긴다.**
 * 🔴 **이미 걸어 둔 할인은 「쓸 수 있는 돈」에 도로 포함된다** — 잔액은 그만큼 이미
 *    줄어 있으므로, 안 더하면 금액을 **올릴 수가 없다.**
 */
export function maxUsableAmount(input: {
  balance: number;
  invoice: { customer_charge_total?: number | null; reward_discount_amount?: number | null };
}): number {
  const current = Math.round(input.invoice.reward_discount_amount || 0);
  const available = Math.round(input.balance || 0) + current;
  const gross = grossCharge(input.invoice);
  return Math.max(0, Math.min(available, gross - 1));
}

export type RewardUseAmountError =
  | "not_integer"
  | "negative"
  | "over_max"
  | "same_as_now"
  | "below_minimum";

export const REWARD_USE_AMOUNT_LABEL: Record<RewardUseAmountError, string> = {
  not_integer: "금액을 숫자로 입력해 주세요.",
  negative: "0원 이상으로 입력해 주세요(0원은 할인 해제입니다).",
  over_max: "쓸 수 있는 적립금과 청구 금액을 넘을 수 없습니다.",
  same_as_now: "지금 걸려 있는 금액과 같습니다.",
  below_minimum: "최소 사용액에 못 미칩니다.",
};

/**
 * 담당자가 넣은 금액을 검사한다. 통과하면 `null`.
 *
 * 🔴 **0 은 「할인 해제」라 허용한다** — 최소 사용액 검사에서도 빼 준다(해제까지
 *    막으면 잘못 건 할인을 영영 못 되돌린다).
 */
export function rewardUseAmountError(input: {
  amount: number;
  current: number;
  max: number;
  minimumUseAmount: number;
}): RewardUseAmountError | null {
  const { amount, current, max, minimumUseAmount } = input;
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) return "not_integer";
  if (amount < 0) return "negative";
  if (amount === current) return "same_as_now";
  if (amount > max) return "over_max";
  if (amount > 0 && amount < (minimumUseAmount || 0)) return "below_minimum";
  return null;
}

/**
 * 원장에 넣을 줄을 만든다 — **처음이면 `freight_discount`, 고칠 때는 `adjustment`.**
 *
 * 🔴 **차액만 넣는다.** 전액을 다시 넣으면 잔액이 두 번 깎인다.
 * 🔴 **`adjustment` 는 `source_type='manual'`** 이라 부분 UNIQUE 에서 빠진다 —
 *    그래서 금액을 몇 번이고 고칠 수 있다. `freight_discount` 는 반대로 UNIQUE 에
 *    걸려 **한 정산 건에 한 줄**이고, 그것이 중복 사용의 최종 방어선이다.
 */
export function buildRewardUseLedgerRow(input: {
  companyId: string;
  campaignId: string;
  invoiceId: string;
  /** 지금 걸려 있는 할인액 */
  current: number;
  /** 바꾼 뒤 할인액 */
  next: number;
  reason: string;
  customerNote?: string | null;
  staffId?: string | null;
}): Record<string, any> | null {
  const delta = Math.round(input.next) - Math.round(input.current);
  if (delta === 0) return null;

  const first = Math.round(input.current) === 0;
  if (first) {
    return {
      company_id: input.companyId,
      campaign_id: input.campaignId,
      transaction_type: REWARD_USE_TYPE,
      amount: -Math.round(input.next),
      source_type: "invoice",
      source_id: input.invoiceId,
      description: input.reason,
      customer_note: input.customerNote ?? null,
      created_by: input.staffId ?? null,
    };
  }
  return {
    company_id: input.companyId,
    campaign_id: input.campaignId,
    transaction_type: "adjustment",
    // 할인이 늘면 잔액은 줄고(−), 줄면 잔액이 돌아온다(+).
    amount: -delta,
    source_type: "manual",
    source_id: null,
    description: input.reason,
    customer_note: input.customerNote ?? null,
    created_by: input.staffId ?? null,
  };
}
