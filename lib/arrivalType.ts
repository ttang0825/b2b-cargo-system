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

/**
 * 🔴 당착·내착일 때 하차 일시에 넣는 **자리 채움 시각**이다 — 뜻(시각 무관)을 담는 것은
 *    도착구분 쪽이고 이 시각은 「그 날 안에」를 나타낼 뿐이다.
 *
 * ⚠️ **한동안 세 파일에 각자 `"23:59"` 로 적혀 있었다**(포털 발주 폼 · 포털 날짜 부품 ·
 *    그리고 36차 PR 2 가 견적 폼에 같은 칩을 넣으면서 넷이 될 뻔했다). 값을 하나라도
 *    다르게 고치면 **한 화면에서 고른 당착이 다른 화면에서 당착으로 안 읽힌다.**
 * 🔴 **이 파일은 `.pv2-*` 스코프가 아니라 관리자·포털이 함께 쓸 수 있다** — 그래서
 *    포털 부품이 아니라 여기에 둔다(원칙 57번을 어기지 않는 자리다).
 */
export const ARRIVAL_FILLER_TIME = "23:59";

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

/**
 * 특이사항에 남기는 한 줄 — 🔴 **`quotes` 에는 도착구분 컬럼이 없다**(28차 결정 1).
 * 이 줄이 없으면 「당착」을 골랐다는 사실이 견적 → 오더 → 배차로 이어지지 않는다.
 *
 * 🔴 **문구를 화면마다 다시 적지 말 것** — 견적 전환(포털 요청 프리필)과 견적 폼의
 *    「당착/내착」 칩이 **같은 줄**을 써야 제출할 때 중복 판정이 성립한다.
 * ⚠️ 담당자가 전화로 받아 적는 경우에도 「화주 요청」이 맞다 — 고른 주체가 아니라
 *    **요청한 주체**를 적는 자리다.
 */
export function arrivalNoteLine(v: string | null | undefined): string | null {
  if (v === "same_day") return "※ 화주 요청: 당착 (상차 당일 도착 · 시각 무관)";
  if (v === "next_day") return "※ 화주 요청: 내착 (상차 다음 날 도착 · 시각 무관)";
  return null;
}

/**
 * 특이사항에 도착구분 한 줄을 **중복 없이** 붙인다.
 *
 * 🔴 **이미 들어 있으면 다시 붙이지 않는다** — 포털 요청에서 넘어온 견적은 프리필이
 *    그 줄을 특이사항 칸에 이미 넣어 두었고, 제출 때 또 붙이면 견적서에 같은 문장이
 *    두 번 찍힌다.
 * 🔴 **담당자가 지운 줄을 되살리지 않는다** — 칩을 끄면(`null`) 아무것도 안 붙인다.
 *    다만 칩이 켜져 있는데 줄을 지웠다면 다시 붙는다(그 경우엔 값이 곧 요청이다).
 */
export function buildNotesWithArrival(
  notes: string | null | undefined,
  arrivalType: string | null | undefined
): string {
  const line = arrivalNoteLine(arrivalType);
  const base = (notes || "").trim();
  if (!line) return base;
  if (base.includes(line)) return base;
  return [base, line].filter(Boolean).join("\n");
}
