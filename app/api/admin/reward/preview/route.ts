// GET /api/admin/reward/preview — 미입금 건의 **예상 적립** (읽기 전용)
//
// 🔴 **원장에 한 줄도 쓰지 않는다.** 확정은 입금 확인이 일어나는 순간에만 만들어지고
//    여기는 표시 시점 계산이다(원칙 47번과 같은 결 — 「예상」을 미리 원장에 넣으면
//    입금되지 않은 돈이 잔액에 섞인다). 이 라우트에 적립을 넣지 말 것.
//
// 🔴 판정·금액은 실제 적립과 **같은 `evaluateReward`** 를 쓴다(`lib/rewardAccrue.ts`).
//    갈라 적으면 화면이 약속한 예상액과 실제로 쌓이는 금액이 어긋난다.
//
// 🔴 `force-dynamic` + `createServiceClient()` 둘 다(원칙 21번 · `rewardGuard`).
//
//   ?invoice_id=  그 한 건만 (입금 여부와 무관하게 계산)
//   ?company_id=  그 화주의 미입금 건 전부
//   (없음)        전체 화주의 미입금 건 — 회사별 합계까지

import { NextResponse } from "next/server";
import { rewardGuard, loadActiveCampaign } from "@/lib/rewardServer";
import { previewRewards } from "@/lib/rewardAccrue";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await rewardGuard();
  if (g.error) return g.error;
  const { admin } = g;

  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoice_id");
  const companyId = searchParams.get("company_id");

  const { campaign, error: campaignError } = await loadActiveCampaign(admin);
  if (campaignError) return NextResponse.json({ error: campaignError }, { status: 400 });
  if (!campaign) return NextResponse.json({ error: "활성 캠페인이 없습니다." }, { status: 400 });

  const { rows, truncated, error } = await previewRewards({
    admin,
    campaign,
    invoiceId,
    companyId,
  });
  // 🔴 실패를 0 으로 내려보내지 말 것(원칙 55번) — 「예상 0원」과 「못 셌다」는 다르다.
  if (error) return NextResponse.json({ error }, { status: 400 });

  // 🔴 대상이 아닌 건(`reason` 이 있는 것)은 합계에서 뺀다 — `amount` 가 0 이라
  //    더해도 합계는 같지만 **건수**가 부풀어 「예상 3건」이 거짓이 된다.
  const eligible = rows.filter((r) => !r.reason);
  const byCompany: Record<string, { amount: number; count: number }> = {};
  for (const r of eligible) {
    if (!r.company_id) continue;
    const acc = (byCompany[r.company_id] ||= { amount: 0, count: 0 });
    acc.amount += r.amount;
    acc.count += 1;
  }

  return NextResponse.json({
    campaign,
    rows,
    total: eligible.reduce((s, r) => s + r.amount, 0),
    count: eligible.length,
    byCompany,
    truncated,
  });
}
