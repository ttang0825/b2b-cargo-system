// 차주 수금/지급 운임 계산 (3차 세션: 차주 수금/지급 운임 표시 구조, 3차 세션
// 보정: 산재보험료 계산 로직 수정, 7차 세션 보정: 부가세 포함/별도 토글 제거
// — 입력값은 항상 공급가액(부가세 별도)으로 고정.
//
// 화물차주는 '노무제공자' 신분으로, 산재보험료를 주선사·차주가 절반씩(50%)
// 공동부담한다. 차주 부담분은 차주가 받을 금액에서 원천징수(차감)하고,
// 주선사 부담분은 주선사가 별도로 부담(실질 마진에서 차감)한다.
//
//   공급가액(부가세 제외 기본운임)
//     → 월보수액 = 공급가액 × (1 − 필요경비공제율)
//     → 차주부담분 = 월보수액 × (산재보험료율 ÷ 2)
//     → 주선사부담분 = 월보수액 × (산재보험료율 ÷ 2)
//
// 필요경비공제율/산재보험료율은 고용노동부가 매년 재고시하는 값이라 코드에
// 하드코딩하지 않고 insurance_rate_settings 테이블(관리자 수정 가능)에서 읽어온다.
//
// 원 단위는 절사(내림)를 기본으로 하되, 근로복지공단 공식 계산기와 1~2원
// 이내 오차가 있을 수 있다.
//
// 참고: 6차 세션(현장 추가비)이 진행되면 마진 계산에서 "승인된 추가비 합계"를
// 빼는 로직이 추가될 예정.
//
// 부가세(×0.1) 계산은 lib/vat.ts의 calcVatAmount()를 재사용(로드맵②-A
// 세션에서 여러 곳에 흩어져 있던 부가세 계산을 하나로 통합).

import { calcVatAmount } from "./vat";

export type InsuranceRateSettingsInput = {
  expenseDeductionRate: number; // 필요경비공제율(%)
  insuranceRateTotal: number; // 산재보험료율 총계(%)
};

export type SettlementCalcInput = {
  driverBaseFare: number; // 차주 기본운임(공급가액) 입력값
  industrialInsuranceApplicable: boolean; // 산재보험료 적용대상 여부
  customerCharge: number; // 화주청구금액(공급가액, dispatches.customer_charge)
  rateSettings: InsuranceRateSettingsInput;
};

export type SettlementCalcResult = {
  driverSupplyAmount: number; // 차주 기본운임(공급가액) — 입력값 그대로
  vatAmount: number;
  industrialInsuranceBaseAmount: number; // 월보수액
  industrialInsuranceDriverShare: number; // 차주부담분(원천징수액)
  industrialInsuranceBrokerShare: number; // 주선사부담분(비용)
  appliedInsuranceRate: number; // 계산에 실제 적용된 산재보험료율(%) 스냅샷
  driverTotalPayout: number; // 차주 최종 수금/지급액(부가세 포함)
  simpleMargin: number; // 단순마진(참고) — 화주청구금액 - 차주지급액
  realMargin: number; // 실질마진(정산기준) — 공급가액 기준, 주선사부담 산재보험료 반영
};

export function calcSettlement(input: SettlementCalcInput): SettlementCalcResult {
  const driverSupplyAmount = input.driverBaseFare || 0;
  const vatAmount = calcVatAmount(driverSupplyAmount);
  const collectAmount = driverSupplyAmount + vatAmount; // 차주 수금액(부가세 포함)

  let industrialInsuranceBaseAmount = 0;
  let industrialInsuranceDriverShare = 0;
  let industrialInsuranceBrokerShare = 0;
  let appliedInsuranceRate = 0;

  if (input.industrialInsuranceApplicable) {
    const { expenseDeductionRate, insuranceRateTotal } = input.rateSettings;
    industrialInsuranceBaseAmount = Math.floor(
      driverSupplyAmount * (1 - expenseDeductionRate / 100)
    );
    const halfRate = insuranceRateTotal / 2 / 100;
    industrialInsuranceDriverShare = Math.floor(industrialInsuranceBaseAmount * halfRate);
    industrialInsuranceBrokerShare = Math.floor(industrialInsuranceBaseAmount * halfRate);
    appliedInsuranceRate = insuranceRateTotal;
  }

  const driverTotalPayout = Math.round(collectAmount - industrialInsuranceDriverShare);

  const customerSupply = input.customerCharge || 0;
  const realMargin = Math.round(customerSupply - driverSupplyAmount - industrialInsuranceBrokerShare);
  const simpleMargin = Math.round((input.customerCharge || 0) - driverTotalPayout);

  return {
    driverSupplyAmount: Math.round(driverSupplyAmount),
    vatAmount,
    industrialInsuranceBaseAmount,
    industrialInsuranceDriverShare,
    industrialInsuranceBrokerShare,
    appliedInsuranceRate,
    driverTotalPayout,
    simpleMargin,
    realMargin,
  };
}

// 혼적 할인 (4차 세션). 견적 단계에서 동의·할인조건을 1회만 수집하고, 그 조건을
// 최종 견적금액에 바로 반영한다.
//
// ⚠️ 7차 세션에 배차의 "혼적 실행" 체크박스(dispatches.mixed_executed)가 없어지면서
//    이 함수의 mixedExecuted 인자는 호출부가 늘 true 를 넘기는 죽은 값이 됐고,
//    2026-09-09 에 제거했다. 되살리지 말 것 — 되살리려면 그 컬럼부터 다시 만들어야 한다.
//
// 🔴 이 함수는 거리를 보지 않는다. 표준 혼적 할인율은 거리 3구간이지만 그것은
//    입력창 기본값이고(lib/mixedLoadingDiscountSettings.ts), 실제 할인율은 담당자가
//    건별로 확정해 저장한 값이다. 거리로 계수를 강제하는 설계는 ① 그 건별 조정값을
//    덮어쓰고 ② orders 에 distance_km 이 없어 오더 상세에서 같은 금액을 재현할 수
//    없으며 ③ 요율표를 고치는 순간 과거 견적의 재계산 금액이 달라져서 채택하지 않았다.
export function applyMixedDiscount(
  baseCharge: number,
  loadingType: "exclusive" | "mixable",
  discountType: "amount" | "percent" | null,
  discountAmount: number,
  discountPercent: number
): number {
  if (loadingType !== "mixable") return baseCharge;
  if (discountType === "percent") {
    return Math.round(baseCharge * (1 - discountPercent / 100));
  }
  if (discountType === "amount") {
    return Math.max(0, baseCharge - discountAmount);
  }
  return baseCharge;
}

// applyMixedDiscount()의 역연산 — "혼적 실행" 체크를 해제할 때 이미 할인이
// 반영되어 저장된 청구운임에서 할인 전 금액으로 되돌리는 데 사용했다.
// ⚠️ 그 체크박스가 7차 세션에 없어지면서 **호출부가 0곳**이 됐다(2026-09-09 실측).
//    고장난 게 아니라 쓸 자리가 없어진 것이라 지우지 않고 얼려둔다 — 지우면 다음에
//    "왜 역연산이 없지" 하고 다시 만들게 된다. applyMixedDiscount() 와 인자·규칙이
//    짝을 이루므로, 한쪽을 고치면 다른 쪽도 같이 고칠 것.
export function reverseMixedDiscount(
  discountedCharge: number,
  loadingType: "exclusive" | "mixable",
  discountType: "amount" | "percent" | null,
  discountAmount: number,
  discountPercent: number
): number {
  if (loadingType !== "mixable") return discountedCharge;
  if (discountType === "percent" && discountPercent < 100) {
    return Math.round(discountedCharge / (1 - discountPercent / 100));
  }
  if (discountType === "amount") {
    return discountedCharge + discountAmount;
  }
  return discountedCharge;
}
