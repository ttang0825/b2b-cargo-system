// 소급 적립 — 이미 입금이 확인됐는데 원장에 없는 건 (2026-09-21)
//
//   GET   후보 목록만 (읽기 전용 · 직원이면 볼 수 있다)
//   POST  실제로 적립 (🔴 **관리자만** — 돈이 원장에 굳는다)
//
// 🚨 **왜 있는가** — 적립은 「입금 체크가 **바뀌는 순간**」에만 난다. 리워드를 켜기
//    전에 이미 입금 처리된 건, 캠페인 시작일을 뒤로 옮겨서 새로 범위에 든 건
//    (2026-09-21 · 9/1 → 8/7)은 관문을 전부 통과하는데도 원장이 비어 있다.
//    그 건들을 담당자가 **눌러서** 채우는 자리다.
//
// 🔴 **자동으로 돌지 않는다** — 화면 진입이나 배포가 돈을 움직이게 두지 않는다.
// 🔴 **판정·금액은 `lib/rewardAccrue.ts` 하나가 한다** — 여기에 조건을 적으면
//    소급분만 다른 기준으로 쌓인다(원칙 53번).
// 🚨 **중복은 DB UNIQUE 가 막는다** — 목록이 낡아도 `already` 로 조용히 넘어간다.
//    🔴 화면·목록에서만 막지 말 것(두 탭·두 번 클릭이 전부 샌다).
// 🔴 `force-dynamic` + `createServiceClient()` 둘 다(원칙 21번 · `rewardGuard`).

import { NextResponse } from "next/server";
import { rewardGuard, loadActiveCampaign } from "@/lib/rewardServer";
import { accrueReward, findUnaccruedPaid } from "@/lib/rewardAccrue";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await rewardGuard();
  if (g.error) return g.error;
  const { admin } = g;

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("company_id");

  const { campaign, error: campaignError } = await loadActiveCampaign(admin);
  if (campaignError) return NextResponse.json({ error: campaignError }, { status: 400 });
  if (!campaign) return NextResponse.json({ error: "활성 캠페인이 없습니다." }, { status: 400 });

  const { rows, truncated, error } = await findUnaccruedPaid({ admin, campaign, companyId });
  // 🔴 실패를 0 으로 내려보내지 말 것(원칙 55번) — 「대상 0건」과 「못 셌다」는 다르다.
  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json({
    rows,
    count: rows.length,
    total: rows.reduce((s, r) => s + r.amount, 0),
    truncated,
  });
}

export async function POST(req: Request) {
  // 🔴 **관리자만**(원칙 25번) — 화면이 버튼을 감추는 것과 한 벌이다.
  const g = await rewardGuard({ requireAdmin: true });
  if (g.error) return g.error;
  const { staff, admin } = g;

  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const companyId = typeof body.company_id === "string" ? body.company_id : null;

  const { campaign, error: campaignError } = await loadActiveCampaign(admin);
  if (campaignError) return NextResponse.json({ error: campaignError }, { status: 400 });
  if (!campaign) return NextResponse.json({ error: "활성 캠페인이 없습니다." }, { status: 400 });

  // 🔴 **화면이 보낸 목록을 믿지 않는다** — 후보를 서버가 지금 다시 찾는다.
  //    id 를 받아서 돌면 콘솔에서 아무 정산 건이나 적립시킬 수 있다(원칙 30번과 같은 결).
  const { rows, truncated, error } = await findUnaccruedPaid({ admin, campaign, companyId });
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, accrued: 0, already: 0, skipped: 0, failed: 0, results: [] });
  }

  let accrued = 0;
  let already = 0;
  let skipped = 0;
  let failed = 0;
  const results: any[] = [];
  for (const r of rows) {
    // 🔴 넣는 일은 `accrueReward` 가 한다 — 관문을 **한 번 더** 보고 넣는다
    //    (목록을 만든 뒤 상태가 바뀌었을 수 있다).
    const out = await accrueReward({
      admin,
      staffId: staff.id,
      sourceType: "invoice",
      sourceId: r.invoice_id,
    });
    if (out.error) {
      failed += 1;
      results.push({ invoice_id: r.invoice_id, label: r.label, status: "error", message: out.error });
      continue;
    }
    for (const o of out.results) {
      if (o.status === "accrued") accrued += 1;
      else if (o.status === "already") already += 1;
      else if (o.status === "error") failed += 1;
      else skipped += 1;
      results.push({ ...o, label: r.label });
    }
  }

  // 🔴 **한 건이라도 실패하면 그 사실을 숨기지 말 것** — 전체를 400 으로 떨구지도
  //    않는다(성공한 적립은 이미 원장에 들어갔고 그것이 사실이다).
  return NextResponse.json({ ok: true, accrued, already, skipped, failed, truncated, results });
}
