// POST /api/admin/reward/intro — 「리워드 이용 안내」 문자의 **확인창 미리보기**
//
// 사용자 요청(2026-09-22): *"포인트 지급 안내 메세지를 보내고 싶다. 고객 첫거래후
//   전화로 계정등록을 유도할 생각이다. 계정등록후 계정정보 안내 문자를 보낸후 이벤트
//   포인트 사용안내 문자도 보내고 싶다. 위치는 화주 상세 기업고객 리워드에 문자보내기
//   기능이 있으면 되고 간단한 내용으로 전달하면 될것 같다."*
//
// 🚨 **이 라우트는 문자를 보내지 않는다.** 문구·수신번호만 만들어 돌려주고, 실제 발송은
//    담당자가 확인창에서 [발송]을 눌러야 일어난다(리워드 문자 넷이 전부 같은 자세다).
//    🔴 **`sendSmsWithLog` 를 이 라우트에 들이지 말 것.**
//
// 🔴 **`/api/admin/reward/notify` 와 합치지 말 것** — 저쪽은 `company_id` 와
//    `dispatch_id` 를 가르는 것이 일이고 **금액**을 센다. 이것은 금액을 세지 않고
//    제도만 알린다(그래서 「알릴 숫자가 없으면 안 만든다」가 여기엔 없다).
//
// 🔴 `force-dynamic` + `rewardGuard()`(→ `createServiceClient`) 둘 다(원칙 21번).

import { NextResponse } from "next/server";
import { rewardGuard, loadActiveCampaign } from "@/lib/rewardServer";
import { buildRewardIntroSmsPreview } from "@/lib/rewardNotify";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 🔴 **재직 직원이면 role 무관이다** — 안내는 관리자 전용이 아니다(설정·조정만
  //    관리자다). 화주 상세의 「적립 안내 문자」와 같은 기준이다.
  const g = await rewardGuard();
  if (g.error) return g.error;
  const { admin } = g;

  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const companyId = typeof body.company_id === "string" ? body.company_id : "";
  if (!companyId) {
    return NextResponse.json({ error: "company_id가 필요합니다." }, { status: 400 });
  }

  const { campaign, error: cErr } = await loadActiveCampaign(admin);
  if (cErr) return NextResponse.json({ error: cErr }, { status: 400 });
  // 🔴 **진행 중인 캠페인이 없으면 만들지 않는다** — 조건(요율·최소 사용액·기간)을
  //    캠페인에서 읽으므로, 없으면 적을 내용 자체가 없다.
  if (!campaign) return NextResponse.json({ preview: null });

  const preview = await buildRewardIntroSmsPreview({
    admin,
    campaign: campaign as any,
    companyId,
    // 🔴 원장에 줄이 생기지 않는 문자라 열쇠가 **화주 id** 다(적립 현황 안내와 같다).
    //    ⚠️ `sms_logs.related_id` 에는 FK 가 없다(다형 참조).
    relatedId: companyId,
  });

  return NextResponse.json({ preview });
}
