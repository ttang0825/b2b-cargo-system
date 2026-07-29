// 차주 수금/지급 운임 계산 (3차 세션: 차주 수금/지급 운임 표시 구조, 3차 세션
// 보정: 산재보험료 계산 로직 수정).
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

export type InsuranceRateSettingsInput = {
  expenseDeductionRate: number; // 필요경비공제율(%)
  insuranceRateTotal: number; // 산재보험료율 총계(%)
};

export type SettlementCalcInput = {
  driverBaseFare: number; // 차주 기본운임 입력값
  driverVatIncluded: boolean; // 위 입력값에 부가세가 이미 포함되어 있는지
  industrialInsuranceApplicable: boolean; // 산재보험료 적용대상 여부
  customerCharge: number; // 화주청구금액 (dispatches.customer_charge)
  customerChargeVatIncluded: boolean; // 화주청구금액에 부가세가 포함되어 있는지
  rateSettings: InsuranceRateSettingsInput;
};

export type SettlementCalcResult = {
  driverSupplyAmount: number; // 차주 기본운임의 공급가액(부가세 제외)
  vatAmount: number;
  industrialInsuranceBaseAmount: number; // 월보수액
  industrialInsuranceDriverShare: number; // 차주부담분(원천징수액)
  industrialInsuranceBrokerShare: number; // 주선사부담분(비용)
  appliedInsuranceRate: number; // 계산에 실제 적용된 산재보험료율(%) 스냅샷
  driverTotalPayout: number; // 차주 최종 수금/지급액
  simpleMargin: number; // 단순마진(참고) — 화주청구금액(세포함 여부 무관) - 차주지급액
  realMargin: number; // 실질마진(정산기준) — 공급가액 기준, 주선사부담 산재보험료 반영
};

function toSupplyAmount(amount: number, vatIncluded: boolean): number {
  return vatIncluded ? amount / 1.1 : amount;
}

export function calcSettlement(input: SettlementCalcInput): SettlementCalcResult {
  const base = input.driverBaseFare || 0;
  const driverSupplyAmount = toSupplyAmount(base, input.driverVatIncluded);
  const vatAmount = input.driverVatIncluded ? 0 : base * 0.1;
  const collectAmount = base + vatAmount; // 부가세 포함 기준 차주 수금액

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

  const customerSupply = toSupplyAmount(input.customerCharge || 0, input.customerChargeVatIncluded);
  const realMargin = Math.round(customerSupply - driverSupplyAmount - industrialInsuranceBrokerShare);
  const simpleMargin = Math.round((input.customerCharge || 0) - driverTotalPayout);

  return {
    driverSupplyAmount: Math.round(driverSupplyAmount),
    vatAmount: Math.round(vatAmount),
    industrialInsuranceBaseAmount,
    industrialInsuranceDriverShare,
    industrialInsuranceBrokerShare,
    appliedInsuranceRate,
    driverTotalPayout,
    simpleMargin,
    realMargin,
  };
}

// 혼적 할인 (4차 세션). 견적 단계에서 동의·할인조건을 1회만 수집하고,
// 배차 단계는 "실제 혼적됐는지" 실행여부 플래그(mixedExecuted) 1개로
// 판단한다 — 독차로 실제 운행되면(mixedExecuted=false) 할인 미적용,
// 혼적으로 실제 운행되면 견적에서 설정한 할인을 그대로 반영한다.
export function applyMixedDiscount(
  baseCharge: number,
  loadingType: "exclusive" | "mixable",
  mixedExecuted: boolean,
  discountType: "amount" | "percent" | null,
  discountAmount: number,
  discountPercent: number
): number {
  const applies = loadingType === "mixable" && mixedExecuted;
  if (!applies) return baseCharge;
  if (discountType === "percent") {
    return Math.round(baseCharge * (1 - discountPercent / 100));
  }
  if (discountType === "amount") {
    return Math.max(0, baseCharge - discountAmount);
  }
  return baseCharge;
}
