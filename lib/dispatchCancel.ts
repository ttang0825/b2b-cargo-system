// ─────────────────────────────────────────────────────────────────────────────
// 배차 취소 사유 — **유일 정의처** (2026-09-17)
//
// 배경(사용자): *「배차확정 후 배차기사의 변심으로 취소한 경우, 어떻게 해야하나?」*
//
// 그전에는 길이 **삭제 하나뿐**이었다 — 행이 통째로 사라져서 ① 차주가 몇 번 펑크냈는지
// 아무데도 안 남고 ② 배차확정 푸시는 이미 갔는데 화주 화면이 **조용히 「접수」로 되돌아가고**
// ③ 급히 더 비싼 차를 잡아 마진이 깎여도 **왜 깎였는지가 없었다.**
//
// 🔴 **「차주 책임」 칸이 이 표의 존재 이유다.** 차주 상세의 취소 건수 집계가 이 칸으로
//    가른다 — 🔴 **화주 요청 취소를 차주 이력에 세지 말 것**(우리도 차주도 잘못이 없다).
//
// 🔴 **화주 라벨에 차주를 탓하는 말을 쓰지 말 것.** 「차주 변심」이 화주 화면에 뜨면
//    **회사가 배차를 못 지킨 것**으로 읽힌다. 화주에게 필요한 정보는 **「차가 바뀐다」**뿐이다.
//    ⚠️ **한동안 「화주 화면에서 아예 감춘다」였다**(2026-09-17 확정 (A)) — **같은 날
//    사용자가 배포본을 보고 뒤집었다**: *「사라지는게 아니라 접수 상태로 돌아가고 배차가
//    취소되었음이 표시가 되어야 할것 같다」*. 🔴 **그 옛 확정을 근거로 다시 감추지 말 것.**
//
// 🔴 **`cancel_reason_note`(자유 서술)는 내부 전용이다** — 화주 화면·견적서·엑셀 0줄.
//
// 🔴 **DB 에 CHECK 를 걸지 않았다** — 사유 목록은 실무가 굳기 전이라 늘어난다.
//    그래서 **이 파일이 유일한 방어선**이고, 화면에서 코드 문자열을 직접 적지 말 것.
// ─────────────────────────────────────────────────────────────────────────────

export type DispatchCancelReasonCode =
  | "driver_noshow"
  | "driver_breakdown"
  | "fare_disagreement"
  | "customer_request"
  | "cargo_not_ready"
  | "weather_road"
  | "etc";

export type DispatchCancelReason = {
  code: DispatchCancelReasonCode;
  /** 담당자가 보는 정확한 말. */
  adminLabel: string;
  /**
   * 🔴 **차주 이력에 셀 것인가.** 차주 상세의 「취소」 건수가 이 값이 `true` 인 것만 센다.
   *    🔴 `customer_request`·`cargo_not_ready`·`weather_road` 를 `true` 로 바꾸지 말 것 —
   *    차주 잘못이 아닌 것을 차주 이력에 쌓으면 그 숫자를 아무도 못 믿는다.
   */
  driverFault: boolean;
  /**
   * 화주가 보는 순화한 말(§5-4 패턴 — `lib/quoteStatusLabels.ts` 와 같은 결).
   * 🔴 **차주를 탓하는 말을 넣지 말 것.**
   */
  customerLabel: string;
  /**
   * 🔴 **이 취소 뒤에 다시 배차를 잡는가.**
   *    화주 화면이 「재배차 접수 중」을 붙일지 이 값으로 가른다 —
   *    🔴 **화주가 취소한 건에 「재배차 접수 중」을 띄우면 거짓말이 된다**
   *    (그 건은 다시 배차하지 않는다).
   */
  awaitsRedispatch: boolean;
};

/** 🔴 배열 순서가 곧 드롭다운 순서다 — 흔한 것부터. */
export const DISPATCH_CANCEL_REASONS: DispatchCancelReason[] = [
  { code: "driver_noshow",     adminLabel: "차주 변심·연락두절",  driverFault: true,  customerLabel: "배차 차량 변경",  awaitsRedispatch: true  },
  { code: "driver_breakdown",  adminLabel: "차주 차량 고장·사고", driverFault: true,  customerLabel: "배차 차량 변경",  awaitsRedispatch: true  },
  // ⚠️ **이름과 「차주 책임」이 2026-09-17 에 바뀌었다**(사용자 지시:
  //    *「"운임 협의 결렬"을 "운임료 조정 필요"로 바꾸고」*).
  //    🔴 **코드(`fare_disagreement`)는 그대로다** — 이미 이 코드로 저장된 행이 있고
  //       DB 에 CHECK 가 없어서(PR #171) 코드를 바꾸면 옛 행이 **이름 없는 사유**가 된다.
  //    🔴 **`driverFault` 를 `true` 로 되돌리지 말 것** — 이름이 바뀌면서 뜻이
  //       「차주와 협상이 깨졌다」에서 **「우리 운임이 낮아 올려야 한다」**로 옮겨졌다.
  //       우리 쪽 가격 문제를 차주 이력에 세면 그 숫자를 아무도 못 믿는다
  //       (PR #171 이 *「특히 운임 협의 결렬」*로 열어 둔 물음의 답이다).
  { code: "fare_disagreement", adminLabel: "운임료 조정 필요",   driverFault: false, customerLabel: "배차 차량 변경",  awaitsRedispatch: true  },
  // 🔴 화주가 취소한 건은 **다시 배차하지 않는다** — 「재배차 접수 중」을 띄우지 말 것.
  { code: "customer_request",  adminLabel: "화주 요청 취소",     driverFault: false, customerLabel: "고객 요청 취소",  awaitsRedispatch: false },
  { code: "cargo_not_ready",   adminLabel: "화물 준비 안 됨",    driverFault: false, customerLabel: "상차 준비 미완",  awaitsRedispatch: true  },
  { code: "weather_road",      adminLabel: "기상·도로 사정",     driverFault: false, customerLabel: "기상·도로 사정",  awaitsRedispatch: true  },
  { code: "etc",               adminLabel: "기타",              driverFault: false, customerLabel: "배차 변경",      awaitsRedispatch: true  },
];

/** 🔴 **차주 책임인 사유 코드** — 차주별 취소 집계가 이것으로 거른다. */
export const DRIVER_FAULT_CANCEL_CODES: string[] = DISPATCH_CANCEL_REASONS.filter(
  (r) => r.driverFault
).map((r) => r.code);

export function getDispatchCancelReason(
  code: string | null | undefined
): DispatchCancelReason | null {
  if (!code) return null;
  return DISPATCH_CANCEL_REASONS.find((r) => r.code === code) || null;
}

/** 담당자 화면용. 모르는 코드는 **코드를 그대로 보여준다**(조용히 비우지 않는다 · 원칙 55번). */
export function dispatchCancelAdminLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return getDispatchCancelReason(code)?.adminLabel || code;
}

/**
 * 화주 화면용. 🔴 모르는 코드는 **가장 무난한 말로 떨어뜨린다** — 담당자 화면과 달리
 * 여기서 코드(`driver_noshow`)가 그대로 보이면 그 자체가 차주를 탓하는 말이 된다.
 */
export function dispatchCancelCustomerLabel(code: string | null | undefined): string {
  return getDispatchCancelReason(code)?.customerLabel || "배차 변경";
}

/** 🔴 `dispatch_status` 의 값이다 — 화면에서 문자열을 직접 적지 말 것. */
export const DISPATCH_STATUS_CANCELLED = "취소";

/**
 * 🔴 **이 상태에서는 취소로 갈 수 없다.**
 *
 *    `운송완료` 는 정산이 이미 만들어졌을 수 있다(`lib/autoCreateInvoice.ts` 가
 *    그 상태에서 돈다). 그 되돌리기는 **별도 설계**이고, 여기서 열어 주면 정산 건이
 *    남은 채로 배차만 취소된 상태가 만들어진다.
 *    ⚠️ 착수 시점 실측으로 운영 배차 **11건이 전부 `운송완료`** 였다 — 이 가드가
 *    없으면 지금 화면에 있는 모든 건에 취소 버튼이 뜬다.
 */
export const CANCEL_BLOCKED_STATUSES: string[] = ["운송완료", DISPATCH_STATUS_CANCELLED];

export function canCancelDispatch(status: string | null | undefined): boolean {
  return !CANCEL_BLOCKED_STATUSES.includes(status || "");
}

/**
 * 🔴 **담당자 화면에 찍는 말** — DB 값은 `취소` 이고 화면 글자만 「배차취소」다
 *    (사용자 지시 2026-09-17: *「내부시스템 목록에서 배차상태가 "배차취소"로 바뀌고」*).
 *
 *    🔴 **DB 값을 바꾸는 쪽으로 되돌리지 말 것** — `dispatches_dispatch_status_check`
 *    를 갈아야 하고 **배포 순서가 어긋나면 배차 저장이 통째로 막힌다**(PR #163 이 그
 *    증상이었고, PR #164 가 견적 「상담중 → 확인중」에서 내린 것과 같은 판단이다).
 */
export const DISPATCH_STATUS_CANCELLED_ADMIN_LABEL = "배차취소";

/** 담당자 화면용 상태 라벨. 🔴 `취소` 말고는 **DB 값 그대로** 돌려준다. */
export function dispatchStatusAdminLabel(status: string | null | undefined): string {
  if (status === DISPATCH_STATUS_CANCELLED) return DISPATCH_STATUS_CANCELLED_ADMIN_LABEL;
  return status || "-";
}

export function isDispatchCancelled(status: string | null | undefined): boolean {
  return status === DISPATCH_STATUS_CANCELLED;
}

/**
 * 🔴 **화주 화면에 띄우는 말 — 정의처는 여기 하나다**(사용자 지시 2026-09-17:
 *    *「접수 상태로 돌아가고 배차가 취소되었음이 표시가 되어야 할것 같다.
 *    "사정으로 인한 배차 취소후 재배차 접수중" 이런식으로」*).
 *
 *    ⚠️ **이것이 (A) 「화주 화면에서 감춘다」를 뒤집은 것이다** — 하루 전 확정이었고
 *    사용자가 배포본을 보고 바꿨다. 🔴 **그 옛 확정을 근거로 다시 감추지 말 것.**
 *
 *    🔴 **차주를 탓하는 말을 넣지 말 것**(「차주 변심」이 뜨면 회사가 배차를 못 지킨
 *    것으로 읽힌다) · 🔴 **회사의 책임을 시사하는 말도 넣지 말 것**(약관 제19조가
 *    배상책임을 **차주와 그 보험자**에게 둔다) · 🔴 **「지연됩니다」처럼 결과를 단정하지
 *    말 것**(새 차가 더 빨리 잡힐 수도 있다. 여기서 말할 것은 **지금 상태**뿐이다).
 */
export const DISPATCH_CANCEL_CUSTOMER_BADGE = "배차 취소";

/** 🔴 재배차를 기다리는 건에만 덧붙인다(`awaitsRedispatch`). */
export const DISPATCH_CANCEL_CUSTOMER_REDISPATCH = "재배차 접수 중";

/** 카드 안에 한 줄로 적는 설명. 🔴 사유 코드·경위를 여기에 섞지 말 것. */
export const DISPATCH_CANCEL_CUSTOMER_NOTE =
  "사정에 따라 배차가 취소되어 다시 배차를 접수하고 있습니다.";

/**
 * 화주 화면의 배지 한 줄을 만든다.
 * 🔴 **화면에서 문자열을 이어 붙이지 말 것** — 조회 화면과 홈이 같은 말을 써야 한다.
 */
export function dispatchCancelCustomerBadge(code: string | null | undefined): string {
  const reason = getDispatchCancelReason(code);
  // 🔴 사유를 안 적은 건(옛 데이터·수기 변경)은 **가장 무난한 쪽**으로 둔다 —
  //    재배차를 기다리는 것이 기본 경로다.
  if (!reason || reason.awaitsRedispatch) {
    return `${DISPATCH_CANCEL_CUSTOMER_BADGE} · ${DISPATCH_CANCEL_CUSTOMER_REDISPATCH}`;
  }
  return `${DISPATCH_CANCEL_CUSTOMER_BADGE} · ${reason.customerLabel}`;
}

/** 🔴 재배차를 기다리는 건에만 설명 줄을 띄운다 — 화주가 취소한 건에 「재배차」는 거짓말이다. */
export function dispatchCancelAwaitsRedispatch(code: string | null | undefined): boolean {
  const reason = getDispatchCancelReason(code);
  return !reason || reason.awaitsRedispatch;
}

/**
 * 🔴 **화주 화면의 취소 배지 색 — 옅은 레드**(사용자 지시 2026-09-17:
 *    *「화주포털에 뜨는 "배차취소,재배차 접수중" 뱃지는 옅은 레드로 표시해주자」*).
 *
 *    ⚠️ **하루 전에는 중립 회색이었고**(`#F4F3EF` / `#6B6759`) `app/globals.css` 의
 *    `.pv2-dcancel-tag` 주석이 *「`.pv2-dissue`(문제발생)와 색을 같게 하지 말 것 —
 *    취소는 사고가 아니다」* 라고 적고 있었다. **사용자가 그것을 뒤집었다** —
 *    🔴 **그 옛 주석을 근거로 회색으로 되돌리지 말 것**(같은 커밋에서 고쳤다).
 *
 *    🔴 **새 색을 만들지 않았다** — 27차 시안 팔레트의 빨강 쌍이고
 *    `DISPATCH_ISSUE_STYLE`(문제 발생)과 **같은 값**이다. 그래서 두 배지가 한 카드에
 *    같이 떠도 색이 같은데, **가르는 것은 색이 아니라 말이다**(「문제 발생」 /
 *    「배차 취소 · 재배차 접수 중」). 🔴 헷갈린다는 신고가 오면 **새 색을 지어내지 말고**
 *    모양(테두리·자리)으로 가를 것.
 *
 *    ⚠️ **같은 값이 `app/globals.css` 의 `.pv2-dcancel-tag` 에도 리터럴로 있다** —
 *    CSS 는 이 상수를 못 읽는다. **한쪽을 고치면 반대쪽도 같이 고칠 것.**
 */
export const DISPATCH_CANCEL_CUSTOMER_STYLE = { color: "#B4423A", bg: "#FDF3F2" };


/**
 * 🔴 **이 사유로 취소하면 견적 금액을 고치러 보낸다** (사용자 지시 2026-09-17).
 *
 * *「이 사유 선택으로 취소시 자동으로 해당 견적의 견적관리 수정으로 이동하고
 *   최종견적금액에 옅은 빨간색으로 강조해서 수정을 유도하자」*
 *
 * 배차가 안 잡혀 운임을 올려야 하는 상황이라, 취소한 담당자가 **다음에 할 일이 정해져
 * 있다** — 견적 금액을 올리는 것이다. 그 길을 화면이 대신 걸어 준다.
 *
 * 🔴 **다른 사유에는 붙이지 말 것** — 화주 요청 취소·화물 준비 안 됨은 금액 문제가
 *    아니라서, 견적 수정 화면으로 보내면 담당자가 「왜 여기로 왔지」가 된다.
 */
export const CANCEL_REASON_NEEDS_QUOTE_REVISION = "fare_disagreement";

/** 견적 상세를 「금액 고치는 상태」로 여는 쿼리스트링. 🔴 화면에서 문자열을 다시 적지 말 것. */
export const QUOTE_REVISE_AMOUNT_PARAM = "revise";
export const QUOTE_REVISE_AMOUNT_VALUE = "amount";

/** 그 안내 문구 — 견적 상세가 그대로 그린다. */
export const QUOTE_REVISE_AMOUNT_NOTICE =
  "배차가 잡히지 않아 배차를 취소했습니다. 최종 견적금액을 조정한 뒤 저장해주세요.";
