// 화주포털 — 내 회사의 리워드 (2차, 2026-09-21)
//
// 🔴 **리워드 표 셋은 RLS on + 정책 0개다**(1차 확정) — 화면이 supabase 클라이언트로
//    직접 읽을 수 없고, 읽어서도 안 된다. 화주포털 계정과 직원 계정이 **둘 다
//    `authenticated`** 라 정책을 하나라도 열면 **화주가 남의 회사 적립금을 읽는다**.
//    🔴 **`app/customer/**` 에서 `supabase.from("reward_` 를 쓰지 말 것** — 이 라우트가
//       유일한 통로다.
//
// 🔴 **회사는 요청 바디가 아니라 세션에서 정한다**(원칙 30번) — `company_id` 를 받아서
//    쓰면 브라우저 콘솔에서 남의 회사 id 를 넣어 **남의 적립금을 읽는 구멍**이 된다.
//    받는 것은 `Authorization: Bearer` 하나뿐이다.
//
// 🔴 **`portal_visible` 이 꺼져 있으면 아무것도 주지 않는다**(`{ visible: false }`).
//    ⚠️ **금액을 주고 화면에서 감추는 방식으로 하지 말 것** — 응답에 실리면 그대로
//       브라우저에 내려간다(30차 `ObfuscatedEmail` 과 같은 결).
//    ⚠️ **실측(2026-09-21) — 지금 멤버십 둘 다 `portal_visible = false` 다.**
//       담당자가 화주 상세에서 켜기 전까지 이 화면은 **아무에게도 안 보인다.**
//       그것이 고장이 아니라 설계다.
//
// 🔴 **`enabled` 로 감추지 않는다** — 그것은 「신규 적립 중단」이고 이미 쌓인 적립금은
//    그대로다(1차 확정). 끄자마자 화주 화면에서 잔액이 사라지면 그게 사고다.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import { rewardBalance } from "@/lib/rewardCalc";
import { portalRewardKind, type PortalRewardRow } from "@/lib/rewardPortal";

// 🔴 원칙 21번 — 이 둘은 **한 벌이다.** `force-dynamic` 만으로는 supabase-js 가
//    내부적으로 쓰는 `fetch` 가 그대로 Next 의 Data Cache 를 타서, 방금 적립된 건이
//    한참 뒤까지 안 보인다(55차에 프로덕션 빌드로 재현했다).
export const dynamic = "force-dynamic";

/** 🔴 화주가 보는 줄 수 상한 — 없으면 이력이 쌓일수록 응답이 무거워진다 */
const PORTAL_REWARD_ROW_LIMIT = 200;

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "인증 정보가 없습니다." }, { status: 401 });
  }

  const admin = createServiceClient(url, serviceKey);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 401 });
  }

  // 🔴 회사는 **여기서** 정한다(위 머리말).
  const { data: account, error: accErr } = await admin
    .from("customer_accounts")
    .select("company_id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  // 🔴 `error` 를 삼키지 말 것(원칙 55번) — 조회 실패를 「회사 없음」으로 두면
  //    화면이 「리워드 없음」으로 조용히 떨어져 원인을 짚을 단서가 안 남는다.
  if (accErr) return NextResponse.json({ error: accErr.message }, { status: 400 });
  const companyId = account?.company_id;
  if (!companyId) return NextResponse.json({ visible: false });

  // ── 캠페인 ────────────────────────────────────────────────────────────────
  // 🔴 요율·기간을 코드에 적지 말 것 — 캠페인 행이 정의처다.
  // ⚠️ `lib/rewardServer.ts` 의 `loadActiveCampaign()` 을 쓰지 않는다 — 그 파일은
  //    `getCurrentStaff()`(직원 쿠키 세션)를 들여서, 화주 라우트가 import 하면
  //    직원용 인증 코드가 이 경로에 딸려 들어온다. 질의는 여섯 줄이라 따로 적었다.
  const { data: campaigns, error: cErr } = await admin
    .from("reward_campaigns")
    .select("id,name,earn_rate,earn_end_date,use_end_date,minimum_use_amount")
    .eq("active", true)
    .order("start_date", { ascending: false })
    .limit(1);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
  const campaign = (campaigns || [])[0];
  if (!campaign) return NextResponse.json({ visible: false });

  // ── 멤버십 ────────────────────────────────────────────────────────────────
  const { data: memberships, error: mErr } = await admin
    .from("reward_memberships")
    .select("portal_visible")
    .eq("company_id", companyId)
    .eq("campaign_id", campaign.id)
    .limit(1);
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 400 });
  if (!(memberships || [])[0]?.portal_visible) {
    return NextResponse.json({ visible: false });
  }

  // ── 원장 ──────────────────────────────────────────────────────────────────
  // 🚨 **`description`·`created_by` 를 select 에 넣지 말 것** — 수동 조정 사유가
  //    담당자의 내부 메모라 그대로 화주에게 간다(`lib/rewardPortal.ts` 머리말).
  //    `source_id` 도 안 준다 — 대신 오더번호를 조인해 준다.
  const { data: ledger, error: lErr } = await admin
    .from("reward_ledger")
    .select("id,transaction_type,amount,earning_base_amount,earn_rate_snapshot,source_type,source_id,created_at")
    .eq("company_id", companyId)
    .eq("campaign_id", campaign.id)
    .order("created_at", { ascending: false })
    .limit(PORTAL_REWARD_ROW_LIMIT);
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 400 });

  // 🔴 **잔액은 원장 합계의 표시 시점 계산이다**(`lib/rewardCalc.ts`) —
  //    `companies` 에 잔액 컬럼을 만들지 말 것(36차 C장 사고).
  // ⚠️ 상한(200줄)에 걸릴 만큼 쌓이면 잔액이 목록 합과 갈린다 — 그때는 합계만
  //    따로 세는 질의를 더할 것이고, 지금은 운영 원장이 세 줄이라 멀다.
  const totals = rewardBalance(ledger || []);

  // ── 오더번호 ──────────────────────────────────────────────────────────────
  // 🔴 원장에는 정산 건 id 만 있다. 화주에게 id 를 보여줄 수 없으니 오더번호로 바꾼다.
  //    🔴 **`source_id` 를 그대로 내보내지 말 것**(내부 id 다).
  //    ⚠️ 정산이 지워졌거나 게스트 건이면 번호가 없다 — 그때는 `null` 이고 화면이
  //       날짜만 보여준다. **「정산 a1b2c3d4」 같은 잘린 id 로 때우지 말 것.**
  const invoiceIds = Array.from(
    new Set((ledger || []).filter((r: any) => r.source_type === "invoice" && r.source_id).map((r: any) => r.source_id))
  );
  const orderNoByInvoice = new Map<string, string>();
  if (invoiceIds.length > 0) {
    const { data: invoices, error: iErr } = await admin
      .from("invoices")
      .select("id,orders(order_no)")
      .in("id", invoiceIds);
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });
    for (const inv of invoices || []) {
      const no = (inv as any).orders?.order_no;
      if (no) orderNoByInvoice.set((inv as any).id, no);
    }
  }

  const rows: PortalRewardRow[] = (ledger || []).map((r: any) => ({
    id: r.id,
    kind: portalRewardKind(r.transaction_type, r.amount),
    amount: Math.round(r.amount || 0),
    base_amount: r.earning_base_amount == null ? null : Math.round(r.earning_base_amount),
    earn_rate: r.earn_rate_snapshot == null ? null : Number(r.earn_rate_snapshot),
    order_no: r.source_id ? orderNoByInvoice.get(r.source_id) ?? null : null,
    created_at: r.created_at,
  }));

  return NextResponse.json({
    visible: true,
    campaign: {
      name: campaign.name,
      earn_rate: Number(campaign.earn_rate),
      earn_end_date: campaign.earn_end_date,
      use_end_date: campaign.use_end_date,
      minimum_use_amount: Math.round(campaign.minimum_use_amount || 0),
    },
    balance: totals.balance,
    earned: totals.earned,
    used: totals.used,
    rows,
  });
}
