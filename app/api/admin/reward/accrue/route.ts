// POST /api/admin/reward/accrue — 적립·회수를 **밖에서 부르는 입구**
//
//   { source_type: "invoice",       source_id: <invoice id>, reverse?: boolean }
//   { source_type: "billing_batch", source_id: <batch id> }
//
// 🔴 **로직은 여기 없다** — `lib/rewardAccrue.ts` 하나가 정의처이고, 입금확인 경로 둘도
//    같은 함수를 부른다(화면·라우트마다 적으면 한쪽만 고쳐진다 · 원칙 53번).
// 🔴 **이 라우트가 주 경로가 아니다** — 건별은 `invoices/save`, 월정산은
//    `billing-batches/mark-payment-received` 가 저장하면서 바로 부른다.
//    여기는 24시콜 ⓒ 같은 다른 경로와 손으로 다시 태울 때를 위한 입구다.

import { NextResponse } from "next/server";
import { rewardGuard } from "@/lib/rewardServer";
import { accrueReward } from "@/lib/rewardAccrue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await rewardGuard();
  if (g.error) return g.error;
  const { staff, admin } = g;

  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const sourceType = body.source_type;
  const sourceId = typeof body.source_id === "string" ? body.source_id : "";
  if (!sourceId || (sourceType !== "invoice" && sourceType !== "billing_batch")) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const out = await accrueReward({
    admin,
    staffId: staff.id,
    sourceType,
    sourceId,
    reverse: body.reverse === true,
  });
  if (out.error) return NextResponse.json({ error: out.error }, { status: 400 });
  return NextResponse.json({ ok: true, results: out.results });
}
