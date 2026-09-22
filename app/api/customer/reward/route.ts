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
import { loadActiveCampaign } from "@/lib/rewardCampaign";
import { previewRewards } from "@/lib/rewardAccrue";
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
  // 🟢 **`lib/rewardCampaign.ts` 에서 가져온다**(3차, 2026-09-21) — 그전에는 질의를
  //    여기에 따로 적었다. 이유는 `lib/rewardServer.ts` 가 `getCurrentStaff()`(직원
  //    쿠키 세션)를 들이기 때문이었는데, 3차에 캠페인 조회만 **의존성 0** 파일로
  //    갈라내서 그 고리가 끊겼다. 🔴 `lib/rewardServer` 에서 가져오도록 되돌리지 말 것.
  const { campaign, error: cErr } = await loadActiveCampaign(admin);
  if (cErr) return NextResponse.json({ error: cErr }, { status: 400 });
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

  // 🔴 **메뉴는 「보이는가」만 묻는다**(`?menu=1`) — 포털 셸이 화면을 열 때마다 원장과
  //    오더번호까지 읽으면 메뉴 한 줄을 그리려고 질의 셋이 더 돈다.
  //    🔴 **이 분기를 지우고 셸이 전체 응답을 받게 하지 말 것.**
  if (new URL(req.url).searchParams.get("menu") === "1") {
    return NextResponse.json({ visible: true });
  }

  // ── 원장 ──────────────────────────────────────────────────────────────────
  // 🚨 **`description`·`created_by` 를 select 에 넣지 말 것** — 수동 조정 사유가
  //    담당자의 내부 메모라 그대로 화주에게 간다(`lib/rewardPortal.ts` 머리말).
  //    `source_id` 도 안 준다 — 대신 오더번호를 조인해 준다.
  const { data: ledger, error: lErr } = await admin
    .from("reward_ledger")
    // 🚨 `customer_note` 는 **화주에게 보이라고 만든 칸**이다(3차) — `description`
    //    (내부 사유)과 혼동하지 말 것. 앞엣것만 준다.
    .select(
      "id,transaction_type,amount,earning_base_amount,earn_rate_snapshot,source_type,source_id,customer_note,created_at"
    )
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
    note: r.customer_note || null,
    created_at: r.created_at,
  }));

  // ── 예상 적립 (3차, 2026-09-21) ───────────────────────────────────────────
  //
  // 🚨 **왜 필요한가** — 월정산 화주는 **한 달치를 한 번에** 입금하므로, 그 전까지
  //    운송을 아무리 많이 해도 원장이 비어 있어 이 화면이 **0원만 보여준다**
  //    (실측 2026-09-21 — 포털 노출이 켜진 화주의 정산 13건이 전부 미입금이었고
  //    그 화주의 원장은 0행이었다). 사용자 지적이 정확히 그 자리다.
  //
  // 🔴 **원장에는 한 줄도 쓰지 않는다** — 표시 시점 계산이고 확정은 입금 확인 때만
  //    만들어진다(원칙 47번과 같은 결). 🔴 `balance` 에 더하지 말 것.
  // 🔴 **판정·금액은 관리자 쪽과 같은 `previewRewards`(→ `evaluateReward`) 하나다** —
  //    갈라 적으면 화주가 보는 예상액과 담당자가 보는 예상액이 어긋난다.
  // 🔴 **실패해도 본문은 그대로 준다** — 예상은 곁다리이고, 여기서 막으면 잔액까지
  //    못 본다. 못 셌으면 `pending` 을 **주지 않는다**(0 으로 주면 「앞으로 쌓일 것이
  //    없다」는 거짓말이 된다).
  let pending: { amount: number; count: number } | null = null;
  try {
    const pre = await previewRewards({ admin, campaign, companyId });
    if (!pre.error) {
      // 🔴 대상이 아닌 건(`reason` 이 있는 것)은 빼고 센다 — `amount` 가 0 이라 합계는
      //    같지만 **건수**가 부풀어 「N건 예정」이 거짓이 된다(관리자 쪽과 같은 규칙).
      const eligible = pre.rows.filter((r) => !r.reason);
      pending = {
        amount: eligible.reduce((sum, r) => sum + r.amount, 0),
        count: eligible.length,
      };
    }
  } catch {
    /* 예상은 곁다리다 — 잔액을 막지 않는다 */
  }

  return NextResponse.json({
    visible: true,
    // 🔴 **`pending` 을 `balance` 와 나란히 두되 더하지 않는다** — 화면이 둘을
    //    다른 무게로 그린다(예상은 아직 화주의 돈이 아니다).
    pending,
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
