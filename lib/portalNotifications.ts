// 화주포털 하위메뉴 알림 배지용 공용 헬퍼. 계정별 서버 저장 대신 브라우저
// localStorage 기반 "마지막 확인 시각"을 씀 — `/customer/announcements`가 이미
// 이 방식(안읽음 = created_at > 마지막 확인 시각)을 쓰고 있어서 그대로 재사용함
// (계정을 다른 기기/브라우저에서 열면 다시 안읽음으로 보이는 건 기존과 동일한
// 한계 — 새로 도입하는 제약이 아님).

const LAST_SEEN_PREFIX = "wecarry_portal_last_seen_";

// 공지사항 페이지가 이 세션 이전부터 써오던 키 — 이름을 그대로 유지해서
// 기존에 저장된 "마지막 확인 시각" 값이 끊기지 않게 함
export const ANNOUNCEMENTS_LAST_SEEN_KEY = "wecarry_announcements_last_seen";

/**
 * 🔴 공지의 「새 글」 판정 기준 컬럼 — **`created_at` 이 아니라 `announced_at` 이다**
 *    (2026-09-17, 공지 수정 기능과 함께 바뀌었다).
 *
 * 왜 옮겼나 — 수정 기능이 생기기 전에는 공지가 만들어지는 순간이 곧 알릴 순간이라
 * `created_at` 으로 충분했다. 이제 담당자가 공지를 고칠 수 있게 되면서, **오타 하나
 * 고쳤는데 모든 화주에게 새 공지로 뜨는** 일을 막아야 한다. 그래서 담당자가 저장
 * 화면의 「화주에게 다시 알림」(기본 꺼짐)으로 고르고, 켤 때만 이 칸이 갱신된다.
 *
 * 🔴 **`created_at` 이나 `updated_at` 으로 되돌리지 말 것** — 앞엣것은 그 체크를
 *    무의미하게 만들고, 뒤엣것은 체크를 켜지 않아도 새 공지로 뜨게 만든다.
 * 🔴 **이 상수를 쓰는 곳이 셋이다**(사이드바 배지 · 홈 「안 읽음 N」 · 목록 NEW 알약).
 *    한 곳만 고치면 「배지는 올라갔는데 목록엔 NEW 가 없는」 상태가 된다.
 */
export const ANNOUNCEMENT_NOTICE_FIELD = "announced_at";

export function getLastSeen(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key === "announcements" ? ANNOUNCEMENTS_LAST_SEEN_KEY : LAST_SEEN_PREFIX + key);
}

export function markSeen(key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    key === "announcements" ? ANNOUNCEMENTS_LAST_SEEN_KEY : LAST_SEEN_PREFIX + key,
    new Date().toISOString()
  );
}

// 발주요청(portal_order_requests)은 화주가 직접 등록도 하는 테이블이라 "마지막
// 확인 시각"만으로는 안 됨(방금 본인이 등록한 대기중 건까지 안읽음으로 잡힘) —
// 대신 "상태가 대기중에서 벗어난 건 중 아직 확인 안 한 id" 집합을 기록함
const REQUEST_ACK_KEY = "wecarry_portal_request_acknowledged_ids";

export function getAcknowledgedRequestIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REQUEST_ACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function acknowledgeRequestIds(ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) return;
  const merged = new Set([...getAcknowledgedRequestIds(), ...ids]);
  localStorage.setItem(REQUEST_ACK_KEY, JSON.stringify([...merged]));
}
