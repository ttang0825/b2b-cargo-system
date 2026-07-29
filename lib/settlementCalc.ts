// 차주 수금/지급 운임 계산 (3차 세션: 차주 수금/지급 운임 표시 구조).
// 부가세·산재보험료는 별도 컬럼에 금액을 저장하지 않고 "포함/별도" 여부 +
// 요율만 저장한 뒤 이 함수로 화면·출력 시점에 계산한다. 최종 합계
// (driverTotalPayout)만 dispatches.driver_payout에 스냅샷으로 저장됨 —
// 이후 요율이 바뀌어도 과거 배차 건의 저장된 값은 안 바뀜.
//
// 참고: 6차 세션(현장 추가비)이 진행되면 마진 계산에서 "승인된 추가비 합계"를
// 빼는 로직이 추가될 예정.

export type SettlementCalcInput = {
  driverBaseFare: number;
  driverVatIncluded: boolean;
  industrialInsuranceIncluded: boolean;
  industrialInsuranceRate: number; // %
  customerCharge: number; // 화주 청구금액 (dispatches.customer_charge)
};

export type SettlementCalcResult = {
  vatAmount: number;
  industrialInsuranceAmount: number;
  driverTotalPayout: number;
  brokerMargin: number;
};

export function calcSettlement(input: SettlementCalcInput): SettlementCalcResult {
  const base = input.driverBaseFare || 0;
  const vatAmount = input.driverVatIncluded ? 0 : base * 0.1;
  const industrialInsuranceAmount = input.industrialInsuranceIncluded
    ? 0
    : base * ((input.industrialInsuranceRate || 0) / 100);
  const driverTotalPayout = base + vatAmount + industrialInsuranceAmount;
  const brokerMargin = (input.customerCharge || 0) - driverTotalPayout;

  return { vatAmount, industrialInsuranceAmount, driverTotalPayout, brokerMargin };
}
