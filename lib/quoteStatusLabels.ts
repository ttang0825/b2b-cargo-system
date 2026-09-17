// 견적 상태 — 라벨·색 매핑 (27차 · 2026-09-16 확장)
//
// 🔴 **DB 값은 바꾸지 않는다.** `quotes.status` 의 CHECK 는 다섯 값 그대로다
//    (실측 `quotes_status_check` — 상담중 · 견적제출 · 수주 · 보류 · 실패).
//    바뀌는 것은 **화면에 찍히는 글자뿐**이고, 그래서 마이그레이션도 기존 행
//    일괄 수정도 없다. 🔴 **DB 값을 바꾸는 쪽으로 되돌리지 말 것** — CHECK 를 갈아야
//    하고, 그 사이 배포 순서가 어긋나면 **견적 저장이 통째로 막힌다**(PR #163 이
//    바로 그 증상이었다).
//
// 🔴 **이 파일은 이제 두 갈래다**(2026-09-16).
//      `quoteStatusStyle()`       화주 화면 — `보류`→「협의 중」처럼 **순화한 말** + 색
//      `quoteStatusAdminLabel()`  관리자 화면 — DB 값 그대로, **`상담중` 만 「확인중」**
//      `quoteStatusAdminStyle()`  관리자 화면 — 위 글자 + **관리자 전용 색**(맨 아래)
//    담당자에게는 `보류`·`실패` 가 정확한 말이라 관리자 화면은 앞엣것을 쓰지 않는다.
//    🔴 **색도 갈렸다** — 관리자에서 옐로는 「내가 할 일」, 화주에서 옐로는 「성사」다.
//    사유는 `ADMIN_STYLES` 주석에 있다. **둘을 한 매핑으로 합치지 말 것.**
//    ⚠️ **한동안 이 머리말이 「관리자 화면은 이 매핑을 쓰지 않는다」로만 적혀 있었다** —
//    그때는 이 파일에 화주용 하나뿐이었기 때문이다. 아래 함수를 「화주 전용 파일에
//    관리자 것이 섞였다」며 옮기지 말 것(같은 낱말을 두 곳에 적으면 갈린다).
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
  // 🔴 **「상담 중」이 아니라 「확인중」이다**(사용자 지시 2026-09-16 —
  //    *「견적저장을 하면 「상담중」 이라고 뜨는데 「확인중」으로 바꾸자. 이 부분은
  //    화주포털 배지에서도 바뀌어야 한다」*). 담당자가 견적을 저장한 직후의 상태라
  //    「상담」보다 「확인」이 실제로 하는 일에 가깝다. **관리자 화면도 같은 글자다**
  //    (아래 `quoteStatusAdminLabel()`). 🔴 되돌리지 말 것.
  상담중: { label: "확인중", color: "#6B6759", bg: "#F4F3EF" },
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

// ── 관리자 화면 라벨 ─────────────────────────────────────────────────────────
//
// 🔴 **DB 값을 그대로 쓰되 `상담중` 만 「확인중」으로 바꿔 그린다.** 담당자에게
//    `보류`·`실패` 는 정확한 말이라 화주용 순화 라벨(`quoteStatusStyle`)을 관리자에
//    끌어오면 안 된다 — 그 화면에서 「취소」는 무엇이 취소된 것인지 흐려진다.
//
// 🔴 **`<option value>` 는 DB 값 그대로 두고 보이는 글자만 이것을 쓸 것** —
//    값까지 바꾸면 CHECK 위반으로 상태 변경이 실패한다.
const ADMIN_LABELS: Record<string, string> = {
  상담중: "확인중",
};

/** 관리자 화면에 찍을 글자. 모르는 값은 그대로 돌려준다(새 상태가 조용히 사라지지 않게). */
export function quoteStatusAdminLabel(status: string | null | undefined): string {
  if (!status) return "-";
  return ADMIN_LABELS[status] || status;
}

/**
 * 관리자 목록에 찍을 **컬러 캡**(2026-09-16 · 소수정 ④).
 *
 * 🔴 **화주용 `STYLES` 를 그대로 쓰지 않는다 — 말도 색도 다르다.**
 *    - 말 : 화주는 순화한 말(「협의 중」·「취소」), 담당자는 DB 값 그대로.
 *    - 색 : 화주 목록에서 옐로는 **「운송 확정」**(성사)인데, 관리자 목록에서 옐로는
 *           **「내가 지금 할 일」**이다(발주요청 행·「운송오더 생성 필요」 배지가
 *           이미 그 색이다). 두 뜻이 한 화면에 같이 있으면 훑을 때 읽히지 않는다.
 *    그래서 관리자에서만 **`확인중` 을 옐로로, `수주` 를 초록으로** 옮겼다.
 *    🔴 **이 매핑을 화주 화면에 가져다 쓰지 말 것**(화주포털 0줄이 이 차수의 전제다).
 *
 * 🔴 **`실패` 를 강한 빨강으로 칠하지 말 것** — 끝난 건이라 목록에서 가장 조용해야
 *    한다. 지금 값(`#FDF3F2` 바탕 + `#B4423A` 글자)은 화주 화면과 같은 쌍이고,
 *    배경이 거의 흰색이라 목록을 시뻘겋게 만들지 않는다.
 *
 * 🔴 **모르는 값은 회색으로 그리되 글자는 그대로 보여준다**(상태가 늘었을 때
 *    배지가 조용히 비지 않게 — `quoteStatusStyle()` 과 같은 규칙).
 */
const ADMIN_STYLES: Record<string, QuoteStatusStyle> = {
  // 옐로 = 담당자가 지금 손대야 하는 것(금액을 정해야 한다)
  상담중: { label: "확인중", color: "#92400E", bg: "#FEF3C7" },
  견적제출: { label: "견적제출", color: "#1D57C6", bg: "#E8EFFC" },
  // 초록 = 성사. 🔴 화주용처럼 옐로로 되돌리지 말 것(위 사유)
  수주: { label: "수주", color: "#1B7F3B", bg: "#E6F6EC" },
  보류: { label: "보류", color: "#7A5F00", bg: "#F4F3EF" },
  실패: { label: "실패", color: "#B4423A", bg: "#FDF3F2" },
};

export function quoteStatusAdminStyle(status: string | null | undefined): QuoteStatusStyle {
  if (!status) return { label: "-", color: "#6B6759", bg: "#F4F3EF" };
  return (
    ADMIN_STYLES[status] || { label: quoteStatusAdminLabel(status), color: "#6B6759", bg: "#F4F3EF" }
  );
}
