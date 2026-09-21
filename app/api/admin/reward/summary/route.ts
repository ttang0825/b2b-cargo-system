// GET /api/admin/reward/summary?company_id=  — 기업별 설정 + 잔액·누적
//
// 🔴 **새 서비스롤 GET 라우트에는 `force-dynamic` 과 `createServiceClient()` 가 둘 다**
//    필요하다(원칙 21번) — `force-dynamic` 만으로는 supabase-js 내부 fetch 가
//    Next Data Cache 를 그대로 탄다. `rewardGuard()` 가 후자를 준다.
//
// 🔴 **잔액은 여기서 원장을 합쳐서 낸다**(표시 시점 계산) — 화면이 원장을 직접
//    합치지 말 것이고, `companies` 에 잔액 컬럼을 만들지도 말 것.

import { NextResponse } from "next/server";
import { rewardGuard, loadActiveCampaign } from "@/lib/rewardServer";
import { rewardBalance } from "@/lib/rewardCalc";

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

  // ── 회사 하나 ────────────────────────────────────────────────────────────
  if (companyId) {
    const { data: membership, error: mErr } = await admin
      .from("reward_memberships")
      .select("*")
      .eq("company_id", companyId)
      .eq("campaign_id", campaign.id)
      .limit(1);
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 400 });

    const { data: ledger, error: lErr } = await admin
      .from("reward_ledger")
      .select("amount")
      .eq("company_id", companyId)
      .eq("campaign_id", campaign.id);
    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 400 });

    return NextResponse.json({
      campaign,
      membership: (membership || [])[0] || null,
      ...rewardBalance((ledger || []) as any),
    });
  }

  // ── 전체 (리워드 관리 화면 · 화주 목록) ──────────────────────────────────
  // 🔴 **회사명을 여기서 조인해 내려준다** — 그전에는 화면이 원장(적립 이력)에서만
  //    이름을 모아서, **적립 이력이 아직 없는 기업은 이름을 못 찾고** `화주 a1b2c3d4`
  //    로 떨어졌다(원장이 0행이던 초기에는 전부 그랬다). 이름의 출처를 「이력」이
  //    아니라 「멤버십 그 자신」으로 옮긴 것이다. 🔴 화면이 `companies` 를 따로
  //    조회하게 되돌리지 말 것 — 리워드 표는 서버 라우트가 유일한 통로다.
  const { data: memberships, error: msErr } = await admin
    .from("reward_memberships")
    .select("*,companies(name)")
    .eq("campaign_id", campaign.id);
  if (msErr) return NextResponse.json({ error: msErr.message }, { status: 400 });

  const { data: ledger, error: lsErr } = await admin
    .from("reward_ledger")
    .select("company_id,amount")
    .eq("campaign_id", campaign.id);
  if (lsErr) return NextResponse.json({ error: lsErr.message }, { status: 400 });

  const byCompany: Record<string, { amount: number }[]> = {};
  for (const row of (ledger || []) as any[]) {
    (byCompany[row.company_id] ||= []).push({ amount: row.amount });
  }
  const balances: Record<string, ReturnType<typeof rewardBalance>> = {};
  for (const [cid, rows] of Object.entries(byCompany)) balances[cid] = rewardBalance(rows);

  return NextResponse.json({ campaign, memberships: memberships || [], balances });
}
