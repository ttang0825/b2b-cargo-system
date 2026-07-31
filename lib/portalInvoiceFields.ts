// 화주포털 정산확인(customer/invoices) 전용 조회 필드 화이트리스트 —
// admin에 새 정산 필드가 추가돼도(예: brokerage_fee/brokerage_fee_payer/
// network_settlement_type처럼 화주에게 노출되면 안 되는 내부 정산 정보,
// 원칙 3·9·42번과 같은 결) 화주포털 select문에 자동으로 새지 않도록
// 화면에서 이 상수만 조회 필드로 쓸 것(작업지시서 4-6).
export const PORTAL_INVOICE_FIELDS =
  "id,billing_period,customer_charge_total,tax_invoice_issued,tax_invoice_date,payment_received,payment_received_date,status,collection_method,billing_cycle,direct_collection_point,created_at,orders(order_no,loading_type)";
