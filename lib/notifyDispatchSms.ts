import type { SmsPreview } from "@/components/SmsConfirmModal";

// 배차확정은 화면(anon 키)이 dispatches를 직접 update하는 4곳
// (배차 상세의 확정 버튼·상태 드롭다운·체크박스, 배차 목록의 상태 드롭다운)에
// 흩어져 있어, DB update가 성공한 직후 이 함수로 서버에서 문구·수신번호
// 미리보기를 받아온다. 실제 발송은 여기서 하지 않음 — 호출한 쪽이 반환값을
// <SmsConfirmModal>에 넘겨 admin이 확인·수정한 뒤 "발송"을 눌러야 실제로 나감
// (PR #73 리뷰 반영). 상태값이 SMS 대상이 아니면(운송완료 등) null을 반환하므로
// 그 경우 모달을 띄우지 않으면 됨.
// 🔴 **상차완료·하차완료는 2026-09-18 에 빠졌다**(사용자 확정: *「알림으로만 충분하다」*).
//    화주는 운송관리 알림(화면 배너 + 웹 푸시)으로 받는다 — HANDOFF §5-17.
//    🔴 **다시 넣지 말 것.** 서버 라우트도 그 event 를 400 으로 거절한다.
const EVENT_BY_STATUS: Record<string, string> = {
  배차확정: "dispatch_confirmed",
};

export async function fetchDispatchSmsPreview(dispatchId: string, status: string): Promise<SmsPreview | null> {
  const event = EVENT_BY_STATUS[status];
  if (!event) return null;
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
