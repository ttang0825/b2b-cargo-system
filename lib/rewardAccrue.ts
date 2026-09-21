// 기업고객 리워드 — 적립·회수의 **유일한 정의처** (C장, 2026-09-20 · 서버 전용)
//
// 🔴 **부르는 곳이 셋이다** — 화면에 두면 한쪽만 고쳐진다(원칙 53번과 같은 결):
//
//     app/api/admin/invoices/save/route.ts            건별 입금확인 (양방향)
//     app/api/admin/billing-batches/mark-payment-received/route.ts   월정산 묶음
//     app/api/admin/reward/accrue/route.ts            수동·그 밖의 경로(24시콜 ⓒ 등)
//
// 🔴 **서버 안에서는 `await` 한다**(3초 상한 · 던지지 않음). 지시서는 「브라우저가
//    부르니 `await` 하지 말라」고 했는데, 실측해 보니 입금확인이 **이미 서버 라우트를
//    거친다**(`/api/admin/invoices/save` 화이트리스트에 `payment_received` 가 있다).
//    서버리스 함수는 응답을 돌려준 뒤 **얼어붙기** 때문에 fire-and-forget 으로 두면
//    **적립이 아예 안 나간다**(38차가 웹 푸시에서 겪은 그 자리).
//    ⚠️ 반대로 **브라우저에서 부를 때는 `await` 하지 말 것** — 담당자의 저장이 멈춘다.
//
// 🔴 **적립 실패가 입금확인을 막으면 안 된다** — 입금확인이 본업이고 적립은 곁다리다.
//    이 함수는 **절대 던지지 않고** 무엇이 왜 안 됐는지를 `results` 로 돌려준다
//    (정산 상세가 그것을 그대로 보여준다 — 담당자가 알 길이 그것뿐이다).
//
// ── 🚨 중복 적립 방지는 DB UNIQUE 가 최종 방어선이다 ────────────────────────
//
//   `reward_ledger_source_unique` (campaign_id, transaction_type, source_type, source_id)
//   위반(`23505`)은 **오류가 아니라 「이미 적립됨」**이므로 조용히 성공으로 넘긴다.
//   🔴 **여기서만 막지 말 것** — 두 탭·두 번 클릭·재시도가 전부 새어 나간다.
//   ⚠️ dev 는 StrictMode 라 effect 가 두 번 돈다(함정 34번) — 그래도 **원장은 한 줄**이다.
//      🔴 「적립이 한 번만」을 잴 때는 **호출 횟수가 아니라 원장 행 수로** 재라.

import { loadActiveCampaign, type RewardCampaign } from "./rewardServer";
import { fetchIncludedExtraChargeTotals } from "./rewardExtraCharges";
import {
  rewardBaseAmount,
  rewardEarnAmount,
  rewardIneligibleReason,
} from "./rewardCalc";

export type RewardAccrueInput = {
  admin: any;
  staffId: string;
  /** `invoice` 하나 · `billing_batch` 면 그 묶음 안의 **운송건별**로 적립한다 */
  sourceType: "invoice" | "billing_batch";
  sourceId: string;
  /** 🚨 입금확인 **해제** — 원본 적립을 지우지 않고 `reversal` 한 줄을 넣는다 */
  reverse?: boolean;
};

export type RewardAccrueOutcome = {
  invoice_id: string;
  status: "accrued" | "reversed" | "skipped" | "already" | "error";
  amount?: number;
  reason?: string;
  message?: string;
};

/** 🔴 서버 안에서 부를 때의 상한 — 적립이 느려도 입금확인이 멈추면 안 된다 */
export const REWARD_ACCRUE_TIMEOUT_MS = 3000;

/**
 * 🔴 **절대 던지지 않는다.** 실패는 `results` 안의 `status: "error"` 로 돌아온다.
 * 🔴 **상한 안에 못 끝나면 그냥 넘어간다** — 입금확인이 본업이다.
 */
export async function accrueRewardSafely(
  input: RewardAccrueInput
): Promise<{ results: RewardAccrueOutcome[]; timedOut?: boolean; error?: string }> {
  try {
    const raced = await Promise.race([
      accrueReward(input),
      new Promise<"timeout">((r) => setTimeout(() => r("timeout"), REWARD_ACCRUE_TIMEOUT_MS)),
    ]);
    if (raced === "timeout") return { results: [], timedOut: true };
    return raced;
  } catch (e: any) {
    return { results: [], error: e?.message || String(e) };
  }
}

export async function accrueReward(
  input: RewardAccrueInput
): Promise<{ results: RewardAccrueOutcome[]; error?: string }> {
  const { admin, staffId, sourceType, sourceId, reverse } = input;

  const { campaign, error: campaignError } = await loadActiveCampaign(admin);
  if (campaignError) return { results: [], error: campaignError };
  if (!campaign) return { results: [] };

  // ── 대상 정산 건 모으기 ─────────────────────────────────────────────────
  let invoiceIds: string[] = [];
  if (sourceType === "invoice") {
    invoiceIds = [sourceId];
  } else {
    // 🔴 **묶음도 원장은 운송건별이다**(전달문서 §17) — 묶음 한 줄로 남기지 말 것.
    //    🔴 조건(`released_at is null`)은 DB 함수 `mark_billing_batch_payment_received`
    //       가 invoice 를 갱신할 때 쓰는 것과 **같아야 한다**(함수 본문 실측 2026-09-20) —
    //       다르면 갱신된 건과 적립된 건이 갈린다.
    const { data, error } = await admin
      .from("customer_billing_batch_items")
      .select("invoice_id")
      .eq("batch_id", sourceId)
      .is("released_at", null);
    if (error) return { results: [], error: error.message };
    invoiceIds = (data || []).map((r: any) => r.invoice_id).filter(Boolean);
  }
  if (invoiceIds.length === 0) return { results: [] };

  const { data: invoices, error: invError } = await admin
    .from("invoices")
    .select(INVOICE_SELECT)
    .in("id", invoiceIds);
  if (invError) return { results: [], error: invError.message };

  const rows = (invoices || []) as unknown as InvoiceRow[];

  let extraByInvoice: Record<string, number> = {};
  try {
    extraByInvoice = await fetchIncludedExtraChargeTotals(admin, rows);
  } catch (e: any) {
    // 🔴 현장 추가비를 못 읽으면 **적립을 하지 않는다** — 0 으로 때우면 적립이 커지고,
    //    청구액 전체를 빼면 0 이 된다. 둘 다 조용히 틀린 값이다.
    return {
      results: rows.map((r) => ({
        invoice_id: r.id,
        status: "error" as const,
        message: e?.message || "현장 추가비를 읽지 못했습니다",
      })),
    };
  }

  const results: RewardAccrueOutcome[] = [];
  for (const inv of rows) {
    results.push(
      await handleOne(
        admin, campaign, inv, extraByInvoice[inv.id] || 0,
        reverse === true, staffId, sourceType, sourceId
      )
    );
  }
  return { results };
}

/** 🔴 정산 건 하나를 적립하는 데 필요한 컬럼 — 화면이 아니라 여기서 다시 읽는다 */
const INVOICE_SELECT =
  "id,order_id,company_id,customer_charge_total,customer_charge_vat_included," +
  "collection_method,payment_received,created_at,orders(order_no)";

type InvoiceRow = {
  id: string;
  order_id: string | null;
  company_id: string | null;
  customer_charge_total: number | null;
  customer_charge_vat_included: boolean | null;
  collection_method: string | null;
  payment_received: boolean | null;
  created_at: string;
  orders?: { order_no?: string | null } | null;
};



async function handleOne(
  admin: any,
  campaign: RewardCampaign,
  inv: InvoiceRow,
  includedExtra: number,
  reverse: boolean,
  staffId: string,
  sourceType: string,
  sourceId: string
): Promise<RewardAccrueOutcome> {
  // ── 회수 ────────────────────────────────────────────────────────────────
  if (reverse) {
    // 🔴 원본 적립행이 없으면 회수할 것도 없다 — **빈 회수를 만들지 말 것.**
    const { data: earned, error: eErr } = await admin
      .from("reward_ledger")
      .select("id,amount")
      .eq("campaign_id", campaign.id)
      .eq("transaction_type", "transport_earn")
      .eq("source_type", "invoice")
      .eq("source_id", inv.id)
      .limit(1);
    if (eErr) return { invoice_id: inv.id, status: "error", message: eErr.message };
    const origin = (earned || [])[0];
    if (!origin) return { invoice_id: inv.id, status: "skipped", reason: "no_accrual" };

    const { error } = await admin.from("reward_ledger").insert({
      company_id: inv.company_id,
      campaign_id: campaign.id,
      transaction_type: "reversal",
      amount: -Math.abs(Math.round(origin.amount || 0)),
      source_type: "invoice",
      source_id: inv.id,
      description: `입금확인 해제 — ${invoiceLabel(inv)}`,
      created_by: staffId,
    });
    // 🚨 이미 회수됐으면 오류가 아니다(UNIQUE 가 `transaction_type` 을 포함하는 이유).
    if (error) {
      if (isDuplicate(error)) return { invoice_id: inv.id, status: "already", reason: "already_reversed" };
      return { invoice_id: inv.id, status: "error", message: error.message };
    }
    return { invoice_id: inv.id, status: "reversed", amount: -Math.abs(Math.round(origin.amount || 0)) };
  }

  // ── 적립 ────────────────────────────────────────────────────────────────
  // 🔴 입금이 확인되지 않은 건은 적립하지 않는다(확정값 ② — 운송완료가 아니다).
  //    ⚠️ 부르는 쪽이 저장 직후에 부르므로 여기서 **DB 를 다시 읽은 값**으로 본다
  //       (클라이언트가 보낸 상태를 믿지 않는다 — 원칙 53번과 같은 결).
  if (!inv.payment_received) return { invoice_id: inv.id, status: "skipped", reason: "not_received" };

  // 멤버십 — 🔴 켜져 있고, 시작일 이후인가
  //
  // 🔴 **화주가 없으면 질의 자체를 건너뛴다.** 게스트(비회원) 오더의 정산 건은
  //    `company_id` 가 `null` 이고(그 컬럼은 nullable 이다 — §7), 그대로
  //    `.eq("company_id", null)` 을 보내면 PostgREST 가 uuid 파싱 오류를 낸다.
  //    그러면 「대상 아님 — 화주가 연결되지 않은 건」이어야 할 것이 **「적립 실패」
  //    빨간 줄**로 정산 상세에 뜬다. 🔴 이 분기를 지우지 말 것.
  // ⚠️ **사유는 여기서 정하지 않는다** — `evaluateReward` 가 선착불을 먼저 보므로
  //    「선착불 + 게스트」 건은 예전처럼 `direct_collection` 으로 남는다.
  const { data: memberships, error: mErr } = inv.company_id
    ? await admin
        .from("reward_memberships")
        .select("enabled,started_at,ended_at")
        .eq("company_id", inv.company_id)
        .eq("campaign_id", campaign.id)
        .limit(1)
    : { data: [], error: null };
  if (mErr) return { invoice_id: inv.id, status: "error", message: mErr.message };

  // 🔴 판정·금액은 **`evaluateReward` 하나**가 한다 — 예상 적립(미입금 건)이 같은
  //    함수를 쓰므로, 여기에 조건을 따로 적으면 화면이 약속한 예상액과 실제로
  //    쌓이는 금액이 갈린다.
  const verdict = evaluateReward(campaign, inv, includedExtra, (memberships || [])[0]);
  if (verdict.status !== "eligible") return { invoice_id: inv.id, status: "skipped", reason: verdict.reason };
  const { base, amount } = verdict;

  const { error } = await admin.from("reward_ledger").insert({
    company_id: inv.company_id,
    campaign_id: campaign.id,
    transaction_type: "transport_earn",
    amount,
    earning_base_amount: base,
    // 🔴 그때의 요율 — 캠페인 요율이 바뀌어도 옛 이력이 맞아야 한다.
    earn_rate_snapshot: campaign.earn_rate,
    source_type: "invoice",
    source_id: inv.id,
    // 🔴 원본 번호를 **글자로** 남긴다 — 정산을 지워도 무엇이었는지 읽힌다
    //    (`source_id` 에 FK 가 없어 고아 id 가 그대로 남는다).
    description: `운송 적립 — ${invoiceLabel(inv)}${
      sourceType === "billing_batch" ? ` (월정산 묶음 ${sourceId.slice(0, 8)})` : ""
    }`,
    created_by: staffId,
  });
  if (error) {
    // 🚨 이미 적립됐다 — 오류가 아니다.
    if (isDuplicate(error)) return { invoice_id: inv.id, status: "already", reason: "already_accrued" };
    return { invoice_id: inv.id, status: "error", message: error.message };
  }
  return { invoice_id: inv.id, status: "accrued", amount };
}

function invoiceLabel(inv: InvoiceRow): string {
  const no = inv.orders?.order_no;
  return no ? `오더 ${no}` : `정산 ${inv.id.slice(0, 8)}`;
}

/** 🔴 `code` 만 보지 말 것 — 같은 23505 여도 다른 제약일 수 있다 */
function isDuplicate(error: { code?: string; message?: string }): boolean {
  return error?.code === "23505" && (error.message || "").includes("reward_ledger_source_unique");
}

// ── 예상 적립 (미입금 건) ───────────────────────────────────────────────────
//
// 🔴 **원장에는 한 줄도 쓰지 않는다.** 예상은 **표시 시점 계산**이고, 확정은 입금
//    확인이 일어나는 순간에만 만들어진다(원칙 47번과 같은 결 — 「예상」을 미리
//    원장에 넣어 두면 입금이 안 된 돈이 잔액에 섞인다).
//
// 🔴 **판정은 실제 적립과 같은 `evaluateReward` 를 쓴다** — 갈라 적으면 화면이
//    약속한 금액과 실제로 쌓이는 금액이 어긋난다(사용자가 그 숫자를 보고 영업한다).
//
// ⚠️ **입금 확인만이 둘을 가른다** — `evaluateReward` 가 `payment_received` 를
//    보지 않는 이유다(그 조건은 부르는 쪽이 판단한다).

/**
 * 🔴 **판별자가 문자열인 것은 의도다** — 이 저장소는 `strict: false` 라
 *    참/거짓 판별자로는 타입이 좁혀지지 않는다(32차·37차가 같은 자리에서
 *    `tsc` 에 걸렸고 이번에도 걸렸다). boolean 으로 되돌리지 말 것.
 */
export type RewardEvaluation =
  | { status: "eligible"; base: number; amount: number }
  | { status: "skipped"; base: number; reason: string };

export type RewardMembershipLite = {
  enabled?: boolean | null;
  started_at?: string | null;
  ended_at?: string | null;
};

/**
 * 적립 대상인가 · 얼마인가 — **유일한 판정처**.
 * 🔴 **`payment_received` 는 보지 않는다**(위 주석).
 */
export function evaluateReward(
  campaign: RewardCampaign,
  inv: InvoiceRow,
  includedExtra: number,
  membership: RewardMembershipLite | null | undefined
): RewardEvaluation {
  const base = rewardBaseAmount({
    customerChargeTotal: inv.customer_charge_total,
    customerChargeVatIncluded: inv.customer_charge_vat_included,
    includedExtraChargeTotal: includedExtra,
  });

  const ineligible = rewardIneligibleReason({
    collectionMethod: inv.collection_method,
    companyId: inv.company_id,
    baseAmount: base,
  });
  if (ineligible) return { status: "skipped", base, reason: ineligible };

  if (!membership || !membership.enabled) return { status: "skipped", base, reason: "not_member" };

  // 🔴 기준일은 **정산 건의 기준일**이다(`created_at` 의 날짜). 오늘로 재면
  //    캠페인이 끝난 뒤에 뒤늦게 입금확인한 옛 건이 통째로 빠진다.
  const refDate = (inv.created_at || "").slice(0, 10);
  if (refDate && (refDate < campaign.start_date || refDate > campaign.earn_end_date)) {
    return { status: "skipped", base, reason: "out_of_campaign" };
  }
  if (membership.started_at && refDate && refDate < membership.started_at) {
    return { status: "skipped", base, reason: "before_start" };
  }
  if (membership.ended_at && refDate && refDate > membership.ended_at) {
    return { status: "skipped", base, reason: "after_end" };
  }

  const amount = rewardEarnAmount(base, campaign.earn_rate);
  if (amount <= 0) return { status: "skipped", base, reason: "zero_amount" };
  return { status: "eligible", base, amount };
}

export type RewardPreviewRow = {
  invoice_id: string;
  company_id: string | null;
  label: string;
  created_at: string;
  /** 예상 적립액 — 대상이 아니면 0 */
  amount: number;
  /** 대상이 아닌 사유(있으면 `amount` 는 0) */
  reason?: string;
};

/**
 * 🔴 상한을 빼지 말 것 — 미입금 건이 쌓이면 이 조회가 목록 전체를 끌어온다.
 *    상한에 닿으면 `truncated` 로 알리고 화면이 「이상」으로 표시한다(조용히
 *    적게 보여 주면 담당자가 그 숫자를 합계로 믿는다).
 */
const PREVIEW_LIMIT = 500;

/**
 * 미입금 정산 건의 예상 적립을 낸다.
 *
 * - `invoiceId` — 그 한 건만(입금 여부와 무관하게 계산해서 돌려준다)
 * - `companyId` — 그 화주의 **미입금** 건 전부
 * - 둘 다 없으면 — **전체 화주의 미입금** 건
 */
export async function previewRewards(opts: {
  admin: any;
  campaign: RewardCampaign;
  invoiceId?: string | null;
  companyId?: string | null;
}): Promise<{ rows: RewardPreviewRow[]; truncated: boolean; error?: string }> {
  const { admin, campaign, invoiceId, companyId } = opts;

  let q = admin.from("invoices").select(INVOICE_SELECT);
  if (invoiceId) {
    q = q.eq("id", invoiceId);
  } else {
    // 🔴 **`is not true` 다**(`eq false` 가 아니다) — `payment_received` 가 `null`
    //    인 옛 행이 통째로 빠진다.
    q = q
      .not("payment_received", "is", true)
      // 캠페인 밖은 애초에 안 끌어온다 — 정확한 판정은 아래 `evaluateReward` 가 한다
      // (여기서 거른 것과 어긋나지 않게 **느슨한 쪽**으로만 자른다).
      .gte("created_at", campaign.start_date)
      .lte("created_at", `${campaign.earn_end_date}T23:59:59.999Z`)
      .order("created_at", { ascending: false })
      .limit(PREVIEW_LIMIT + 1);
    if (companyId) q = q.eq("company_id", companyId);
  }

  const { data, error } = await q;
  if (error) return { rows: [], truncated: false, error: error.message };

  let rows = (data || []) as unknown as InvoiceRow[];
  const truncated = !invoiceId && rows.length > PREVIEW_LIMIT;
  if (truncated) rows = rows.slice(0, PREVIEW_LIMIT);
  if (rows.length === 0) return { rows: [], truncated: false };

  // 멤버십 — 🔴 건마다 조회하지 말 것(미입금 건이 수백이면 질의도 수백이다)
  const { data: memberships, error: mErr } = await admin
    .from("reward_memberships")
    .select("company_id,enabled,started_at,ended_at")
    .eq("campaign_id", campaign.id);
  if (mErr) return { rows: [], truncated: false, error: mErr.message };
  const byCompany: Record<string, RewardMembershipLite> = {};
  for (const m of (memberships || []) as any[]) byCompany[m.company_id] = m;

  // 🔴 현장 추가비를 못 읽으면 **예상을 내지 않는다** — 0 으로 때우면 예상액이
  //    실제보다 크고, 담당자는 그 차이를 적립 누락으로 읽는다(실제 적립과 같은 판단).
  let extraByInvoice: Record<string, number> = {};
  try {
    extraByInvoice = await fetchIncludedExtraChargeTotals(admin, rows);
  } catch (e: any) {
    return { rows: [], truncated: false, error: e?.message || "현장 추가비를 읽지 못했습니다" };
  }

  return {
    truncated,
    rows: rows.map((inv) => {
      const verdict = evaluateReward(
        campaign, inv, extraByInvoice[inv.id] || 0,
        inv.company_id ? byCompany[inv.company_id] : null
      );
      return {
        invoice_id: inv.id,
        company_id: inv.company_id,
        label: invoiceLabel(inv),
        created_at: inv.created_at,
        amount: verdict.status === "eligible" ? verdict.amount : 0,
        ...(verdict.status === "eligible" ? {} : { reason: verdict.reason }),
      };
    }),
  };
}
