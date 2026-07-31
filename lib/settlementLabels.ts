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
