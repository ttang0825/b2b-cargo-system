/**
 * 하차 도착구분(당착/내착) 표기 — 관리자 화면 표기의 유일 정의처.
 *
 * 🔴 **`portal_order_requests.dropoff_arrival_type` 이 값의 정본이고
 *    `requested_dropoff_at` 의 23:59 는 자리 채움이다**(27차 리뷰 4라운드).
 *    당착(`same_day`) = 상차 당일 도착 · 내착(`next_day`) = 다음 날 도착이며 **시각은 무관하다.**
 *
 * 🔴 **같은 값에는 같은 말을 쓴다.** 화주요청 목록과 견적 폼이 다른 문구를 쓰면 담당자가
 *    두 화면에서 같은 것을 다르게 읽는다(원칙 13번과 같은 결). 그래서 문자열을 여기 모았다.
 *
 * ⚠️ **28차가 실측한 것** — 견적 폼의 `DateTimePicker` 시간 드롭다운이 30분 단위라
 *    `23:59` 가 선택지에 없다. 그래서 프리필에서 **날짜만 채워지고 시각이 빈 값으로
 *    떨어진다.** 오독 위험은 없지만(23:59 를 요청 시각으로 읽을 일이 없다), 담당자가
 *    특이사항을 안 읽으면 **빈 시각을 임의로 채운다** — 배차가 틀어지는 종류다.
 *    🔴 그래서 하차 일시 옆에 이 배지를 그린다. **시각 칸은 비운 채로 두는 것이 맞다.**
 *
 * 🔴 **`DateTimePicker` 를 고치지 말 것** — 시간 드롭다운에 `23:59`나 「시각 무관」을
 *    넣는 안은 공유 컴포넌트라 관리자 전 화면에 영향이 간다.
 */
export type DropoffArrivalType = "same_day" | "next_day";

/** 「당착」 / 「내착」 */
export function arrivalTypeLabel(v: string | null | undefined): string | null {
  if (v === "same_day") return "당착";
  if (v === "next_day") return "내착";
  return null;
}

/** 배지 옆에 붙는 말. 시각이 비어 있는 이유를 담당자가 알아야 한다. */
export const ARRIVAL_TIME_FREE_NOTE = "시각 무관";

/** 왜 시각이 비었는지 — 견적 폼에서 배지 아래에 그린다. */
export function arrivalTypeHint(v: string | null | undefined): string | null {
  if (v === "same_day") return "상차 당일 도착 · 화주가 시각을 지정하지 않았습니다";
  if (v === "next_day") return "상차 다음 날 도착 · 화주가 시각을 지정하지 않았습니다";
  return null;
}
