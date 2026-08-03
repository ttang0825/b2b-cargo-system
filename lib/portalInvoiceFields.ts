// 화주포털 정산확인(customer/invoices) 전용 조회 필드 화이트리스트 —
// admin에 새 정산 필드가 추가돼도(예: brokerage_fee/brokerage_fee_payer/
// network_settlement_type처럼 화주에게 노출되면 안 되는 내부 정산 정보,
// 원칙 3·9·42번과 같은 결) 화주포털 select문에 자동으로 새지 않도록
// 화면에서 이 상수만 조회 필드로 쓸 것(작업지시서 4-6).
export const PORTAL_INVOICE_FIELDS =
  "id,order_id,billing_period,customer_charge_total,tax_invoice_issued,tax_invoice_date,payment_received,payment_received_date,status,collection_method,billing_cycle,direct_collection_point,created_at,orders(order_no,loading_type)";

// 로드맵③ addendum(2-5 변경) — 현장 추가비를 화주포털에도 항목별 내역으로
// 노출하되, driver_payout_amount(차주 지급액)는 절대 포함하지 않음. 이
// 문자열은 프론트 코드 차원의 안전장치일 뿐이고, 진짜 방어선은 DB
// 마이그레이션에서 authenticated role에 이 컬럼들만 column-level GRANT하고
// driver_payout_amount는 애초에 권한을 안 준 것 — 프론트가 실수로 이
// 상수에 driver_payout_amount를 추가해도 쿼리 자체가 권한 오류로 막힌다.
export const PORTAL_DISPATCH_EXTRA_CHARGE_FIELDS =
  "id,dispatch_id,category,customer_charge_amount,note,status,correction_invoice_id,created_at";
