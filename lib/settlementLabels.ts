// 로드맵 ②-A: 정산방식 구조(collection_method+billing_cycle+direct_collection_point)의
// 화면 표시 라벨을 만드는 공용 함수. 원본 코드값을 화면에 직접 출력하지 말고
// 반드시 이 함수를 거칠 것(특히 화주포털 — 작업지시서 4-6 참고).

export type CollectionMethod = "broker" | "driver_direct";
export type BillingCycle = "per_order" | "monthly";
export type DirectCollectionPoint = "pickup" | "dropoff" | "undecided";
export type NetworkSettlementType = "none" | "fee_auto" | "freight_managed" | "other";

export function getSettlementDisplayLabel(
  collectionMethod: string | null | undefined,
  billingCycle: string | null | undefined
): string {
  if (collectionMethod === "broker" && billingCycle === "per_order") return "주선사 정산";
  if (collectionMethod === "driver_direct" && billingCycle === "per_order") return "선착불";
  if (collectionMethod === "broker" && billingCycle === "monthly") return "월정산";
  if (collectionMethod === "driver_direct" && billingCycle === "monthly") return "선착불 / 수수료 월정산";
  return "-";
}

export function getPaymentConditionLabel(
  directCollectionPoint: string | null | undefined
): string | null {
  if (directCollectionPoint === "pickup") return "선불(상차지 지급)";
  if (directCollectionPoint === "dropoff") return "착불(하차지 지급)";
  if (directCollectionPoint === "undecided") return "협의중";
  return null;
}

/**
 * 🔴 **화주가 보는 정산방식 말** (27차 리뷰 5라운드 확정).
 *
 *    27차 ④ 의 상태 라벨과 **똑같은 구조**다 — DB 값과 관리자 내부 화면은 그대로 두고
 *    화주가 보는 글자만 바꾼다. 담당자에게는 「주선사 정산」이 정확한 말이고, 화주에게는
 *    「위캐리 수금」이 무슨 뜻인지 바로 읽힌다.
 *
 * ```
 *   축 이름   정산방식        → 운임 수금방식
 *   broker         주선사 정산 → 위캐리 수금
 *   driver_direct  선착불      → 선착불(차주 직접수금)
 * ```
 *
 * 🔴 **`getSettlementDisplayLabel()` 을 이 말로 바꾸지 말 것** — 그 함수는 정산관리·배차·
 *    관리자 화주요청 목록이 같이 쓰고, 거기서는 「주선사 정산」이 담당자의 말이다.
 * 🟢 **화주가 보는 곳은 전부 이 함수를 쓴다** — 발주 폼 · 견적 확인 카드 · 견적서 네 산출물.
 *    ⚠️ 견적서 PDF 는 관리자 화면에서 뽑지만 **화주에게 나가는 문서**라 화주 말을 쓴다.
 */
export const CUSTOMER_COLLECTION_AXIS_LABEL = "운임 수금방식";

export function getCustomerCollectionMethodLabel(
  collectionMethod: string | null | undefined
): string | null {
  if (collectionMethod === "broker") return "위캐리 수금";
  if (collectionMethod === "driver_direct") return "선착불(차주 직접수금)";
  return null;
}

/**
 * 🔴 **청구주기 축은 이 함수다 — `getCustomerCollectionMethodLabel()` 안에 넣지 말 것.**
 *
 *    그것이 27차가 기각한 (C)안(화주 말에 청구주기 축을 더해 2축 4값으로 만드는 안)
 *    이고, 사용자가 2026-08-29 에 **(A)안**으로 확정했다: 담당자 화면은 그대로 두고
 *    화주 화면만 화주 말을 쓰되 **축을 두 줄로 쪼갠다.**
 *
 * ```
 *   운임 수금방식   위캐리 수금 / 선착불(차주 직접수금)   ← getCustomerCollectionMethodLabel()
 *   청구           건별 / 월정산                        ← 이 함수 (별도 줄)
 * ```
 *
 * 🔴 **이것은 「정산방식 4종을 2종으로 줄이는 것」이 아니다**(사용자 확정 8번과 충돌하지
 *    않는다) — 2축으로 **나누는** 것이라 조합 4가지가 그대로 표현된다. 특히
 *    「월정산」이 화면에서 사라지지 않는다(원칙 42번) — 사라지면 월정산 묶음 청구가
 *    그 값으로 도는데 화주는 그 사실을 모르게 된다.
 */
export const CUSTOMER_BILLING_AXIS_LABEL = "청구";

export function getCustomerBillingCycleLabel(
  billingCycle: string | null | undefined
): string | null {
  if (billingCycle === "monthly") return "월정산";
  if (billingCycle === "per_order") return "건별";
  return null;
}

/**
 * 🔴 견적서에 한 줄로 찍는 정산방식 문구 (27차 리뷰 4라운드).
 *
 *    **견적서 상세 · PDF 2종 · 엑셀 네 산출물이 이 함수 하나를 쓴다.** 각자 조합하면
 *    조용히 어긋난다 — 31차가 "PDF 와 엑셀은 쌍으로 움직인다"고 못박은 지점이고,
 *    53차가 부가세 행에서 실제로 어긋나 있는 것을 발견했다.
 *
 * ⚠️ 값이 없으면 `null` 을 돌려준다 — 호출부는 **블록 자체를 그리지 않아야 한다**
 *    (입금 계좌와 같은 규칙, 27차 ⑦). 빈 라벨만 남으면 규격이 무너진다.
 */
export function getQuoteSettlementLine(
  collectionMethod: string | null | undefined,
  billingCycle: string | null | undefined,
  directCollectionPoint: string | null | undefined
): string | null {
  // 🔴 **화주 말을 쓴다**(5라운드 확정) — 견적서는 화주에게 나가는 문서다.
  //    청구주기(`billingCycle`)는 화주에게 보여주지 않는다: 월정산 여부는 화주별 계약
  //    사항이라 담당자가 정하는 값이고, 견적서에 적으면 확정된 조건처럼 읽힌다.
  const base = getCustomerCollectionMethodLabel(collectionMethod);
  if (!base) return null;
  const condition = getPaymentConditionLabel(directCollectionPoint);
  return condition ? `${base} · ${condition}` : base;
}

export const NETWORK_SETTLEMENT_TYPE_LABELS: Record<NetworkSettlementType, string> = {
  none: "해당 없음",
  fee_auto: "수수료 자동정산",
  freight_managed: "운임 정보망 관리",
  other: "기타",
};

export function getNetworkSettlementTypeLabel(value: string | null | undefined): string {
  return NETWORK_SETTLEMENT_TYPE_LABELS[value as NetworkSettlementType] || "-";
}

export const BROKERAGE_FEE_PAYER_LABELS: Record<string, string> = {
  shipper: "화주 부담",
  driver: "차주 부담",
  network: "정보망 부담",
  waived: "면제",
  other: "기타",
};

export function getBrokerageFeePayerLabel(value: string | null | undefined): string {
  return BROKERAGE_FEE_PAYER_LABELS[value || ""] || "-";
}

// 작업지시서 3-6: 신규 필드 → 구형 settlement_type으로의 단방향 호환 매핑.
// 구형 값에서 신규 필드로 역방향 동기화하는 코드는 절대 만들지 말 것.
// 표현 불가능한 조합(driver_direct+monthly, undecided 등)은 null을 반환하고
// 호출부에서 settlement_type을 건드리지 않는다(기존 DEFAULT 'general' 유지).
export function mapToLegacySettlementType(
  collectionMethod: string | null | undefined,
  billingCycle: string | null | undefined,
  directCollectionPoint: string | null | undefined
): string | null {
  if (collectionMethod === "broker" && billingCycle === "per_order") return "general";
  if (collectionMethod === "broker" && billingCycle === "monthly") return "monthly";
  if (collectionMethod === "driver_direct" && billingCycle === "per_order" && directCollectionPoint === "pickup")
    return "prepaid";
  if (collectionMethod === "driver_direct" && billingCycle === "per_order" && directCollectionPoint === "dropoff")
    return "postpaid_cod";
  return null;
}
