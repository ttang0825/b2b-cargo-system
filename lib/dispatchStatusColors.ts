// "접수중"은 배차 등록 시 항상 시작하는 초기 상태 — 아직 내부차주/외부정보망 중
// 어느 쪽으로도 실제 배차가 확정되지 않은 상태. "배차확정"으로 넘어가려면
// 반드시 상세화면의 전용 확정 절차(내부차주 확인 또는 외부정보망 1곳 지정+차주정보
// 입력)를 거쳐야 함 — 이 목록의 순서로 곧바로 다음 상태를 표시하는 화면(드롭다운
// 등)에서는 "접수중"을 선택 옵션에서 제외하고 별도 확정 UI로 유도할 것
export const DISPATCH_STATUS_OPTIONS = [
  "접수중",
  "배차확정",
  "상차완료",
  "하차완료",
  "운송완료",
  "문제발생",
] as const;

/**
 * 🔴 **`취소` 는 이 배열에 넣지 않았다**(2026-09-17).
 *
 *    상태 드롭다운에서 고를 수 있게 되면 **사유를 못 받는다** — 취소는 배차 상세의
 *    「배차 취소」 버튼 + 사유 모달로만 갈 수 있어야 한다. 이 배열을 쓰는 곳이
 *    **드롭다운 셋뿐**이라(배차 상세 1 · 배차 목록 2) 여기에 안 넣는 것으로 막힌다.
 *    🔴 **「목록에 없으니 빠진 것」으로 보고 더하지 말 것.**
 *
 *    ⚠️ DB CHECK 는 **7종**이다(`취소` 포함) — 화면 상수와 일부러 다르다.
 *    값 문자열은 `lib/dispatchCancel.ts` 의 `DISPATCH_STATUS_CANCELLED` 가 정의처다.
 */

type StatusColor = { bg: string; text: string };

export const DISPATCH_STATUS_COLORS: Record<string, StatusColor> = {
  접수중: { bg: "#F3F4F6", text: "#6B7280" },
  배차확정: { bg: "#E0E7FF", text: "#4F46E5" },
  상차완료: { bg: "#DBEAFE", text: "#2563EB" },
  하차완료: { bg: "#DDD6FE", text: "#6D28D9" },
  운송완료: { bg: "#D1FAE5", text: "#059669" },
  문제발생: { bg: "#FEE2E2", text: "#B91C1C" },
  // 🔴 취소는 **끝난 건이라 가장 조용해야 한다** — 빨강으로 칠하지 말 것
  //    (PR #167 이 견적 상태 `실패` 에서 내린 것과 같은 판단이다).
  취소: { bg: "#F3F4F6", text: "#9CA3AF" },
};

export function getDispatchStatusColor(status: string): StatusColor {
  return DISPATCH_STATUS_COLORS[status] || { bg: "#F3F4F6", text: "#6B7280" };
}

// 배차상태가 바뀌면 연결된 운송오더(orders.status)도 같이 따라가도록 하는 매핑
export const DISPATCH_TO_ORDER_STATUS: Record<string, string> = {
  접수중: "배차중",
  배차확정: "배차완료",
  상차완료: "운송중",
  하차완료: "운송중",
  운송완료: "운송완료",
  문제발생: "배차중",
  // 🔴 취소하면 오더는 **`접수`** 로 되돌아간다 — 그래야 「+ 배차 등록」 후보
  //    조건(`접수`·`배차중`)에 들어와 **다시 배차를 걸 수 있다.**
  //    ⚠️ `배차중` 으로 되돌리면 후보에는 들어오지만 담당자가 목록에서
  //    「배차가 진행 중」으로 읽는다 — 실제로는 아무 배차도 없다.
  //    🟢 `orders_status_check` 에 `접수` 가 실재한다(실측 ㉖-b).
  취소: "접수",
};
