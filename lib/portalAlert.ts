// ─────────────────────────────────────────────────────────────────────────────
// 화주포털 알림 — **포털 쪽 정의처** (2026-09-16 · 사용자 요청 「화주포털에도 적용」)
//
// 🔴 **38차 지시서는 「화주포털은 한 줄도 건드리지 않는다」였다.** 그 뒤에 사용자가
//    *「이 알림기능을 화주포털에도 적용할 수 있나?」* 로 범위를 넓혔고 **A장만 먼저**로
//    확정했다(2026-09-16). 🔴 **지시서의 그 금지를 근거로 이 파일을 지우지 말 것.**
//
// 🔴 **여기는 「새 접수」가 아니다.** 관리자는 *새 손님이 왔다*를 알리지만, 포털은
//    *내 건에 새 소식이 있다*를 알린다 — 신호가 `updated_at > 마지막으로 본 시각` 이라
//    **새로 생긴 것과 고쳐진 것을 가리지 않는다.** 그래서 라벨이 「새 견적」이 아니라
//    **「견적 업데이트」**다. 🔴 **「새 …」로 바꾸지 말 것** — 담당자가 기존 견적의
//    메모 한 줄만 고쳐도 뜨는 자리라 거짓말이 된다.
//
// 🔴 **배지와 같은 수를 쓴다**(`CustomerPortalShell` 의 `counts`) — 따로 세면
//    「배지는 1인데 배너는 2」가 된다.
// ─────────────────────────────────────────────────────────────────────────────

import { collectRises, type AlertRise } from "@/lib/alertCore";

/** 🔴 `app/customer/CustomerPortalShell.tsx` 의 `counts` 키와 **같은 이름**이다. */
export type PortalAlertKind = "quotes" | "dispatches" | "invoices" | "announcements";

/**
 * 🔴 경로는 **포털 메뉴의 실제 경로**다. 「발주 요청」(`/customer/request`)은 여기 없다 —
 *    그 화면은 폼 하나이고 담당자가 무엇을 하든 결과는 **「견적 확인」에** 뜬다
 *    (27차 리뷰 3라운드 확정, 그래서 배지도 안 단다). 🔴 더하지 말 것 — 눌러도 볼 것이 없다.
 */
export const PORTAL_ALERTS: Record<PortalAlertKind, { title: string; href: string }> = {
  // 🔴 견적이 맨 앞이다 — 화주가 답해야 진행되는 유일한 것이라(견적 승인) 가장 급하다.
  quotes: { title: "견적 업데이트", href: "/customer/quotes" },
  dispatches: { title: "배차·운송 업데이트", href: "/customer/dispatches" },
  invoices: { title: "정산 업데이트", href: "/customer/invoices" },
  // 공지는 유일하게 **새로 생기기만** 하는 것이라(조회 조건이 `created_at`) 「새」가 맞다.
  announcements: { title: "새 공지사항", href: "/customer/announcements" },
};

export const PORTAL_ALERT_KINDS: PortalAlertKind[] = [
  "quotes",
  "dispatches",
  "invoices",
  "announcements",
];

export type PortalAlertCounts = Record<PortalAlertKind, number>;

/** 늘어난 것만 고른다. 규칙 셋은 `lib/alertCore.ts` 의 `collectRises()` 한 곳에 있다. */
export function collectPortalRises(
  prev: Partial<PortalAlertCounts>,
  next: PortalAlertCounts
): AlertRise<PortalAlertKind>[] {
  return collectRises(PORTAL_ALERT_KINDS, prev, next);
}
