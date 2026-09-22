// GET /api/admin/reward/unaccrued — **미적립 건 목록** (2026-09-22 · 읽기 전용)
//
// 🚨 **왜 필요한가** — 적립은 **「입금 체크가 바뀌는 순간」에만** 난다. 그 순간을
//    놓친 건과 관문에 걸린 건은 **원장이 비어 있는데 화면에 증상이 0이다.**
//    지금까지 담당자가 그것을 볼 자리는 **정산 상세의 읽기 전용 한 줄뿐**이었고,
//    리워드 관리 맨 위 줄은 **합계와 건수만** 말했다(HANDOFF §7 의 ⏳ 항목).
//
// 🔴 **이 라우트는 아무것도 쓰지 않는다.** 원장에 넣는 일은 `/backfill`(관리자 전용)
//    이 한다. 🔴 여기에 적립 코드를 들이지 말 것 — 목록을 여는 것만으로 돈이
//    움직이면 안 된다(화면 진입이 곧 적립이 된다).
//
// 🔴 **판정은 `evaluateReward()` 하나다** — 소급·예상·실제 적립과 **같은 함수**다.
//    🔴 사유 판정을 이 라우트에 다시 적지 말 것(두 벌이 되면 「목록엔 적립 가능인데
//       소급 버튼이 안 잡는」 상태가 난다).
//
// 🔴 **재직 직원이면 role 무관이다** — 읽기 전용 진단 목록이고, 관리자 전용은
//    **설정·조정·소급**이지 들여다보는 일이 아니다(`/preview`·`/ledger` 와 같은 기준).
//
// 🔴 `force-dynamic` + `rewardGuard()`(→ `createServiceClient`) 둘 다(원칙 21번).

import { NextResponse } from "next/server";
import { rewardGuard, loadActiveCampaign } from "@/lib/rewardServer";
import { findUnaccrued } from "@/lib/rewardAccrue";

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

  const { rows, truncated, error } = await findUnaccrued({ admin, campaign, companyId });
  // 🔴 실패를 빈 목록으로 내려보내지 말 것(원칙 55번) — 「미적립 0건」과 「못 셌다」는
  //    정반대의 뜻이고, 이 화면에서는 앞엣것이 **「문제 없음」**으로 읽힌다.
  if (error) return NextResponse.json({ error }, { status: 400 });

  // 🔴 **세 갈래는 처리가 전부 다르다** — 화면이 갈라 그리도록 서버가 세어 준다.
  //      waiting  입금 전이라 아직 안 쌓인 것      → **정상**(입금 확인 때 자동)
  //      backfill 입금은 됐는데 원장에 없는 것     → 🔴 소급 대상(관리자가 누른다)
  //      blocked  관문에 걸린 것                   → 🔴 입금돼도 영영 안 쌓인다
  //    🔴 한 숫자로 합치지 말 것 — 지금 운영은 13건이 전부 `waiting` 이라(실측
  //       `_verify.sql` ㊱-b) 합쳐 세면 「미적립 13건」이 사고처럼 읽힌다.
  const waiting = rows.filter((r) => !r.reason && !r.receipt_confirmed);
  const backfill = rows.filter((r) => !r.reason && r.receipt_confirmed);
  const blocked = rows.filter((r) => !!r.reason);

  return NextResponse.json({
    campaign,
    rows,
    truncated,
    counts: {
      total: rows.length,
      waiting: waiting.length,
      backfill: backfill.length,
      blocked: blocked.length,
    },
    totals: {
      // 🔴 **대상인 것만 더한다** — 막힌 건의 `amount` 는 0 이라 더해도 같지만,
      //    건수가 섞이면 「예상 N건」이 거짓이 된다(`/preview` 와 같은 자세).
      waiting: waiting.reduce((s, r) => s + r.amount, 0),
      backfill: backfill.reduce((s, r) => s + r.amount, 0),
    },
  });
}
