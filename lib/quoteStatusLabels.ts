// 견적 상태 — **화주 화면 전용** 라벨·색 매핑 (27차)
//
// 🔴 **DB 값은 바꾸지 않는다.** `quotes.status` 의 CHECK 는 다섯 값 그대로다
//    (실측 `quotes_status_check` — 상담중 · 견적제출 · 수주 · 보류 · 실패).
//    담당자에게는 `보류`·`실패` 가 정확한 말이라 **관리자 화면은 이 매핑을 쓰지 않는다.**
//    바뀌는 것은 화주가 보는 글자뿐이다.
//
// 🔴 **화면마다 따로 만들지 말 것** — 목록·상세·견적서·홈이 같은 것을 쓴다.
//    한 곳이 어긋나면 같은 견적이 화면마다 다른 상태로 보인다.
//
// ⚠️ **시안 소스의 라벨은 「보류」다**(실측). 「협의 중」은 사용자 확정으로 우리가 바꾼
//    것이고, 시안이 그렇게 그렸다는 이유로 「보류」로 되돌리지 말 것.

export type QuoteStatusStyle = {
  /** 화주에게 보여줄 글자 */
  label: string;
  /** 글자색 */
  color: string;
  /** 배경색 */
  bg: string;
};

/**
 * 🔴 **「협의 중」과 「운송 확정」의 배경을 같게 두지 말 것.**
 *
 * 시안은 둘 다 `#FFF9D6`(옅은 노랑)이고 글자색만 다르다. 그런데 두 상태는 뜻이
 * **정반대**다 — 하나는 진행이 멈춘 것이고 하나는 성사된 것이다. 배경이 같으면
 * 화주가 목록을 훑을 때 구분하지 못한다.
 *
 * 그래서 「협의 중」만 배경을 `#F4F3EF` 로 옮겼다. **새 색을 만들지 않았다** —
 * 시안 팔레트 안의 값이고(「상담 중」이 쓰는 회색), 글자색은 시안의 `#7A5F00` 을
 * 그대로 둬서 「상담 중」(회색 글자)과도 갈린다.
 * 「상담 중」과 「협의 중」은 둘 다 "아직 견적 전" 계열이라 바탕을 나눠 써도
 * 오해가 없지만, 「운송 확정」과는 절대 섞이면 안 된다.
 */
const STYLES: Record<string, QuoteStatusStyle> = {
  상담중: { label: "상담 중", color: "#6B6759", bg: "#F4F3EF" },
  견적제출: { label: "견적 도착", color: "#1D57C6", bg: "#E8EFFC" },
  수주: { label: "운송 확정", color: "#1A1A1A", bg: "#FFF9D6" },
  보류: { label: "협의 중", color: "#7A5F00", bg: "#F4F3EF" },
  실패: { label: "취소", color: "#B4423A", bg: "#FDF3F2" },
};

/**
 * 반려된 발주 요청 — 견적이 아니라 `portal_order_requests` 지만 견적 목록에 같은
 * 카드로 섞이므로 여기에 둔다(27차). 색은 「취소」와 같은 계열이다.
 *
 * ⚠️ 26차가 「내 요청 내역」을 지우면서 반려 건을 볼 곳이 사라져 여기로 옮긴 것이다.
 */
export const REJECTED_REQUEST_STYLE: QuoteStatusStyle = {
  label: "접수 반려",
  color: "#B4423A",
  bg: "#FDF3F2",
};

/**
 * 🔴 **모르는 값이 오면 DB 값을 그대로 보여준다.** 빈 배지가 되면 화주는 아무것도
 *    알 수 없고 우리도 무엇이 잘못됐는지 모른다. 상태가 늘어나면 여기에 추가할 것.
 */
export function quoteStatusStyle(status: string | null | undefined): QuoteStatusStyle {
  if (!status) return { label: "-", color: "#6B6759", bg: "#F4F3EF" };
  return STYLES[status] || { label: status, color: "#6B6759", bg: "#F4F3EF" };
}

/** 라벨만 필요할 때 */
export function quoteStatusLabel(status: string | null | undefined): string {
  return quoteStatusStyle(status).label;
}

/** 「운송 확정」인가 — 목록에서 배차 조회 링크를 띄울지 가른다 */
export function isQuoteConfirmed(status: string | null | undefined): boolean {
  return status === "수주";
}
