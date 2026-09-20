// POST /api/admin/reward/membership — 기업별 리워드 설정 저장 (🔴 관리자만)
//
// 🔴 **설정 넷은 각각 독립이다** — `enabled`·`portal_visible`·`reward_method`·
//    `sms_notification_enabled`. 하나로 묶으면 **「적립은 하되 포털에는 안 보이고
//    상품권으로 주는」 고객**을 운영할 수 없게 된다(전달문서 §3-1·§38 ②).
//
// 🔴 **`enabled = false` 는 「신규 적립 중단」이다** — 기존 원장을 건드리지 않는다.
//    🔴 여기서 원장을 지우거나 고치는 코드를 만들지 말 것.

import { NextResponse } from "next/server";
import { rewardGuard, loadActiveCampaign } from "@/lib/rewardServer";
import type { RewardMethod } from "@/lib/rewardCalc";

export const dynamic = "force-dynamic";

const METHODS: RewardMethod[] = ["freight_discount", "giftcard", "manual"];

export async function POST(req: Request) {
  // 🔴 원칙 25번 — 화면이 「편집」을 감추는 것과 이 확인은 한 벌이다.
  const g = await rewardGuard({ requireAdmin: true });
  if (g.error) return g.error;
  const { staff, admin } = g;

  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const companyId = typeof body.company_id === "string" ? body.company_id : "";
  if (!companyId) return NextResponse.json({ error: "화주가 지정되지 않았습니다." }, { status: 400 });

  const { campaign, error: campaignError } = await loadActiveCampaign(admin);
  if (campaignError) return NextResponse.json({ error: campaignError }, { status: 400 });
  if (!campaign) return NextResponse.json({ error: "활성 캠페인이 없습니다." }, { status: 400 });

  const method: RewardMethod = METHODS.includes(body.reward_method)
    ? body.reward_method
    : "manual";

  const payload = {
    company_id: companyId,
    campaign_id: campaign.id,
    enabled: body.enabled === true,
    portal_visible: body.portal_visible === true,
    reward_method: method,
    sms_notification_enabled: body.sms_notification_enabled === true,
    // 🔴 시작일이 곧 「이 날부터 적립」이다 — 비면 오늘로 둔다(적립 판정이 이 값을 본다).
    started_at: body.started_at || new Date().toISOString().slice(0, 10),
    ended_at: body.ended_at || null,
    internal_note: typeof body.internal_note === "string" ? body.internal_note.trim() || null : null,
    updated_at: new Date().toISOString(),
    updated_by: staff.id,
  };

  // 🔴 UNIQUE (company_id, campaign_id) 라 upsert 가 한 문장으로 끝난다 —
  //    「먼저 조회해서 없으면 insert」는 두 탭이 동시에 저장할 때 샌다(§7 함정).
  const { data, error } = await admin
    .from("reward_memberships")
    .upsert(payload, { onConflict: "company_id,campaign_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, membership: data });
}
