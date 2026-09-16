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

/**
 * 🔴 `app/customer/CustomerPortalShell.tsx` 의 `counts` 키와 **같은 이름**이다.
 *
 * ⚠️ **배지에 세는 것과 알림으로 부르는 것이 갈렸다**(2026-09-16) — 아래 두 타입을
 *    보라. `invoices`·`announcements` 는 **배지에는 남고 알림에서만 빠졌다.**
 */
export type PortalCountKind = "quotes" | "dispatches" | "invoices" | "announcements";

/**
 * 🔴 **알림으로 부르는 종류 — 둘뿐이다**(사용자 확정 2026-09-16).
 *
 *    ① `invoices` 를 뺀 이유 — *「화주포털 알림중 정산관련해서는 알림이 안뜨는게
 *       좋겠다」*(예로 든 것이 **세금계산서 발행완료 · 화주입금완료 · 차주지급완료**).
 *       포털 알림의 신호는 `invoices.updated_at` 하나라 **그 셋을 골라낼 수가 없다** —
 *       담당자가 정산 건의 어느 칸을 만져도 똑같이 울린다. 그래서 종류째 뺐다.
 *    ② `announcements` 를 뺀 이유 — *「화주포탈은 상차완료, 하차완료, 공지사항 알림도
 *       빼자. 견적을 받을때, 배차완료, 운송완료 시에만 알림이 가게 설정」*(같은 날).
 *       ⚠️ **그 앞 줄에 「공지는 유일하게 새로 생기기만 하는 것이라 「새」가 맞다」고
 *       적혀 있었는데 그것은 「라벨이 맞다」는 말이지 「알려야 한다」는 말이 아니다.**
 *       🔴 그 문장을 근거로 되살리지 말 것.
 *
 *    🔴 **되살리지 말 것** — 정산을 되살리려면 「어떤 변경일 때만 부를지」를 먼저
 *    정해야 하고, 그것은 `updated_at` 이 아니라 사건별 신호를 새로 만드는 일이다.
 *    ⚠️ **웹 푸시에서도 같은 것들을 함께 없앴다**(`lib/portalPushNotify.ts`) —
 *    화면 안 배너만 끄고 푸시를 남기면 **폰으로는 오는데 화면에는 안 뜨는** 상태가 된다.
 *    🟢 **배지는 넷 그대로다** — 정산·공지 화면에 볼 것이 생긴 것은 사실이라 수는 보여준다.
 */
export type PortalAlertKind = "quotes" | "dispatches";

/**
 * 🔴 경로는 **포털 메뉴의 실제 경로**다. 「발주 요청」(`/customer/request`)은 여기 없다 —
 *    그 화면은 폼 하나이고 담당자가 무엇을 하든 결과는 **「견적 확인」에** 뜬다
 *    (27차 리뷰 3라운드 확정, 그래서 배지도 안 단다). 🔴 더하지 말 것 — 눌러도 볼 것이 없다.
 */
export const PORTAL_ALERTS: Record<PortalAlertKind, { title: string; href: string }> = {
  // 🔴 견적이 맨 앞이다 — 화주가 답해야 진행되는 유일한 것이라(견적 승인) 가장 급하다.
  quotes: { title: "견적 업데이트", href: "/customer/quotes" },
  dispatches: { title: "배차·운송 업데이트", href: "/customer/dispatches" },
};

export const PORTAL_ALERT_KINDS: PortalAlertKind[] = ["quotes", "dispatches"];

/**
 * 🔴 **배지가 세는 값이라 `invoices`·`announcements` 가 들어 있다** —
 * 알림 종류(`PortalAlertKind`)와 다르다. **둘을 같은 타입으로 합치지 말 것.**
 */
export type PortalAlertCounts = Record<PortalCountKind, number>;

/** 늘어난 것만 고른다. 규칙 셋은 `lib/alertCore.ts` 의 `collectRises()` 한 곳에 있다. */
export function collectPortalRises(
  prev: Partial<PortalAlertCounts>,
  next: PortalAlertCounts
): AlertRise<PortalAlertKind>[] {
  return collectRises(PORTAL_ALERT_KINDS, prev, next);
}
