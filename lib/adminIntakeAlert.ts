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
// 🔴 **`approvedQuotes`(수주인데 오더 없는 건)도 여기에 없다** — 같은 배지 state 에
//    있지만 접수가 아니라 **담당자가 이어서 할 일**이다. 새 손님이 온 것이 아니므로
//    소리로 부를 일이 아니다.
// ─────────────────────────────────────────────────────────────────────────────

import { collectRises, type AlertRise } from "@/lib/alertCore";

/** 🔴 `components/TopNav.tsx` 의 `counts` 키와 **같은 이름**이다 — 바꾸면 감지가 끊긴다. */
export type IntakeKind = "portalRequests" | "publicQuotes" | "applications";

/**
 * 🔴 경로는 **실측값**이다(2026-09-16).
 *    38차 지시서는 `/admin/inquiries`·`/admin/customer-requests` 라 적었는데
 *    **둘 다 없는 경로다.** 지시서에서 옮겨 적지 말고 `app/admin/` 을 볼 것.
 */
export const INTAKE_ALERTS: Record<IntakeKind, { label: string; href: string }> = {
  // 🔴 발주요청이 맨 앞이다 — 기존 화주가 실제 운송을 의뢰하는 것이라 답이 늦으면
  //    바로 돈이 걸린다(사용자 원문: *「발주요청이 가장 급하다」*).
  portalRequests: { label: "발주요청", href: "/admin/portal-requests" },
  publicQuotes: { label: "견적문의", href: "/admin/public-quotes" },
  applications: { label: "화주신청", href: "/admin/applications" },
};

export const INTAKE_KINDS: IntakeKind[] = ["portalRequests", "publicQuotes", "applications"];

export type IntakeCounts = Record<IntakeKind, number>;
export type IntakeRise = AlertRise<IntakeKind>;

/** 늘어난 접수만 고른다. 규칙 셋은 `lib/alertCore.ts` 의 `collectRises()` 한 곳에 있다. */
export function collectIntakeRises(
  prev: Partial<IntakeCounts>,
  next: IntakeCounts
): IntakeRise[] {
  return collectRises(INTAKE_KINDS, prev, next);
}
