// ─────────────────────────────────────────────────────────────────────────────
// 고객 접수 알림 — **관리자 쪽 정의처** (38차 A장)
//
// 알릴 접수는 **셋뿐**이다: 견적문의 · 화주신청 · 발주요청.
// 🔴 **여기가 관리자 라벨·경로의 유일한 정의처다** — 화면 파일에 다시 적지 말 것.
//    세 곳이 각자 적으면 배지와 알림이 갈린다(34차 `unlinkedWonQuotes` ·
//    35차 `marginCalc` · 36차 `receivableCalc` 와 같은 결).
//
// 🔴 **소리·감지·탭 제목은 여기 없다 — `lib/alertCore.ts` 다.** 화주포털이 같은 것을
//    쓰기 때문에 옮긴 것이다(2026-09-16). 🔴 **여기로 되가져오지 말 것** — 되가져오면
//    포털이 `admin` 이름의 모듈을 import 하게 되고, 다음 사람이 그것을 보고
//    포털용 사본을 따로 만든다.
//
// 🔴 **「운송 중 문제 발생」을 여기에 더하지 말 것**(사용자 확정 2026-09-16) —
//    그것은 고객 접수가 아니라 내부 사건이라 성격이 다르다.
//
// ⚠️ **`approvedQuotes`(견적 승인)는 2026-09-16 에 들어왔다.** 그전에는 *「접수가 아니라
//    담당자가 이어서 할 일이라 소리로 부를 일이 아니다」*로 빼 뒀는데 **사용자가 뒤집었다**
//    (*「화주가 견적 승인시에도 알림이 필요하다」*). 🔴 **그 옛 문장을 근거로 지우지 말 것.**
//    뒤집힌 근거도 분명하다 — 화주가 승인하면 그때부터 **배차 시계가 돌기 시작**하므로
//    담당자가 자리에 없으면 늦어진다. 새 접수와 급한 정도가 같다.
// ─────────────────────────────────────────────────────────────────────────────

import { collectRises, type AlertRise } from "@/lib/alertCore";

/** 🔴 `components/TopNav.tsx` 의 `counts` 키와 **같은 이름**이다 — 바꾸면 감지가 끊긴다. */
export type IntakeKind = "portalRequests" | "publicQuotes" | "applications" | "approvedQuotes";

/**
 * 🔴 경로는 **실측값**이다(2026-09-16).
 *    38차 지시서는 `/admin/inquiries`·`/admin/customer-requests` 라 적었는데
 *    **둘 다 없는 경로다.** 지시서에서 옮겨 적지 말고 `app/admin/` 을 볼 것.
 */
// 🔴 **말을 여기서 완성한다 — 부르는 쪽에서 `새 {label}` 로 조립하지 말 것.**
//    조립하면 「새 견적 승인」처럼 어색해지고, 무엇보다 **조립하는 곳이 둘**이라
//    (`TopNav` 배너 · `lib/pushNotify.ts` 푸시) 한쪽만 고치면 화면과 폰의 말이 갈린다.
//    ⚠️ 2026-09-16 에 `label` 에서 `title` 로 바꿨다 — 「화주 견적 승인」이 `새` 를
//    앞에 붙일 수 없는 첫 항목이었다.
export const INTAKE_ALERTS: Record<IntakeKind, { title: string; href: string }> = {
  // 🔴 발주요청이 맨 앞이다 — 기존 화주가 실제 운송을 의뢰하는 것이라 답이 늦으면
  //    바로 돈이 걸린다(사용자 원문: *「발주요청이 가장 급하다」*).
  portalRequests: { title: "새 발주요청", href: "/admin/portal-requests" },
  publicQuotes: { title: "새 견적문의", href: "/admin/public-quotes" },
  applications: { title: "새 화주신청", href: "/admin/applications" },
  // 🔴 이것만 「접수」가 아니라 **이미 있던 화주가 답을 준 것**이다 — 그래도 급하기는
  //    마찬가지라 같은 줄에 뒀다(위 ⚠️ 참고).
  //    ⚠️ **세는 값은 「수주인데 운송오더가 없는 견적」**이라(`lib/unlinkedWonQuotes.ts`)
  //    담당자가 견적 상세에서 직접 「수주」로 바꿔도 같이 울린다. 🔴 **그것을 막겠다고
  //    화주 승인분만 세도록 고치지 말 것** — 그 수는 `TopNav` 배지와 같은 값이어야 하고
  //    (38차 규칙), 배지는 「오더를 만들어야 할 건」을 세는 것이 맞다.
  //    🟢 **웹 푸시는 화주 승인일 때만 나간다**(`app/api/customer/approve-quote/route.ts`) —
  //    담당자가 스스로 바꾼 것까지 폰으로 부를 이유는 없다.
  approvedQuotes: { title: "화주 견적 승인", href: "/admin/quotes" },
};

export const INTAKE_KINDS: IntakeKind[] = [
  "portalRequests",
  "publicQuotes",
  "applications",
  "approvedQuotes",
];

export type IntakeCounts = Record<IntakeKind, number>;
export type IntakeRise = AlertRise<IntakeKind>;

/** 늘어난 접수만 고른다. 규칙 셋은 `lib/alertCore.ts` 의 `collectRises()` 한 곳에 있다. */
export function collectIntakeRises(
  prev: Partial<IntakeCounts>,
  next: IntakeCounts
): IntakeRise[] {
  return collectRises(INTAKE_KINDS, prev, next);
}
