// POST /api/admin/reward/adjust — 수동 조정 (🔴 관리자만 · 🔴 사유 필수)
//
// 🔴 **원장은 append-only 다.** 잘못 적립됐으면 **반대 부호로 한 줄 더** 넣는다 —
//    행을 지우거나 금액을 고치는 경로를 만들지 말 것(전달문서 §38 ④).
// 🔴 **사유가 없으면 저장하지 않는다** — 돈이 움직인 이유가 남지 않으면
//    나중에 아무도 그 줄을 설명할 수 없다.

import { NextResponse } from "next/server";
import { rewardGuard, loadActiveCampaign } from "@/lib/rewardServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await rewardGuard({ requireAdmin: true });
  if (g.error) return g.error;
  const { staff, admin } = g;

  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const companyId = typeof body.company_id === "string" ? body.company_id : "";
  const amount = Math.round(Number(body.amount));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!companyId) return NextResponse.json({ error: "화주가 지정되지 않았습니다." }, { status: 400 });
  if (!Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ error: "조정 금액을 입력해 주세요(0원은 조정이 아닙니다)." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "조정 사유를 입력해 주세요." }, { status: 400 });
  }

  const { campaign, error: campaignError } = await loadActiveCampaign(admin);
  if (campaignError) return NextResponse.json({ error: campaignError }, { status: 400 });
  if (!campaign) return NextResponse.json({ error: "활성 캠페인이 없습니다." }, { status: 400 });

  const { data, error } = await admin
    .from("reward_ledger")
    .insert({
      company_id: companyId,
      campaign_id: campaign.id,
      transaction_type: "adjustment",
      amount,
      // 🔴 수동 조정에는 원본이 없다 — `source_id` 가 null 이라 부분 UNIQUE 에서
      //    빠지고, 그래서 같은 사유로 두 번 조정하는 것도 막지 않는다(의도된 동작).
      source_type: "manual",
      source_id: null,
      description: reason,
      created_by: staff.id,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, row: data });
}
