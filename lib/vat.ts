// 부가세(×0.1)/부가세 포함 합계(×1.1) 계산 공용 함수 — 로드맵 ②-A 세션에서
// 여러 화면(admin/quotes, customer/quotes, customer/invoices)에 각자 중복
// 구현돼 있던 로컬 계산과 lib/settlementCalc.ts 내부의 인라인 계산을 여기
// 하나로 통합했다. 원 단위는 반올림(기존 화면 표시 관례 기준, 산재보험료
// 계산의 절사와는 별개 — 산재보험료 쪽은 lib/settlementCalc.ts에 그대로 둠).
export function calcVatAmount(supplyAmount: number): number {
  return Math.round(supplyAmount * 0.1);
}

export function calcInclusiveAmount(supplyAmount: number): number {
  return Math.round(supplyAmount * 1.1);
}
