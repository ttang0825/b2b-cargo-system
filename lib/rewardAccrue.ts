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
import { notifyRewardEarned } from "./rewardNotify";
import { fetchIncludedExtraChargeTotals } from "./rewardExtraCharges";
import {
  rewardBaseAmount,
  rewardEarnAmount,
  rewardIneligibleReason,
  rewardNotReceivedReason,
  rewardReceiptConfirmed,
} from "./rewardCalc";

export type RewardAccrueInput = {
  admin: any;
  staffId: string;
  /** `invoice` 하나 · `billing_batch` 면 그 묶음 안의 **운송건별**로 적립한다 */
  sourceType: "invoice" | "billing_batch";
  sourceId: string;
  /** 🚨 입금확인 **해제** — 원본 적립을 지우지 않고 `reversal` 한 줄을 넣는다 */
  reverse?: boolean;
  /**
   * 적립 안내 문자를 보낼 것인가 — 🔴 **기본값은 「안 보냄」이다.**
   *
   * 🔴 **소급 적립(`/api/admin/reward/backfill`)에서는 켜지 말 것** — 그 버튼은 한 번에
   *    최대 100건을 적립하므로, 켜면 담당자가 버튼 한 번에 **몇 달 치 문자를 한꺼번에**
   *    보낸다. 켜는 곳은 **입금이 방금 확인된 경로 둘**뿐이다
   *    (`invoices/save` · `billing-batches/mark-payment-received`).
   * 🔴 **회수(`reverse`)에서는 안 나간다** — 「적립이 취소됐습니다」를 문자로 알리는 것은
   *    사용자가 정한 적이 없다(담당자가 말할 일이다).
   */
  notify?: boolean;
};

export type RewardAccrueOutcome = {
  invoice_id: string;
  status: "accrued" | "reversed" | "skipped" | "already" | "error";
  amount?: number;
  /** 🔴 적립 안내 문자의 `sms_logs.related_id` 가 된다 — 이력에서 되짚는 열쇠다 */
  ledger_id?: string;
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

  // ── 적립 안내 문자 (2차, 2026-09-21) ─────────────────────────────────────
  //
  // 🔴 **여기서 한 번만 부른다**(원칙 53번) — 적립이 나는 경로가 셋이라 라우트마다
  //    적으면 한쪽만 문자가 나간다.
  // 🔴 **회사별로 한 통이다** — 묶음은 한 화주의 건들이지만 구조상 섞일 수 있어
  //    `company_id` 로 묶는다. 건별로 보내면 13건짜리 묶음에 **문자가 13통** 나간다.
  // 🔴 **`already`(이미 적립됨)는 세지 않는다** — 두 번째 클릭에 문자가 또 나간다.
  // ⚠️ 문자 시간이 `REWARD_ACCRUE_TIMEOUT_MS`(3초) 안에 같이 든다 — 상한을 넘기면
  //    **적립은 남고 문자만 빠진다.** 그 순서가 맞다(입금확인이 본업이다).
  if (input.notify === true && reverse !== true) {
    const byCompany = new Map<string, { amount: number; ledgerId: string }>();
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "accrued" || !r.amount || !r.ledger_id) continue;
      const companyId = rows.find((x) => x.id === r.invoice_id)?.company_id;
      if (!companyId) continue;
      const prev = byCompany.get(companyId);
      byCompany.set(companyId, {
        amount: (prev?.amount || 0) + r.amount,
        ledgerId: prev?.ledgerId || r.ledger_id,
      });
    }
    for (const [companyId, v] of byCompany) {
      await notifyRewardEarned({
        admin,
        campaignId: campaign.id,
        companyId,
        amount: v.amount,
        ledgerId: v.ledgerId,
      });
    }
  }

  return { results };
}

/** 🔴 정산 건 하나를 적립하는 데 필요한 컬럼 — 화면이 아니라 여기서 다시 읽는다 */
const INVOICE_SELECT =
  "id,order_id,company_id,customer_charge_total,customer_charge_vat_included," +
  // 🔴 `brokerage_fee_paid` 는 **선착불의 입금 사건**이다(2026-09-21) — 빼면
  //    선착불 건이 영영 적립되지 않는다(`rewardReceiptConfirmed`).
  "collection_method,payment_received,brokerage_fee_paid,created_at,orders(order_no)";

type InvoiceRow = {
  id: string;
  order_id: string | null;
  company_id: string | null;
  customer_charge_total: number | null;
  customer_charge_vat_included: boolean | null;
  collection_method: string | null;
  payment_received: boolean | null;
  /** 🔴 선착불(`driver_direct`)의 입금 사건 — 차주가 주선수수료를 냈는가 */
  brokerage_fee_paid: boolean | null;
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
      // 🔴 **말을 수금방식에 맞춘다** — 원장은 지워지지 않는 기록이고, 선착불 건에
      //    「입금확인 해제」라고 적히면 나중에 누구도 무엇이 풀린 것인지 못 읽는다.
      description: `${
        inv.collection_method === "driver_direct" ? "주선수수료 입금 해제" : "입금확인 해제"
      } — ${invoiceLabel(inv)}`,
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
  // 🚨 **수금방식마다 보는 칸이 다르다**(2026-09-21 — 선착불 포함 확정).
  //    broker 는 `payment_received`, 선착불은 `brokerage_fee_paid` 다.
  if (!rewardReceiptConfirmed(receiptInput(inv))) {
    return {
      invoice_id: inv.id,
      status: "skipped",
      reason: rewardNotReceivedReason(inv.collection_method),
    };
  }

  // 멤버십 — 🔴 켜져 있고, 시작일 이후인가
  //
  // 🔴 **화주가 없으면 질의 자체를 건너뛴다.** 게스트(비회원) 오더의 정산 건은
  //    `company_id` 가 `null` 이고(그 컬럼은 nullable 이다 — §7), 그대로
  //    `.eq("company_id", null)` 을 보내면 PostgREST 가 uuid 파싱 오류를 낸다.
  //    그러면 「대상 아님 — 화주가 연결되지 않은 건」이어야 할 것이 **「적립 실패」
  //    빨간 줄**로 정산 상세에 뜬다. 🔴 이 분기를 지우지 말 것.
  // ⚠️ **사유는 여기서 정하지 않는다** — `evaluateReward` 가 판정한다.
  //    ⚠️ 2026-09-21 에 선착불 제외가 없어져서, 게스트 건의 사유는 수금방식과
  //       무관하게 `no_company` 다.
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

  // 🔴 `.select("id")` 는 **문자 이력의 열쇠를 얻기 위한 것이다**(2026-09-21) —
  //    빼면 적립 문자의 `related_id` 를 채울 수 없어 이력에서 원장 줄로 못 돌아간다.
  const { data: inserted, error } = await admin.from("reward_ledger").insert({
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
  }).select("id").maybeSingle();
  if (error) {
    // 🚨 이미 적립됐다 — 오류가 아니다.
    if (isDuplicate(error)) return { invoice_id: inv.id, status: "already", reason: "already_accrued" };
    return { invoice_id: inv.id, status: "error", message: error.message };
  }
  return { invoice_id: inv.id, status: "accrued", amount, ledger_id: (inserted as any)?.id };
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
// ⚠️ **입금 확인만이 둘을 가른다** — `evaluateReward` 가 입금 칸을 보지 않는
//    이유다(그 조건은 부르는 쪽이 `rewardReceiptConfirmed` 로 판단한다).
//    🔴 그 칸은 수금방식마다 다르다 — broker 는 `payment_received`,
//    선착불은 `brokerage_fee_paid`.

/**
 * 🔴 **판별자가 문자열인 것은 의도다** — 이 저장소는 `strict: false` 라
 *    참/거짓 판별자로는 타입이 좁혀지지 않는다(32차·37차가 같은 자리에서
 *    `tsc` 에 걸렸고 이번에도 걸렸다). boolean 으로 되돌리지 말 것.
 */
/** `InvoiceRow` → `rewardReceiptConfirmed` 입력 (칸 이름을 한 곳에서만 옮긴다) */
function receiptInput(inv: InvoiceRow) {
  return {
    collectionMethod: inv.collection_method,
    paymentReceived: inv.payment_received,
    brokerageFeePaid: inv.brokerage_fee_paid,
  };
}

/**
 * 🚨 **정산 건의 기준일은 KST 로 읽는다** (2026-09-21 사용자 확정).
 *
 * 🔴 **`created_at.slice(0, 10)` 로 되돌리지 말 것.** 그것은 ISO 문자열이라
 *    **UTC 날짜**이고, Vercel 함수도 UTC 라 `getDate()` 도 마찬가지다.
 *    KST 00:00~08:59 에 만들어진 정산 건은 **하루 앞 날짜**로 읽혀서,
 *    담당자 눈에는 캠페인 안인데 코드는 「기간 밖」으로 판정한다
 *    (운영에 실재하는 어긋남이다 — `_verify.sql` ㉝ 의 「🚨 날짜갈림」).
 * 🔴 **`Intl` 에 `timeZone: "Asia/Seoul"` 을 주는 이 방식을 되돌리지 말 것** —
 *    PR #176 이 문자 날짜에서 같은 버그를 고친 그 방법이다.
 * ⚠️ 캠페인·적용 시작일은 `date` 라 애초에 시간대가 없다 — 맞춰야 하는 것은
 *    **담당자가 화면에서 보는 날짜**이고 그것이 KST 다.
 */
export function rewardRefDate(createdAt: string | null | undefined): string {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  const y = get("year"), m = get("month"), day = get("day");
  return y && m && day ? `${y}-${m}-${day}` : "";
}

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
    // 🚨 **빼지 말 것** — 없으면 선착불 건이 저장된 「포함」 구분으로 갈려서
    //    적립이 조용히 1/1.1 로 줄어든다(2026-09-21 확정 · `rewardBaseAmount` 머리말).
    collectionMethod: inv.collection_method,
  });

  const ineligible = rewardIneligibleReason({
    collectionMethod: inv.collection_method,
    companyId: inv.company_id,
    baseAmount: base,
  });
  if (ineligible) return { status: "skipped", base, reason: ineligible };

  if (!membership || !membership.enabled) return { status: "skipped", base, reason: "not_member" };

  // 🔴 기준일은 **정산 건의 기준일**이다(생성일). 오늘로 재면 캠페인이 끝난 뒤에
  //    뒤늦게 입금확인한 옛 건이 통째로 빠진다.
  // 🔴 **KST 로 읽는다** — 위 `rewardRefDate` 주석 참고.
  const refDate = rewardRefDate(inv.created_at);
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
  /**
   * 🔴 선착불인가 — 화면이 **무엇을 기다리는지**를 맞게 적으려면 필요하다
   * (broker 는 「입금 확인」, 선착불은 「주선수수료 입금」).
   */
  is_direct?: boolean;
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
    // 🔴 **「미입금」을 DB 조건으로 쓰지 않는다**(2026-09-21) — 보는 칸이 수금방식마다
    //    달라서(`payment_received` / `brokerage_fee_paid`) 한 줄짜리 필터로 쓰면
    //    **broker 는 입금됐는데 수수료 칸이 비어 있는 건**까지 끌려온다.
    //    거르는 일은 아래에서 `rewardReceiptConfirmed` 한 곳이 한다.
    // ⚠️ 캠페인 밖은 여기서 **느슨하게** 잘라 둔다(정확한 판정은 `evaluateReward`).
    //    날짜 비교는 UTC 경계라 KST 로 하루 걸치는 건이 빠지지 않게 **앞뒤로 하루씩**
    //    넉넉히 잡는다 — 좁히면 9시간 차이로 대상이 조용히 빠진다.
    q = q
      .gte("created_at", `${campaign.start_date}T00:00:00Z`)
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
  // 🔴 **이미 입금된 건은 「예상」이 아니다** — 그것은 원장이 답한다.
  //    한 건만 묻는 경우(`invoiceId`)는 거르지 않는다: 정산 상세가 입금 전에도
  //    **얼마가 쌓일지** 미리 보여주는 자리이고, 입금 뒤에는 화면이 원장을 먼저 쓴다.
  if (!invoiceId) rows = rows.filter((r) => !rewardReceiptConfirmed(receiptInput(r)));
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
        is_direct: inv.collection_method === "driver_direct",
        ...(verdict.status === "eligible" ? {} : { reason: verdict.reason }),
      };
    }),
  };
}

// ── 소급 적립 (이미 입금이 확인된 건) ──────────────────────────────────────
//
// 🚨 **왜 필요한가** — 적립은 「입금 체크가 **바뀌는 순간**」에만 난다. 그래서
//    ① 리워드를 켜기 **전에** 이미 입금 처리된 건
//    ② 캠페인 시작일을 **뒤로 옮겨서**(2026-09-21 · 9/1 → 8/7) 새로 범위에 든 건
//    ③ 멤버십을 나중에 켠 화주의 지난 건
//    은 관문을 전부 통과하는데도 **원장이 영영 비어 있다**. 실제로 그 상태였고
//    (`_verify.sql` ㉝ — 관문 일곱이 전부 t 인데 적립행수 0), 그것이 「이준배 건이
//    적립되지 않는다」의 마지막 원인이었다.
//
// 🔴 **자동으로 돌지 않는다.** 관리자가 화면에서 눌러야 돈다 — 돈이 걸린 경로를
//    화면 진입이나 배포가 마음대로 일으키게 두지 않는다.
// 🔴 **여기서 원장에 직접 쓰지 않는다.** 후보만 찾고, 넣는 일은 `accrueReward` 가
//    한다(관문 판정이 두 벌이 되면 소급분만 다른 기준으로 쌓인다).
// 🚨 **중복은 UNIQUE 가 막는다** — 이 목록이 낡아도(그 사이 입금 트리거가 먼저
//    돌아도) `already` 로 조용히 넘어간다. 🔴 목록 조회로만 막지 말 것.

/** 🔴 한 번에 처리하는 상한 — 서버리스 함수가 얼어붙기 전에 끝나야 한다 */
export const REWARD_BACKFILL_LIMIT = 100;

export type RewardBackfillCandidate = {
  invoice_id: string;
  company_id: string | null;
  label: string;
  created_at: string;
  amount: number;
  is_direct: boolean;
};

/**
 * 관문을 전부 통과하고 **입금까지 확인됐는데 원장에 없는** 정산 건.
 *
 * 🔴 판정·금액은 `evaluateReward` 하나가 한다(예상 적립·실제 적립과 같은 함수).
 */
export async function findUnaccruedPaid(opts: {
  admin: any;
  campaign: RewardCampaign;
  companyId?: string | null;
}): Promise<{ rows: RewardBackfillCandidate[]; truncated: boolean; error?: string }> {
  const { admin, campaign, companyId } = opts;

  // ⚠️ 캠페인 밖은 느슨하게 잘라 둔다(정확한 판정은 `evaluateReward`) — KST 로
  //    하루 걸치는 건이 빠지지 않게 앞뒤로 넉넉히 잡는다(`previewRewards` 와 같다).
  let q = admin
    .from("invoices")
    .select(INVOICE_SELECT)
    .gte("created_at", `${campaign.start_date}T00:00:00Z`)
    .lte("created_at", `${campaign.earn_end_date}T23:59:59.999Z`)
    .order("created_at", { ascending: false })
    .limit(PREVIEW_LIMIT + 1);
  if (companyId) q = q.eq("company_id", companyId);

  const { data, error } = await q;
  if (error) return { rows: [], truncated: false, error: error.message };

  let rows = (data || []) as unknown as InvoiceRow[];
  const scanTruncated = rows.length > PREVIEW_LIMIT;
  if (scanTruncated) rows = rows.slice(0, PREVIEW_LIMIT);
  // 🔴 **입금이 확인된 것만**이다 — 미입금 건은 「예상 적립」이 맡는다.
  rows = rows.filter((r) => rewardReceiptConfirmed(receiptInput(r)));
  if (rows.length === 0) return { rows: [], truncated: false };

  // 이미 쌓인 것 빼기 — 🔴 건마다 묻지 말 것(한 번에 읽어 집합으로 본다)
  const { data: ledger, error: lErr } = await admin
    .from("reward_ledger")
    .select("source_id")
    .eq("campaign_id", campaign.id)
    .eq("transaction_type", "transport_earn")
    .eq("source_type", "invoice")
    .in(
      "source_id",
      rows.map((r) => r.id)
    );
  if (lErr) return { rows: [], truncated: false, error: lErr.message };
  const accrued = new Set((ledger || []).map((r: any) => r.source_id));
  rows = rows.filter((r) => !accrued.has(r.id));
  if (rows.length === 0) return { rows: [], truncated: false };

  const { data: memberships, error: mErr } = await admin
    .from("reward_memberships")
    .select("company_id,enabled,started_at,ended_at")
    .eq("campaign_id", campaign.id);
  if (mErr) return { rows: [], truncated: false, error: mErr.message };
  const byCompany: Record<string, RewardMembershipLite> = {};
  for (const m of (memberships || []) as any[]) byCompany[m.company_id] = m;

  // 🔴 현장 추가비를 못 읽으면 **아무것도 내놓지 않는다** — 0 으로 때우면 적립액이
  //    실제보다 크고, 그것이 그대로 원장에 굳는다(예상과 달리 되돌리기 어렵다).
  let extraByInvoice: Record<string, number> = {};
  try {
    extraByInvoice = await fetchIncludedExtraChargeTotals(admin, rows);
  } catch (e: any) {
    return { rows: [], truncated: false, error: e?.message || "현장 추가비를 읽지 못했습니다" };
  }

  const out: RewardBackfillCandidate[] = [];
  for (const inv of rows) {
    const verdict = evaluateReward(
      campaign,
      inv,
      extraByInvoice[inv.id] || 0,
      inv.company_id ? byCompany[inv.company_id] : null
    );
    // 🔴 대상이 아닌 건은 **아예 담지 않는다** — 「소급 12건」이라 적어 놓고 실제로는
    //    2건만 쌓이면 담당자가 그 차이를 적립 누락으로 읽는다.
    if (verdict.status !== "eligible") continue;
    out.push({
      invoice_id: inv.id,
      company_id: inv.company_id,
      label: invoiceLabel(inv),
      created_at: inv.created_at,
      amount: verdict.amount,
      is_direct: inv.collection_method === "driver_direct",
    });
  }

  // 🔴 상한을 넘으면 **앞에서 자르고 알린다** — 조용히 일부만 하면 담당자가
  //    「다 했다」로 믿는다(다시 누르면 이어서 된다).
  const truncated = scanTruncated || out.length > REWARD_BACKFILL_LIMIT;
  return { rows: out.slice(0, REWARD_BACKFILL_LIMIT), truncated };
}
