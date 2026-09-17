// ─────────────────────────────────────────────────────────────────────────────
// 「수정견적」 — 화주포털 견적 목록의 배지 규칙, 유일 정의처 (2026-09-17)
//
// 사용자 지시: *「한번 승인된 견적에서 견적조정으로 수정이 될때, 화주포털 견적확인
// 목록에서 금액 앞에 "수정견적" 이라고 뱃지가 붙으면 좋을 것 같다. 상세보기에는 표시가
// 없어도 된다. 이 수정견적 뱃지는 운송이 완료된 후 자동으로 사라지면 된다」*
//
// 바로 앞 차수(PR #172)가 **견적 금액을 고치면 연결된 오더 청구금액이 따라오게** 만들면서
// 「승인 뒤에 금액을 조정한다」가 정식 경로가 됐다. 화주는 자기가 승인한 금액이 달라진
// 것을 **목록에서** 알아야 한다.
//
// 🔴 **신호는 `quotes.revised_at` 이고 `updated_at` 이 아니다.** 담당자 메모 한 줄,
//    화주 본인의 승인, 특이사항 한 글자가 전부 `updated_at` 을 움직인다 — PR #164 가
//    포털 배너에서 정확히 그 문제를 겪고 신호를 「바뀐 뒤의 상태」로 갈아끼웠다.
//    🔴 **이 배지를 `updated_at` 으로 되돌리지 말 것** — 거의 모든 견적에 붙는다.
//
// 🔴 **금액이 실제로 바뀐 때만 찍는다.** 구간·품목·특이사항만 고친 것은 「수정견적」이
//    아니다 — 화주가 그 배지에서 읽는 것은 **금액이 달라졌다**이다.
//    (내부 수정 이력은 그것대로 전부 남는다 — `lib/recordChangeLog.ts`.)
//
// 🔴 **`수주` 인 견적만이다.** 아직 승인 전이면 조정은 그냥 견적 작업이고, 화주는 최종
//    금액 하나만 본다. 사용자 원문이 *「한번 승인된 견적에서」*다.
// ─────────────────────────────────────────────────────────────────────────────

/** 🔴 「승인된 견적」의 DB 값. 화면 글자(「운송 확정」)와 비교하지 말 것. */
export const REVISION_TRACKED_STATUS = "수주";

/**
 * 이번 저장이 「수정견적」인가 — `quotes.revised_at` 을 찍을지 정한다.
 *
 * 🔴 **금액 비교는 반올림해서 한다** — `numeric` 이 `130000.00` 으로 돌아오는 것과
 *    입력창의 `130000` 이 다르게 읽히면 안 고친 견적에도 배지가 붙는다.
 */
export function isQuoteRevision(params: {
  status: string | null | undefined;
  beforeAmount: number | null | undefined;
  afterAmount: number | null | undefined;
}): boolean {
  if (params.status !== REVISION_TRACKED_STATUS) return false;
  const before = params.beforeAmount == null ? null : Math.round(params.beforeAmount);
  const after = params.afterAmount == null ? null : Math.round(params.afterAmount);
  return before !== after;
}

/** 화주가 보는 배지 글자 — 사용자 원문 그대로다. */
export const QUOTE_REVISED_BADGE_LABEL = "수정견적";

/**
 * 배지가 아직 떠 있어야 하는가.
 *
 * 🔴 **사라지는 기준은 「운송 완료」이고, 그 판정은 배차 단계가 한다**(`lib/dispatchStage.ts`).
 *    🔴 **`orders.status` 로 재지 말 것** — `하차완료` 배차는 오더에서 `운송중` 인데
 *    화주 화면은 그것을 이미 **「운송완료」로 보여준다**(29차 3단계 매핑). 오더 상태로
 *    재면 화주 눈에는 운송이 끝났는데 배지만 남아 있게 된다.
 *
 * 🔴 **연결된 오더가 하나도 없으면 배지는 남는다** — 승인 직후 오더를 만들기 전이
 *    그 상태다. 없앨 근거가 없다.
 * 🔴 **오더가 여럿이면 전부 완료돼야 사라진다** — 하나라도 운행 중이면 그 건의 금액이
 *    아직 쓰이고 있다.
 */
export function isQuoteRevisionVisible(params: {
  revisedAt: string | null | undefined;
  /** 이 견적에 연결된 오더들의 **배차 단계**(`getDispatchStage()` 결과). 오더가 없으면 빈 배열. */
  orderStages: number[];
}): boolean {
  if (!params.revisedAt) return false;
  if (params.orderStages.length === 0) return true;
  return !params.orderStages.every((s) => s >= QUOTE_REVISION_DONE_STAGE);
}

/**
 * 🔴 **2 = 운송완료**(`lib/dispatchStage.ts` 의 3단계 중 마지막). 숫자를 화면에 적지 말 것.
 *    ⚠️ 취소된 배차는 그 파일이 **언제나 0** 으로 돌려주므로, 취소 건만 남은 오더는
 *    완료로 읽히지 않는다 — 재배차가 붙어 끝나야 배지가 사라진다. 의도한 동작이다.
 */
export const QUOTE_REVISION_DONE_STAGE = 2;
