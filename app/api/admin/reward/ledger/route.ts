// GET /api/admin/reward/ledger?company_id=&limit=  — 적립·사용 내역
//
// 🔴 `force-dynamic` + `createServiceClient()` 둘 다(원칙 21번 · `rewardGuard`).
// 🔴 `company_id` 를 안 주면 **전체 이력**이다(리워드 관리 화면 ②).

import { NextResponse } from "next/server";
import { rewardGuard, loadActiveCampaign } from "@/lib/rewardServer";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export async function GET(req: Request) {
  const g = await rewardGuard();
  if (g.error) return g.error;
  const { admin } = g;

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("company_id");
  const rawLimit = Number(searchParams.get("limit") || DEFAULT_LIMIT);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT, 1), MAX_LIMIT);

  const { campaign, error: campaignError } = await loadActiveCampaign(admin);
  if (campaignError) return NextResponse.json({ error: campaignError }, { status: 400 });
  if (!campaign) return NextResponse.json({ error: "활성 캠페인이 없습니다." }, { status: 400 });

  // 🔴 회사명은 원장에 없다 — 조인해서 화면이 이름을 다시 찾지 않게 한다.
  let q = admin
    .from("reward_ledger")
    .select(
      "id,company_id,transaction_type,amount,earning_base_amount,earn_rate_snapshot," +
        "source_type,source_id,description,created_at,companies(name)"
    )
    .eq("campaign_id", campaign.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (companyId) q = q.eq("company_id", companyId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ campaign, rows: data || [], limit });
}
