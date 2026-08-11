// 배차확정/상차완료/하차완료는 화면(anon 키)이 dispatches를 직접 update하는 4곳
// (배차 상세의 확정 버튼·상태 드롭다운·체크박스, 배차 목록의 상태 드롭다운)에
// 흩어져 있어, DB update가 성공한 직후 이 함수로 서버 API를 fire-and-forget
// 호출한다. 절대 await하지 말 것 — 실패해도 배차 상태변경 자체(메인 액션)에는
// 영향이 없어야 한다.
const EVENT_BY_STATUS: Record<string, string> = {
  배차확정: "dispatch_confirmed",
  상차완료: "pickup_completed",
  하차완료: "delivery_completed",
};

export function notifyDispatchStatusSms(dispatchId: string, status: string) {
  const event = EVENT_BY_STATUS[status];
  if (!event) return;
  fetch("/api/admin/notify-dispatch-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dispatch_id: dispatchId, event }),
  }).catch(() => {});
}
