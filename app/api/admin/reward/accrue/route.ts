// POST /api/admin/reward/accrue — 🔴 적립·회수 (C장이 부른다)
//
//   { source_type: "invoice",       source_id: <invoice id>,  reverse?: boolean }
//   { source_type: "billing_batch", source_id: <batch id> }     ← 묶음 안의 건별로 적립
//
// ── 🚨 중복 적립 방지는 DB UNIQUE 가 최종 방어선이다 ────────────────────────
//
//   `reward_ledger_source_unique` (campaign_id, transaction_type, source_type, source_id)
//   위반(`23505`)은 **오류가 아니라 「이미 적립됨」**이므로 조용히 성공으로 넘긴다.
//   🔴 **화면·서버에서만 막지 말 것** — 두 탭·두 번 클릭·재시도가 전부 새어 나간다.
//   ⚠️ dev 는 StrictMode 라 effect 가 두 번 돈다(함정 34번) — 그래도 **원장은 한 줄**이다.
//      🔴 「적립이 한 번만」을 잴 때는 **호출 횟수가 아니라 원장 행 수로** 재라.
//
// ── 🔴 적립 기준 ──────────────────────────────────────────────────────────
//
//   ① 그 회사에 `enabled` 멤버십이 있는가
//   ② 캠페인 기간(`start_date` ~ `earn_end_date`) 안인가 · 멤버십 `started_at` 이후인가
//   ③ 선착불이 아닌가 (`lib/rewardCalc.ts` 의 `rewardIneligibleReason`)
//   ④ 공급가액(부가세·현장 추가비 제외) × 요율 · **1원 미만 절사**
//
// 🔴 **적립 실패가 입금확인을 막으면 안 된다** — 입금확인이 본업이고 적립은 곁다리다.
//    부르는 쪽이 실패를 삼키고, 여기서는 **왜 안 됐는지를 `reason` 으로 돌려준다**
//    (정산 상세가 그것을 그대로 보여준다 — 담당자가 알 길이 그것뿐이다).

import { NextResponse } from "next/server";
import { rewardGuard, loadActiveCampaign, type RewardCampaign } from "@/lib/rewardServer";
import { fetchIncludedExtraChargeTotals } from "@/lib/rewardExtraCharges";
import {
  rewardBaseAmount,
  rewardEarnAmount,
  rewardIneligibleReason,
} from "@/lib/rewardCalc";

export const dynamic = "force-dynamic";

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

type Outcome = {
  invoice_id: string;
  status: "accrued" | "reversed" | "skipped" | "already" | "error";
  amount?: number;
  reason?: string;
  message?: string;
};

export async function POST(req: Request) {
  const g = await rewardGuard();
  if (g.error) return g.error;
  const { staff, admin } = g;

  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const sourceType = body.source_type;
  const sourceId = typeof body.source_id === "string" ? body.source_id : "";
  const reverse = body.reverse === true;

  if (!sourceId || (sourceType !== "invoice" && sourceType !== "billing_batch")) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { campaign, error: campaignError } = await loadActiveCampaign(admin);
  if (campaignError) return NextResponse.json({ error: campaignError }, { status: 400 });
  if (!campaign) {
    return NextResponse.json({ ok: true, results: [], reason: "no_campaign" });
  }

  // ── 대상 정산 건 모으기 ─────────────────────────────────────────────────
  let invoiceIds: string[] = [];
  if (sourceType === "invoice") {
    invoiceIds = [sourceId];
  } else {
    // 🔴 **묶음도 원장은 운송건별이다**(전달문서 §17) — 묶음 한 줄로 남기지 말 것.
    //    🔴 조건(`released_at is null`)은 DB 함수 `mark_billing_batch_payment_received`
    //       가 invoice 를 갱신할 때 쓰는 것과 **같아야 한다** — 다르면 갱신된 건과
    //       적립된 건이 갈린다.
    const { data, error } = await admin
      .from("customer_billing_batch_items")
      .select("invoice_id")
      .eq("batch_id", sourceId)
      .is("released_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    invoiceIds = (data || []).map((r: any) => r.invoice_id).filter(Boolean);
  }
  if (invoiceIds.length === 0) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const { data: invoices, error: invError } = await admin
    .from("invoices")
    .select(INVOICE_SELECT)
    .in("id", invoiceIds);
  if (invError) return NextResponse.json({ error: invError.message }, { status: 400 });

  const rows = (invoices || []) as unknown as InvoiceRow[];
  const extraByInvoice = await fetchIncludedExtraChargeTotals(admin, rows);

  const results: Outcome[] = [];
  for (const inv of rows) {
    results.push(
      await handleOne(admin, campaign, inv, extraByInvoice[inv.id] || 0, reverse, staff.id, sourceType, sourceId)
    );
  }

  return NextResponse.json({ ok: true, results });
}

async function handleOne(
  admin: any,
  campaign: RewardCampaign,
  inv: InvoiceRow,
  includedExtra: number,
  reverse: boolean,
  staffId: string,
  sourceType: string,
  sourceId: string
): Promise<Outcome> {
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
  if (ineligible) return { invoice_id: inv.id, status: "skipped", reason: ineligible };

  // 멤버십 — 🔴 켜져 있고, 시작일 이후인가
  const { data: memberships, error: mErr } = await admin
    .from("reward_memberships")
    .select("enabled,started_at,ended_at")
    .eq("company_id", inv.company_id)
    .eq("campaign_id", campaign.id)
    .limit(1);
  if (mErr) return { invoice_id: inv.id, status: "error", message: mErr.message };
  const membership = (memberships || [])[0];
  if (!membership || !membership.enabled) {
    return { invoice_id: inv.id, status: "skipped", reason: "not_member" };
  }

  // 🔴 기준일은 **정산 건의 기준일**이다(`created_at` 의 날짜). 오늘로 재면
  //    캠페인이 끝난 뒤에 뒤늦게 입금확인한 옛 건이 통째로 빠진다.
  const refDate = (inv.created_at || "").slice(0, 10);
  if (refDate && (refDate < campaign.start_date || refDate > campaign.earn_end_date)) {
    return { invoice_id: inv.id, status: "skipped", reason: "out_of_campaign" };
  }
  if (membership.started_at && refDate && refDate < membership.started_at) {
    return { invoice_id: inv.id, status: "skipped", reason: "before_start" };
  }
  if (membership.ended_at && refDate && refDate > membership.ended_at) {
    return { invoice_id: inv.id, status: "skipped", reason: "after_end" };
  }

  const amount = rewardEarnAmount(base, campaign.earn_rate);
  if (amount <= 0) return { invoice_id: inv.id, status: "skipped", reason: "zero_amount" };

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
