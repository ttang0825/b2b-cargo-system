// 화주 기준 미수금 계산 (36차 C장 · 사용자 신고 2026-09-11).
//
// 사용자 원문:
//   *"활성화주 목록에서 선착불건의 금액은 미수금으로 표시되면 안된다."*
//
// 🔴 **이 파일이 세는 것은 「그 화주가 **위캐리에** 아직 안 준 돈」 하나뿐이다.**
//    돈의 흐름이 수금방식마다 다르고, 선착불은 **화주가 위캐리를 거치지 않는다.**
//
//      주선사정산(broker)     화주 ──청구액──▶ 위캐리 ──지급액──▶ 차주
//                             화주 기준 미수금 = **화주 청구액 전액**
//
//      선착불(driver_direct)  화주 ──운임──▶ 차주 · 차주 ──수수료──▶ 위캐리
//                             화주 기준 미수금 = **0**
//                             🔴 운임은 위캐리가 받을 돈이 아니고,
//                                🔴 주선수수료는 **차주가 낸다**(35차 확정 —
//                                「수수료 지급자」 항목을 없앤 이유가 *"수수료는 무조건
//                                차주가 지급함"* 이고, 화주 세금계산서 칸도
//                                *"해당 없음 — 선착불은 화주가 차주에게 직접 지급합니다"* 다).
//                                **둘 다 화주가 위캐리에 줄 돈이 아니다.**
//
// 🔴 **`invoices.receivable_amount` 를 그대로 더하면 안 된다 — 뜻이 다르다.**
//    그 칸은 「이 정산 건에서 위캐리가 **누구에게든** 받을 돈」이라 선착불이면 **주선수수료**가
//    들어 있다(35차 A-1). 받을 상대가 **차주**이므로 **화주 미수금에는 들어가면 안 된다.**
//    ⚠️ 36차 C장 조사가 처음에 이 둘을 같게 보고 「식B(받을돈)=25,000」을 답으로 적었는데
//       **그것이 틀렸다** — 정답은 **0**이다(선착불 3건의 수수료 합이 25,000이었다).
//       🔴 **「receivable_amount 를 쓰면 되지 않나」로 되돌리지 말 것.**
//
// ⚠️ **왜 신고가 들어왔나** — 읽는 쪽 두 곳이 서로 달랐다(36차 C장 실측):
//
//      식A  app/admin/invoices/page.tsx     `customer_charge_total` 을 직접 합산
//                                          → 화주에 **180,000**(전액 선착불 운임)을 써 넣었다
//      식B  app/admin/invoices/[id]/page.tsx `collection_method === "broker"` 게이트에 막혀
//                                          **선착불 건에서는 아예 안 돌아**, 식A 가 써 넣은
//                                          값을 **영영 고칠 수 없었다**
//
// 🔴 **옛 정산 건을 SQL 로 일괄 수정하지 말 것.** 틀린 것은 `invoices` 가 아니라
//    `companies.outstanding_amount` 이고, 그 값은 **정산 건을 저장할 때마다 전수 재계산**된다
//    — 이 함수를 쓰는 순간 다음 저장에서 저절로 맞는다.

export type CustomerReceivableInput = {
  /** 🔴 `driver_direct`(선착불)이면 화주 기준 미수금은 0이다 */
  collection_method?: string | null;
  /** 「위캐리가 누구에게든 받을 돈」 — 선착불이면 차주가 낼 주선수수료다 */
  receivable_amount?: number | null;
  /** 🔴 폴백 전용 — 35차 이전에 만들어진 옛 건에는 위 칸이 없다 */
  customer_charge_total?: number | null;
  payment_received?: boolean | null;
};

/**
 * 정산 건 하나에서 **화주가 위캐리에 아직 안 준 돈**을 뽑는다.
 *
 * 🔴 **선착불은 무조건 0이다** — 운임은 위캐리를 안 거치고, 수수료는 차주가 낸다.
 * 🔴 **`customer_charge_total` 폴백을 지우지 말 것** — 35차 이전 옛 건에는
 *    `receivable_amount` 가 없어서, 지우면 그 건들의 미수금이 통째로 0이 된다.
 *    ⚠️ 그 시절엔 선착불 구분 자체가 없었으므로 폴백이 도는 건은 전부 주선사정산이다.
 */
export function customerReceivableOf(inv: CustomerReceivableInput): number {
  if (inv.collection_method === "driver_direct") return 0;
  return inv.receivable_amount ?? inv.customer_charge_total ?? 0;
}

/**
 * 한 화주의 미수금 합계 — **입금 안 된 건만** 더한다.
 *
 * 🔴 **증분이 아니라 전수 재계산이다.** 삭제된 정산 건이 있어도 항상 맞고, 증분으로
 *    바꾸면 한 번 어긋난 값이 영영 안 돌아온다 — 그것이 이번 신고의 모양이었다.
 */
export function customerOutstandingOf(invoices: CustomerReceivableInput[]): number {
  return invoices
    .filter((i) => !i.payment_received)
    .reduce((sum, i) => sum + customerReceivableOf(i), 0);
}

/**
 * 두 계산 지점이 똑같이 읽어야 하는 컬럼 목록.
 * 🔴 **select 문에 컬럼을 손으로 적지 말 것** — `collection_method` 가 빠지면 선착불을
 *    구분하지 못해 **운임이 다시 화주 미수금이 된다**(이번 신고의 원인이다).
 */
export const CUSTOMER_RECEIVABLE_SELECT =
  "collection_method,receivable_amount,customer_charge_total,payment_received";
