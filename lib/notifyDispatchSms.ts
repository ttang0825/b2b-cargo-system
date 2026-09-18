import type { SmsPreview } from "@/components/SmsConfirmModal";

// 배차확정은 화면(anon 키)이 dispatches를 직접 update하는 4곳(배차 상세의 확정
// 버튼·상태 드롭다운·체크박스, 배차 목록의 상태 드롭다운)에 흩어져 있어, DB update가
// 성공한 직후 이 함수로 서버에서 문구·수신번호 미리보기를 받아온다. 실제 발송은
// 여기서 하지 않음 — 호출한 쪽이 반환값을 <SmsConfirmModal>에 넘겨 admin이 확인·수정한
// 뒤 "발송"을 눌러야 실제로 나감(PR #73 리뷰 반영).
//
// 🔴 **상차완료·하차완료는 2026-09-18 에 빠졌다**(사용자 확정: *「알림으로만 충분하다」*).
//    화주는 운송관리 알림(화면 배너 + 웹 푸시)으로 받는다 — HANDOFF §5-17.
//    🔴 **다시 넣지 말 것.** 서버 라우트도 그 event 를 400 으로 거절한다.
//
// 🔴 **웹 푸시(`notifyPortalPushForDispatchStatus`)를 이 안으로 옮기지 말 것.**
//    이 함수는 **수동 재발송 버튼도** 부른다(배차 상세 「문자 발송」 카드) — 옮기면
//    며칠 뒤에 문자를 다시 보낼 때 화주 폰에 푸시가 **또** 간다. 반대로 확인창 안으로
//    넣으면 담당자가 「건너뛰기」를 누를 때 **푸시까지 안 간다.** HANDOFF §5-17.

/** 배차확정에서 나가는 두 통 — 🔴 **차주가 먼저다**(고객 문의 전화에 응대가 되려면) */
export const DISPATCH_CONFIRMED_EVENTS = ["dispatch_confirmed", "dispatch_confirmed_customer"] as const;
export type DispatchSmsEvent = (typeof DISPATCH_CONFIRMED_EVENTS)[number];

/** 상태값 → 그 상태에서 자동으로 띄울 문자들. 없는 상태면 빈 배열이다. */
const EVENTS_BY_STATUS: Record<string, readonly DispatchSmsEvent[]> = {
  배차확정: DISPATCH_CONFIRMED_EVENTS,
};

async function fetchOne(dispatchId: string, event: DispatchSmsEvent): Promise<SmsPreview | null> {
  try {
    const res = await fetch("/api/admin/notify-dispatch-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dispatch_id: dispatchId, event }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * 수동 버튼용 — **한 통만** 띄운다(배차 상세 「문자 발송」 카드의 두 버튼).
 *
 * 🔴 자동 흐름과 달리 **큐를 만들지 않는다** — 담당자가 「차주에게만 다시」 또는
 *    「고객에게만 다시」를 고른 것이라, 한 통을 눌렀는데 두 통이 뜨면 안 보내려던
 *    쪽까지 확인창을 지나가게 된다.
 */
export async function fetchDispatchSmsPreviewByEvent(
  dispatchId: string,
  event: DispatchSmsEvent
): Promise<SmsPreview | null> {
  return fetchOne(dispatchId, event);
}

/**
 * 자동 흐름용 — 그 상태에서 나갈 문자들을 **차례대로** 돌려준다.
 *
 * 🔴 **배차확정은 두 통이라 배열이다**(차주 → 고객). 호출부는 이 배열을 state 에 담고
 *    앞에서 하나씩 꺼내 확인창에 넘긴다 — 발송이든 건너뛰기든 **다음 창**으로 간다.
 * 🔴 **`Promise.all` 로 병렬로 받는다** — 두 통 모두 **읽기만** 하는 미리보기라
 *    순서가 결과에 영향을 주지 않는다. 화면에 뜨는 순서는 아래 `filter` 가 지킨다.
 * 🔴 **미리보기를 못 받은 통은 빠진다** — 그 자리에 빈 확인창을 띄우면 담당자가
 *    빈 문자를 보낼 수 있다. 대신 **호출부가 「몇 통이 준비됐는지」를 보고 알린다.**
 */
export async function fetchDispatchSmsPreview(dispatchId: string, status: string): Promise<SmsPreview[]> {
  const events = EVENTS_BY_STATUS[status];
  if (!events || events.length === 0) return [];
  const results = await Promise.all(events.map((e) => fetchOne(dispatchId, e)));
  return results.filter((r): r is SmsPreview => r != null);
}

/** 자동 흐름에서 이 상태가 문자를 띄우는가 — 화면이 「준비 실패」를 알릴 때 쓴다 */
export function dispatchSmsEventCount(status: string): number {
  return EVENTS_BY_STATUS[status]?.length ?? 0;
}
