// POST /api/admin/reward/notify — 「적립 현황 안내」 문자의 **확인창 미리보기**
//
// 🚨 **이 라우트는 문자를 보내지 않는다.** 문구·수신번호만 만들어 돌려주고, 실제
//    발송은 담당자가 `components/SmsConfirmModal.tsx` 에서 [발송]을 눌러야 일어난다
//    (`/api/admin/send-sms`). 리워드 문자 셋이 전부 같은 자세다.
//    🔴 **`sendSmsWithLog` 를 이 라우트에 들이지 말 것.**
//
// 🔴 **두 가지 방식으로 부른다**(정의처는 `lib/rewardNotify.ts` 하나):
//      { company_id }    수동 — 화주 상세의 「적립 안내 문자」
//      { dispatch_id }   운송완료 — 그 건의 예상 적립을 첫 줄에 적는다
//
// 🚨 **그 둘을 가르는 것이 이 라우트의 일이다**(2026-09-22) — `sms_on_delivery_enabled`
//    가 꺼진 화주는 **운송완료 자리에서만** 창이 안 뜨고 수동 버튼은 그대로다.
//    🔴 **`trigger` 를 요청 바디에서 받지 말 것** — 화면이 보낸 값을 믿으면 배차
//       화면이 「수동」이라고 주장해 꺼 둔 확인창을 되살릴 수 있다. **어느 id 가
//       왔는지로 서버가 정한다**(원칙 30·53번과 같은 자세).
//
// 🔴 **`dispatch_id` 를 받으면 화주도 정산 건도 서버가 다시 조회한다** — 화면이
//    보낸 `company_id` 를 믿지 않는다(`notify-dispatch-status` 와 같은 자세 ·
//    원칙 53번). 그래야 배차 목록이 select 에 컬럼을 더 실을 필요도 없다.
//    ⚠️ 운송완료 시점에는 `autoCreateInvoice` 가 이미 그 건을 만들어 두었다
//       (배차 화면이 문자 블록보다 **먼저** 부른다 · 실측 확인).
//
// 🔴 `force-dynamic` + `rewardGuard()`(→ `createServiceClient`) 둘 다(원칙 21번).

import { NextResponse } from "next/server";
import { rewardGuard, loadActiveCampaign } from "@/lib/rewardServer";
import { buildRewardStatusSmsPreview } from "@/lib/rewardNotify";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 🔴 **재직 직원이면 role 무관이다** — 문자를 보내는 다른 경로(배차확정 등)와
  //    같은 기준이다. 관리자 전용은 **설정·조정**이지 안내가 아니다.
  const g = await rewardGuard();
  if (g.error) return g.error;
  const { admin } = g;

  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const dispatchId = typeof body.dispatch_id === "string" ? body.dispatch_id : null;
  let companyId = typeof body.company_id === "string" ? body.company_id : "";
  let invoiceId: string | null = null;

  if (dispatchId) {
    // 배차 → 오더 → 화주. 🔴 게스트 오더는 `company_id` 가 `null` 이고, 그때는
    //    알릴 화주가 없다(적립 대상도 아니다 — `rewardIneligibleReason`).
    const { data: d, error: dErr } = await admin
      .from("dispatches")
      .select("order_id,orders(company_id)")
      .eq("id", dispatchId)
      .maybeSingle();
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 400 });
    companyId = (d as any)?.orders?.company_id || "";
    if (!companyId) return NextResponse.json({ preview: null });

    const orderId = (d as any)?.order_id;
    if (orderId) {
      // 🔴 **`.maybeSingle()` 을 쓰지 말 것**(원칙 48번) — 한 오더에 정산 건이
      //    둘 이상일 수 있다(정정청구). 2행이면 그 함수는 오류를 던진다.
      // 🔴 **가장 최근 것**이 방금 만들어진 이번 건이다.
      const { data: invs, error: iErr } = await admin
        .from("invoices")
        .select("id")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });
      invoiceId = (invs || [])[0]?.id ?? null;
    }
  }

  if (!companyId) {
    return NextResponse.json({ error: "화주가 지정되지 않았습니다." }, { status: 400 });
  }

  const { campaign, error: campaignError } = await loadActiveCampaign(admin);
  if (campaignError) return NextResponse.json({ error: campaignError }, { status: 400 });
  if (!campaign) return NextResponse.json({ error: "활성 캠페인이 없습니다." }, { status: 400 });

  const preview = await buildRewardStatusSmsPreview({
    admin,
    campaign,
    companyId,
    // 🔴 **화면이 아니라 여기서 정한다** — `dispatch_id` 로 들어온 것만 운송완료다.
    trigger: dispatchId ? "delivery" : "manual",
    thisInvoiceId: invoiceId,
    relatedId: companyId,
  });

  // 🔴 **`null` 은 오류가 아니다** — 리워드를 안 쓰거나, 문자 안내가 꺼져 있거나,
  //    **운송완료 안내를 꺼 뒀거나**, 아직 알릴 숫자가 없는 화주다.
  //    화면이 그것을 구분해 말한다.
  //    ⚠️ 404 로 내려보내지 말 것 — 자동 흐름(운송완료)이 그것을 오류로 읽는다.
  return NextResponse.json({ preview: preview ?? null });
}
