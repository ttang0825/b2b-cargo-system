// 기업고객 리워드 — **화주가 보는 쪽**의 유일한 정의처 (2차, 2026-09-21)
//
// 🔴 **의존성 0이다.** `lib/supabaseClient` 도 `NextResponse` 도 들이지 말 것 —
//    서버 라우트와 포털 화면이 **둘 다** 이 파일을 쓴다. 한쪽 클라이언트를 들이면
//    `next build` 가 *"Failed to collect page data"* 로 멈춘다(PR #151·#179 가
//    `lib/quoteValidity.ts`·`lib/callScript.ts` 에서 겪은 자리).
//
// 🚨 **화주에게 내보내지 않는 것** — 여기에 담지 않는 것이 곧 방어선이다.
//    · `description`   수동 조정 사유가 들어간다. 담당자가 내부 메모로 쓰는 칸이라
//                      「담당자 착오 보정」 같은 말이 그대로 화주에게 간다.
//                      🔴 **화면에서 감추는 것으로 갈음하지 말 것** — API 응답에
//                         실리면 그대로 브라우저에 내려간다(30차 `ObfuscatedEmail`
//                         과 같은 결: 화면이 가리는 것과 안 주는 것은 다른 방어선).
//    · `source_id`     정산 건의 내부 id 다. 대신 **오더번호**를 조인해 준다.
//    · `created_by`    어느 직원이 넣었는지.
//    · `reward_method` 🚨 「상품권으로 드립니다」가 화면에 적히면 **약속**이 된다.
//                      세무·법무 검수(접대비·판촉비 / 포인트 귀속)가 아직 안 끝났다.

export type PortalRewardKind = "earn" | "adjust" | "deduct";

/**
 * 원장 한 줄을 화주가 읽는 세 갈래로 옮긴다.
 *
 * 🔴 **회수·조정 줄을 목록에서 빼지 말 것.** 사용자 확정은 「적립 내역까지」였지만,
 *    착수 전 실측(`_verify.sql` ㉞-c2)에서 **적립합 8,300 + 조정 700 = 잔액 9,000**
 *    이 이미 실재했다. 적립 줄만 보여주면 **목록을 다 더해도 잔액이 안 나와서**
 *    화주가 곧바로 되묻는다. 줄은 보여주되 **사유는 안 보여주는** 것이 답이다.
 * 🔴 **`reversal` 과 음수 `adjustment` 를 한 갈래로 묶는다** — 화주에게는 둘 다
 *    「차감」이고, 왜 깎였는지는 담당자가 말할 일이다(화면이 지어내지 않는다).
 */
export function portalRewardKind(
  transactionType: string | null | undefined,
  amount: number | null | undefined
): PortalRewardKind {
  if (transactionType === "transport_earn") return "earn";
  return Math.round(amount || 0) < 0 ? "deduct" : "adjust";
}

export const PORTAL_REWARD_LABEL: Record<PortalRewardKind, string> = {
  earn: "운송 적립",
  adjust: "적립 조정",
  deduct: "차감",
};

/** 화주 화면에 내려가는 한 줄 — 🔴 여기에 없는 칸은 응답에도 담지 않는다. */
export type PortalRewardRow = {
  id: string;
  kind: PortalRewardKind;
  /** 부호 그대로(차감은 음수) */
  amount: number;
  /** 적립 줄의 기준 운임 — **공급가액**이다(부가세 별도) */
  base_amount: number | null;
  /** 그때의 요율 스냅샷 — 캠페인 요율이 바뀌어도 옛 줄이 맞아야 한다 */
  earn_rate: number | null;
  /** 적립 줄이면 오더번호. 없으면 null(게스트·삭제된 오더) */
  order_no: string | null;
  /**
   * 🚨 **화주에게 보이는 한 줄**(`reward_ledger.customer_note`) — 차감이 「어떻게
   *    사용됐는지」를 말한다(3차, 2026-09-21 · 사용자 요청).
   *
   * 🔴 **`description` 이 아니다.** 그 칸은 담당자의 **내부 메모**라 서버가 화주
   *    응답의 select 에서부터 뺀다 — 여기에 담지 말 것.
   * 🔴 담당자가 안 적었으면 `null` 이고, 그때는 화면이 줄을 안 그린다.
   */
  note: string | null;
  created_at: string;
};

/**
 * 화주에게 보여줄 캠페인 안내 — 🔴 **사실만 적는다.**
 *
 * 🚨 **지급 방식·자동 적립 여부를 적지 말 것.** 이벤트 안내 페이지가 「별도 신청 없이
 *    자동 적립」이라고 적고 있는데 실제는 **선택된 기업만**이라, 같은 문장을 포털에도
 *    적으면 표시광고법 제3조 문제가 화면 하나 더 늘어난다(HANDOFF §5-3 · §5-27).
 */
export type PortalRewardCampaign = {
  name: string;
  /** 0.05 */
  earn_rate: number;
  /** 적립 마감일 */
  earn_end_date: string;
  /** 사용 기한 */
  use_end_date: string;
  /** 이 금액부터 쓸 수 있다 */
  minimum_use_amount: number;
};
