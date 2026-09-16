// 화주 웹 푸시 — **브라우저가 부르는 한 줄** (화주포털 B장)
//
// 🔴 **원칙 53 번 패턴이다.** 견적·배차 상태를 바꾸는 화면이 셋인데, 그 셋을 전부
//    서버 API 로 옮기지 않고 **DB update 가 성공한 직후 이 함수를 한 번 부른다.**
//
// 🔴 **`await` 하지 말 것**(fire-and-forget) — 알림이 느리다고 담당자의 상태 변경이
//    멈추면 안 된다. 실패해도 원래 동작에는 아무 영향이 없어야 한다.
//    ⚠️ 서버 라우트 안(`app/api/**`)에서는 반대다 — 거기서는 **`lib/portalPushNotify.ts`
//    의 `notifyPortalPush()` 를 직접 `await`** 해야 한다(서버리스 함수는 응답 뒤 얼어붙는다).

import type { PortalPushEvent } from "@/lib/portalPushNotify";

/** 어느 표에서 회사를 다시 찾을지. 🔴 **회사 id 를 직접 보내지 않는다**(원칙 30번). */
export type PortalPushSource = "quote" | "dispatch" | "invoice";

export function notifyPortalPush(
  source: PortalPushSource,
  id: string,
  event: PortalPushEvent
): void {
  try {
    // 🔴 `void` 로 띄운다 — 부르는 쪽은 브라우저라 이 약속이 끝나지 않아도 괜찮다.
    void fetch("/api/admin/notify-portal-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ source, id, event }),
    }).catch(() => undefined);
  } catch {
    // 🔴 여기까지 와도 원래 동작은 계속되어야 한다.
  }
}

/**
 * 배차 상태가 바뀌었을 때의 한 줄. 🔴 **상태 → 사건 매핑은 여기 한 곳이다** —
 * 이 함수를 부르는 곳이 **넷**이라(배차 상세의 확정 버튼 · 상태 드롭다운 ·
 * 상차/하차 체크박스, 배차 목록의 상태 드롭다운 · 원칙 53번) 화면마다 적으면
 * 「목록에서 바꾸면 알림이 오고 상세에서 바꾸면 안 오는」 상태가 된다.
 *
 * 🔴 **바뀌지 않았으면 안 보낸다** — 같은 값을 다시 고르는 일이 흔하고, 그때마다
 *    화주 폰이 울리면 알림 자체를 꺼 버린다.
 * 🔴 **수동 재발송 버튼에서 부르지 말 것** — 거기는 담당자가 **문자**를 다시 보내는
 *    자리다. 며칠 뒤 눌러도 「배차가 확정되었습니다」 푸시가 또 간다.
 * ⚠️ **「운송완료」·「문제발생」은 일부러 없다** — 사용자 확정 범위가 견적·배차·정산
 *    이고, 하차완료가 곧 운송완료라 두 번 울린다.
 */
const PORTAL_PUSH_BY_DISPATCH_STATUS: Record<string, PortalPushEvent> = {
  배차확정: "dispatch_confirmed",
  상차완료: "pickup_completed",
  하차완료: "delivery_completed",
};

export function notifyPortalPushForDispatchStatus(
  dispatchId: string,
  nextStatus: string,
  prevStatus?: string | null
): void {
  if (prevStatus !== undefined && nextStatus === prevStatus) return;
  const event = PORTAL_PUSH_BY_DISPATCH_STATUS[nextStatus];
  if (!event) return;
  notifyPortalPush("dispatch", dispatchId, event);
}
