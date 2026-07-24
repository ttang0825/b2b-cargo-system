// 화주신청/공개문의처럼 anon-locked 테이블(Realtime 구독 불가, 15초 폴링만 가능)은
// 관리자가 방금 처리해도 상단메뉴 배지가 다음 폴링까지 그대로 남아있는 문제가 있었음.
// 처리 직후 이 이벤트를 쏘면 TopNav가 폴링을 기다리지 않고 바로 배지 개수를 다시 불러온다.
const EVENT_NAME = "admin-badges-refresh";

export function notifyBadgeRefresh() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function onBadgeRefresh(handler: () => void) {
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
