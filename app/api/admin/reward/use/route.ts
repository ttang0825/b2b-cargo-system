// GET/POST /api/admin/reward/use — **운임 할인 적용** (2026-09-22)
//
// 사용자 요청: *"운임 할인 적용도 만들어줘."*
//
// 🔴 **관문·금액 판정은 `lib/rewardUse.ts` 하나다** — 이 라우트에 다시 적지 말 것
//    (두 벌이 되면 「화면엔 걸 수 있다는데 서버가 막는」 상태가 난다 · 원칙 51번).
//
// 🔴 **화면이 보낸 값을 믿지 않는다**(원칙 30·53번) — 정산 건·멤버십·잔액·묶음을
//    **서버가 다시 조회**해서 관문을 통과시킨다. 화면이 보내는 것은 정산 건 id ·
//    바꿀 금액 · 사유뿐이다.
//
// 🔴 **금액을 바꾸는 일이라 관리자 전용이고 사유가 필수다** — 35차 A-7(재동기화)과
//    같은 자세이고, 전/후를 `invoice_amendment_logs` 에 남기는 것도 같다.
//
// 🚨 **`customer_charge_total` 자체를 깎는다**(사유는 `lib/rewardUse.ts` 머리말).
//    그래서 금액을 읽는 여덟 자리와 월정산 묶음 DB 함수 둘이 **저절로 맞는다.**
//    🔴 **`resync` 라우트가 그 값을 다시 쓰므로 거기서 할인을 도로 빼야 한다** —
//       같은 커밋에서 고쳤다. **떼어 놓지 말 것.**

import { NextResponse } from "next/server";
import { rewardGuard, loadActiveCampaign } from "@/lib/rewardServer";
import { rewardBalance } from "@/lib/rewardCalc";
import {
  rewardUseBlockReason,
  maxUsableAmount,
  rewardUseAmountError,
  REWARD_USE_AMOUNT_LABEL,
  rewardUseBlockLabel,
  buildRewardUseLedgerRow,
  grossCharge,
} from "@/lib/rewardUse";
import { buildRewardDeductedSmsPreview } from "@/lib/rewardNotify";

export const dynamic = "force-dynamic";

const INVOICE_SELECT =
  "id,company_id,order_id,collection_method,billing_cycle,locked,customer_side_locked," +
  "payment_received,customer_charge_total,reward_discount_amount,customer_charge_vat_included," +
  "receivable_amount,status,created_at";

/**
 * 정산 건 하나에 대한 **지금 상태**를 모은다 — 화면과 저장이 **같은 함수**를 쓴다.
 * 🔴 조회 실패를 빈 값으로 때우지 말 것(원칙 55번) — 「0원」과 「못 셌다」는 다른 말이다.
 */
async function loadContext(admin: any, invoiceId: string) {
  const { data: invoice, error: iErr } = await admin
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("id", invoiceId)
    .maybeSingle();
  if (iErr) return { error: iErr.message };
  if (!invoice) return { error: "정산 건을 찾을 수 없습니다." };

  const { campaign, error: cErr } = await loadActiveCampaign(admin);
  if (cErr) return { error: cErr };

  const companyId = (invoice as any).company_id as string | null;
  if (!companyId) {
    // 🔴 개인(게스트) 고객 오더는 리워드 대상이 아니다 — 참여 화주가 아니라는 뜻이다.
    return { invoice, campaign, isMember: false, balance: 0, batchStatus: null as string | null };
  }

  let isMember = false;
  if (campaign) {
    const { data: m, error: mErr } = await admin
      .from("reward_memberships")
      .select("id")
      .eq("company_id", companyId)
      .eq("campaign_id", campaign.id)
      .limit(1);
    if (mErr) return { error: mErr.message };
    isMember = (m || []).length > 0;
  }

  let balance = 0;
  if (campaign) {
    const { data: led, error: lErr } = await admin
      .from("reward_ledger")
      .select("transaction_type,amount")
      .eq("company_id", companyId)
      .eq("campaign_id", campaign.id);
    if (lErr) return { error: lErr.message };
    balance = rewardBalance((led || []) as any[]).balance;
  }

  // 🚨 **해제되지 않은 묶음 항목 하나** — 확정 묶음이면 금액이 굳었으므로 막고,
  //    draft 면 할인 뒤에 `refresh_item_snapshot` 으로 다시 맞춘다.
  //    ⚠️ 활성 판정은 `is_active` 가 아니라 **`released_at is null`** 이다(⑱ 의 교훈).
  const { data: items, error: bErr } = await admin
    .from("customer_billing_batch_items")
    .select("id,batch_id,customer_billing_batches(batch_status)")
    .eq("invoice_id", invoiceId)
    .is("released_at", null)
    .limit(1);
  if (bErr) return { error: bErr.message };
  const item = (items || [])[0] as any;
  const batchStatus = item ? (item.customer_billing_batches?.batch_status ?? null) : null;

  return { invoice, campaign, isMember, balance, batchStatus, batchItemId: item?.id ?? null };
}

// ── GET — 화면이 그릴 값 ────────────────────────────────────────────────────
//
// 🔴 **읽기 전용이다.** 재직 직원이면 role 무관(`/preview`·`/ledger` 와 같은 기준) —
//    관리자 전용은 **바꾸는 일**이지 들여다보는 일이 아니다.

export async function GET(req: Request) {
  const g = await rewardGuard();
  if (g.error) return g.error;
  const { admin } = g;

  const invoiceId = new URL(req.url).searchParams.get("invoice_id") || "";
  if (!invoiceId) return NextResponse.json({ error: "정산 건이 지정되지 않았습니다." }, { status: 400 });

  const ctx = await loadContext(admin, invoiceId);
  if ("error" in ctx && ctx.error) return NextResponse.json({ error: ctx.error }, { status: 400 });
  const { invoice, campaign, isMember, balance, batchStatus } = ctx as any;

  const blocked = rewardUseBlockReason({ campaign, isMember, invoice, batchStatus, balance });
  return NextResponse.json({
    // 🔴 **참여하지 않는 화주에게는 아무것도 안 그린다** — 화면이 이 값으로 가른다
    //    (「대상 아님」을 모든 정산 건에 띄우면 쓰지 않는 담당자에게 잡음이다).
    is_member: isMember,
    campaign,
    balance,
    current: Math.round(invoice.reward_discount_amount || 0),
    gross: grossCharge(invoice),
    charge: Math.round(invoice.customer_charge_total || 0),
    max: maxUsableAmount({ balance, invoice }),
    blocked,
    blocked_label: rewardUseBlockLabel(blocked),
  });
}

// ── POST — 할인을 걸거나 · 금액을 바꾸거나 · 0 으로 되돌린다 ───────────────

export async function POST(req: Request) {
  // 🔴 **관리자만** — 금액을 바꾸는 일이다(원칙 25번 · 화면이 버튼을 감추는 것과 한 벌).
  const g = await rewardGuard({ requireAdmin: true });
  if (g.error) return g.error;
  const { staff, admin } = g;

  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id : "";
  const amount = Math.round(Number(body.amount));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  // 🚨 **화주에게 보이는 한 줄** — `reason`(내부 사유)과 **다른 칸이다**(2·3차 확정).
  //    🔴 `reason` 을 여기에 복사하지 말 것.
  const customerNote =
    typeof body.customer_note === "string" && body.customer_note.trim()
      ? body.customer_note.trim()
      : null;

  if (!invoiceId) return NextResponse.json({ error: "정산 건이 지정되지 않았습니다." }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "변경 사유를 입력해 주세요." }, { status: 400 });

  const ctx = await loadContext(admin, invoiceId);
  if ("error" in ctx && ctx.error) return NextResponse.json({ error: ctx.error }, { status: 400 });
  const { invoice, campaign, isMember, balance, batchStatus, batchItemId } = ctx as any;

  const current = Math.round(invoice.reward_discount_amount || 0);

  // 🔴 **관문은 「할인을 늘릴 때만」 전부 본다.** 줄이거나 푸는 것은 화주에게
  //    불리해지지 않으므로 잔액·최소사용액 관문에 걸리면 안 된다 — 걸면 잘못 건
  //    할인을 **영영 못 되돌린다.** 🔴 다만 **잠금·확정 묶음은 줄일 때도 막는다**
  //    (그 둘은 금액이 이미 굳어서, 여기서 바꾸면 화면과 청구서가 갈린다).
  const hardBlock = rewardUseBlockReason({
    campaign,
    isMember,
    invoice,
    batchStatus,
    // 잔액·최소사용액 관문을 건너뛰려고 넉넉히 넘긴다(아래 금액 검사가 진짜로 본다)
    balance: Math.max(balance, campaign?.minimum_use_amount || 0, 1),
  });
  if (hardBlock) {
    return NextResponse.json({ error: rewardUseBlockLabel(hardBlock) }, { status: 400 });
  }

  if (amount > current) {
    const blocked = rewardUseBlockReason({ campaign, isMember, invoice, batchStatus, balance });
    if (blocked) return NextResponse.json({ error: rewardUseBlockLabel(blocked) }, { status: 400 });
  }

  const max = maxUsableAmount({ balance, invoice });
  const amtErr = rewardUseAmountError({
    amount,
    current,
    max,
    minimumUseAmount: campaign?.minimum_use_amount || 0,
  });
  if (amtErr) return NextResponse.json({ error: REWARD_USE_AMOUNT_LABEL[amtErr] }, { status: 400 });

  // ── ① 원장 — 🔴 **먼저 넣는다.** ──────────────────────────────────────────
  //
  // 🚨 순서에 뜻이 있다. 원장이 실패하면 청구 금액은 그대로이고(아무 일도 안 난다),
  //    반대로 했다가 원장이 실패하면 **깎아 놓고 적립금은 안 쓴 상태**가 된다.
  //    🔴 뒤집지 말 것.
  const ledgerRow = buildRewardUseLedgerRow({
    companyId: invoice.company_id,
    campaignId: campaign.id,
    invoiceId,
    current,
    next: amount,
    reason,
    customerNote,
    staffId: staff.id,
  });
  if (!ledgerRow) {
    return NextResponse.json({ error: REWARD_USE_AMOUNT_LABEL.same_as_now }, { status: 400 });
  }

  const { data: ledger, error: ledErr } = await admin
    .from("reward_ledger")
    .insert(ledgerRow)
    .select("id,amount")
    .single();
  if (ledErr) {
    // 🚨 부분 UNIQUE 위반 — 두 탭·두 번 클릭·재시도가 여기서 걸린다.
    const dup = (ledErr as any)?.code === "23505";
    return NextResponse.json(
      { error: dup ? "이미 이 정산 건에 할인이 걸려 있습니다. 화면을 새로고침해 주세요." : ledErr.message },
      { status: 400 }
    );
  }

  // ── ② 청구 금액 ──────────────────────────────────────────────────────────
  //
  // 🔴 **깎기 전 금액에서 다시 뺀다** — `customer_charge_total` 은 이미 깎인 값이라
  //    거기서 또 빼면 금액이 계속 줄어든다(`grossCharge` 가 그 한 줄이다).
  const gross = grossCharge(invoice);
  const nextCharge = gross - amount;
  const patch: Record<string, any> = {
    reward_discount_amount: amount,
    customer_charge_total: nextCharge,
    // 🔴 **받을 돈도 같이 줄인다** — 미수금이 이 값을 먼저 본다(`lib/receivableCalc.ts`).
    //    안 고치면 목록은 깎인 금액을, 미수금은 제값을 말한다.
    //    ⚠️ 선착불은 애초에 관문에서 막히므로 여기는 항상 주선사수금이다.
    receivable_amount: nextCharge,
    updated_by: staff.id,
  };
  const { error: upErr } = await admin.from("invoices").update(patch).eq("id", invoiceId);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  // ── ③ 이력 — 🔴 금액을 바꾼 일은 반드시 남긴다(35차 A-7 과 같은 자세) ─────
  await admin.from("invoice_amendment_logs").insert({
    invoice_id: invoiceId,
    staff_id: staff.id,
    before_json: invoice,
    after_json: { ...invoice, ...patch },
    reason: `[리워드 운임 할인 ${current.toLocaleString()} → ${amount.toLocaleString()}원] ${reason}`,
  });

  // ── ④ 월정산 묶음 — draft 면 스냅샷을 다시 맞춘다 ────────────────────────
  //
  // 🟢 **저장소 밖 DB 함수를 고치지 않고 있는 것을 부른다**(CLAUDE.md §5 의 지침).
  // 🔴 **실패해도 할인은 이미 끝난 일이다** — 던지지 않고 결과만 돌려준다
  //    (담당자가 묶음 화면에서 「새로고침」을 다시 누를 수 있다).
  let batchRefreshed: boolean | null = null;
  if (batchItemId) {
    const { data: r, error: rErr } = await admin.rpc("refresh_item_snapshot", {
      p_item_id: batchItemId,
    });
    batchRefreshed = !rErr && (r as any)?.success === true;
  }

  // ── ⑤ 차감 안내 문자의 **확인창 미리보기** ───────────────────────────────
  //
  // 🚨 **여기서 보내지 않는다** — 담당자가 [발송]을 눌러야 나간다(2차 확정).
  // 🔴 **줄어들 때만** 만든다(`amount` 가 양수인 조정은 「차감」이 아니다) —
  //    `buildRewardDeductedSmsPreview` 가 음수만 받는다.
  let sms = null;
  try {
    sms = await buildRewardDeductedSmsPreview({
      admin,
      campaignId: campaign.id,
      companyId: invoice.company_id,
      amount: Math.round((ledger as any)?.amount || 0),
      ledgerId: (ledger as any)?.id,
      customerNote,
    });
  } catch {
    /* 할인은 이미 저장됐다 — 미리보기 때문에 되돌리지 않는다 */
  }

  return NextResponse.json({
    ok: true,
    current: amount,
    charge: nextCharge,
    gross,
    batch_refreshed: batchRefreshed,
    sms,
  });
}
