// 마진 계산 (35차 C-1 · 사용자 확정 2026-09-11).
//
// 🔴 **마진은 하나다 — 「위캐리가 버는 돈, 부가세 제외」.**
//    수금방식에 따라 그 돈이 어디서 오는지가 다를 뿐이고, 정의가 둘인 것이 아니다.
//
//      주선사정산(broker)     화주 ──청구액──▶ 위캐리 ──지급액──▶ 차주
//                             마진 = 화주청구(공급가액) − 차주지급(공급가액)
//
//      선착불(driver_direct)  화주 ──합계──▶ 차주 · 차주 ──수수료──▶ 위캐리
//                             마진 = 주선수수료(공급가액)
//                             🔴 **운임은 매출에도 원가에도 안 잡는다** — 위캐리를
//                                안 거치는 돈이다. 그 돈을 매출로 세면 취급고가
//                                매출로 둔갑한다.
//
// 🔴 **주선수수료는 부가세 포함가로 기입한다**(사용자 6·9번). 그래서 마진으로 쓸 때는
//    ÷1.1 해서 공급가액으로 내린다. ⚠️ 지금 DB 에 5,000(포함가)과 4,545(공급가액)가
//    섞여 있다 — 이 규칙이 「입력은 포함가 · 통계는 공급가액」으로 통일한다.
//
// ⚠️ **다른 두 마진과 헷갈리지 말 것**(35차 착수 전 확인 5번):
//    ① `dispatches.margin` — DB **생성 컬럼**(`customer_charge - driver_payout`).
//       부가세 환산이 없고 선착불도 구분하지 않는다. 배차 목록의 「단순마진(참고)」다.
//    ② `lib/settlementCalc.ts` 의 `realMargin` — 공급가액 기준 + 주선사부담 산재보험료.
//       🔴 **실사용 0건**이다(`driver_base_fare` 가 들어간 배차가 실측 0건).
//       입력이 없으므로 통계에 쓰면 숫자가 틀린다.
//    🔴 **대시보드는 이 파일만 쓴다.** 세 개를 한 화면에 섞지 말 것.

import { toSupplyAmount } from "./vat";

export type MarginInput = {
  collectionMethod: string | null | undefined;
  /** 화주 청구금액 (부가세 기준은 아래 플래그가 말한다) */
  customerCharge: number | null | undefined;
  customerChargeVatIncluded: boolean | null | undefined;
  /** 차주 지급금액 */
  driverPayout: number | null | undefined;
  driverVatIncluded: boolean | null | undefined;
  /** 주선수수료 — 🔴 항상 부가세 포함가로 기입된다 */
  brokerageFee: number | null | undefined;
};

/** 위캐리가 버는 돈(부가세 제외). 수금방식이 계산식을 정한다. */
export function calcMargin(input: MarginInput): number {
  if (input.collectionMethod === "driver_direct") {
    return Math.round(toSupplyAmount(input.brokerageFee || 0));
  }
  const charge = input.customerChargeVatIncluded
    ? toSupplyAmount(input.customerCharge || 0)
    : input.customerCharge || 0;
  const payout = input.driverVatIncluded
    ? toSupplyAmount(input.driverPayout || 0)
    : input.driverPayout || 0;
  return Math.round(charge - payout);
}

/**
 * 취급고 — 위캐리를 거쳐 간 운임의 크기(공급가액). 🔴 **매출이 아니다.**
 * 선착불 운임은 화주가 차주에게 직접 주므로 우리 매출이 아니지만, 얼마나 굴렸는지는
 * 보여야 해서 따로 센다. 화면에 「매출」이라고 적지 말 것.
 */
export function calcGrossVolume(input: MarginInput): number {
  const base =
    input.collectionMethod === "driver_direct"
      ? input.customerCharge || 0
      : input.customerCharge || 0;
  return Math.round(input.customerChargeVatIncluded ? toSupplyAmount(base) : base);
}
