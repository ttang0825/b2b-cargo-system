/**
 * 🔴 배차 상태 3단계 매핑 — **유일 정의처**(29차).
 *
 *    DB 는 `dispatch_status` 6종인데 화주는 3단계(접수 · 배차완료 · 운송완료)만 본다.
 *    🔴 **배차·운송 조회 화면과 홈 배차 배지가 이 파일 하나를 같이 쓴다** — 두 곳에
 *    각각 매핑을 적으면 "홈에는 배차완료인데 조회에는 접수"처럼 조용히 갈린다
 *    (59차가 `lib/arrivalType.ts` 로 한 것과 같은 방식, 원칙 13번과 같은 결).
 *
 *    🔴 **관리자 화면은 계속 6종을 그대로 본다** — `lib/dispatchStatusColors.ts` 를
 *    이 매핑으로 바꾸지 말 것(담당자에게는 6단계가 정확한 말이고, 관리자 3화면 +
 *    포털 1화면이 그 파일을 같이 쓴다).
 */

export type DispatchStage = 0 | 1 | 2;

/** 알약 라벨 3개 — 순서가 곧 단계 번호다. */
export const DISPATCH_STAGE_LABELS = ["접수", "배차완료", "운송완료"] as const;

/**
 * 🔴 6종 → 3단계.
 *
 *    접수      ← 접수중
 *    배차완료  ← 배차확정 · 상차완료
 *    운송완료  ← 하차완료 · 운송완료
 *
 *    🔴 **`하차완료` 를 진행 중(1단계)에 두지 말 것** — 화물은 이미 도착했다(53차 ⑦).
 *
 *    🔴 **`문제발생` 은 단계가 아니라 상태값을 덮어쓴다.** 그래서 그 건은 상태로
 *    단계를 알 수 없고 `pickup_confirmed`·`delivery_confirmed`(둘 다 boolean) 로
 *    복원한다 — 두 컬럼을 조회에서 빼면 문제발생 건이 전부 「접수」로 보인다.
 */
export function getDispatchStage(input: {
  dispatch_status?: string | null;
  pickup_confirmed?: boolean | null;
  delivery_confirmed?: boolean | null;
}): DispatchStage {
  const s = input.dispatch_status;
  if (s === "하차완료" || s === "운송완료") return 2;
  if (s === "배차확정" || s === "상차완료") return 1;
  if (s === "접수중") return 0;
  // 문제발생(또는 앞으로 늘어날 값) — 체크 두 개로 복원한다.
  if (input.delivery_confirmed) return 2;
  if (input.pickup_confirmed) return 1;
  return 0;
}

/**
 * 🔴 「문제 발생」은 **4번째 알약이 아니라 알약 3개 위의 빨간 배지**다(사용자 확정 6번).
 *
 *    어느 단계에서든 생길 수 있고 단계와 별개이므로 알약 줄에 끼워 넣으면 안 된다.
 *    ⚠️ **판정이 두 갈래다** — `dispatch_status='문제발생'`(6종 중 하나, 포털이 이미
 *    조회하는 값)과 `dispatches.issue_occurred`(관리자 배차 상세의 체크박스)가
 *    따로 있고 서로를 자동으로 맞추지 않는다. 둘 중 하나라도 서면 배지를 띄운다 —
 *    한쪽만 보면 담당자가 체크만 하고 상태를 안 바꾼 건(또는 그 반대)이 새어 나간다.
 */
export function hasDispatchIssue(input: {
  dispatch_status?: string | null;
  issue_occurred?: boolean | null;
}): boolean {
  return input.dispatch_status === "문제발생" || input.issue_occurred === true;
}

/** 3단계 배지 색 — 시안 실측값(`DS` 배열). 홈 배차 배지가 쓴다. */
export const DISPATCH_STAGE_COLORS: { color: string; bg: string }[] = [
  { color: "#6B6759", bg: "#F4F3EF" }, // 접수
  { color: "#1D57C6", bg: "#E8EFFC" }, // 배차완료
  { color: "#1A1A1A", bg: "#EBEAE7" }, // 운송완료
];

/**
 * 「문제 발생」 배지 색.
 * 🔴 **새 색을 만들지 않았다** — 27차가 견적 상태 「취소」에 쓴 시안 팔레트 값 그대로다.
 */
export const DISPATCH_ISSUE_STYLE = { label: "문제 발생", color: "#B4423A", bg: "#FDF3F2" };

export function getDispatchStageStyle(stage: DispatchStage) {
  return { label: DISPATCH_STAGE_LABELS[stage], ...DISPATCH_STAGE_COLORS[stage] };
}
