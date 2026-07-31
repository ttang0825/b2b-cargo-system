"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { STATUS_OPTIONS } from "@/lib/statusColors";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import {
  INVOICE_STATUS_OPTIONS,
  getInvoiceStatusColor,
} from "@/lib/invoiceStatusColors";
import DateRangeFilter, { DatePreset, getDateRange } from "@/components/DateRangeFilter";
import { getCurrentStaffId } from "@/lib/currentStaff";
import MoneyInput from "@/components/MoneyInput";
import MixableBadge from "@/components/MixableBadge";
import LockedBadge from "@/components/LockedBadge";
import { getSettlementDisplayLabel, mapToLegacySettlementType } from "@/lib/settlementLabels";
import { calcInclusiveAmount } from "@/lib/vat";

type OrderLite = {
  id: string;
  order_no: string | null;
  company_id: string | null;
  quote_id: string | null;
  individual_customer_id: string | null;
  settlement_type: string | null;
  collection_method: string | null;
  billing_cycle: string | null;
  direct_collection_point: string | null;
  companies: { name: string } | null;
  guest_name: string | null;
};

type InvoiceRow = {
  id: string;
  order_id: string | null;
  billing_period: string | null;
  customer_charge_total: number | null;
  driver_payout_total: number | null;
  commission_total: number | null;
  tax_invoice_issued: boolean;
  payment_received: boolean;
  driver_paid: boolean;
  status: string;
  settlement_type: string | null;
  collection_method: string | null;
  billing_cycle: string | null;
  brokerage_fee: number | null;
  brokerage_fee_paid: boolean | null;
  locked: boolean;
  created_at: string;
  orders: { order_no: string | null; guest_name: string | null; loading_type: string | null } | null;
  companies: { name: string } | null;
};

// 로드맵 ②-A 이후로는 collection_method/billing_cycle이 기준 필드 —
// "선착불 / 수수료 월정산"처럼 "/"가 들어간 라벨은 폭에 따라 auto-wrap이
// 들쭉날쭉해지는 문제가 있어("/" 앞뒤로 안 끊기고 3줄로 갈라짐), "/" 뒤에서
// 확실하게 한 번만 줄바꿈되도록 직접 나눈다. "/"가 없는 라벨은 그대로 한 줄.
function SettlementBadgeLabel({
  collectionMethod,
  billingCycle,
}: {
  collectionMethod: string | null | undefined;
  billingCycle: string | null | undefined;
}) {
  const label = getSettlementDisplayLabel(collectionMethod, billingCycle);
  const slashIdx = label.indexOf("/");
  if (slashIdx === -1) return <>{label}</>;
  return (
    <>
      {label.slice(0, slashIdx + 1)}
      <br />
      {label.slice(slashIdx + 1)}
    </>
  );
}

// "전체" 기간을 선택해도 한 번에 너무 많은 데이터를 불러오지 않도록 안전장치로 상한을 둠
const ALL_PERIOD_LIMIT = 500;
const FILTERED_PERIOD_LIMIT = 500;

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [availableOrders, setAvailableOrders] = useState<OrderLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [settlementFilter, setSettlementFilter] = useState("전체");
  const [period, setPeriod] = useState<DatePreset>("all");

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [billingPeriod, setBillingPeriod] = useState(currentMonth());
  const [customerChargeTotal, setCustomerChargeTotal] = useState("");
  const [driverPayoutTotal, setDriverPayoutTotal] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  // 차주 지급금액이 배차 상세 "차주 운임 상세 계산" 계산기를 거쳐 산출된
  // 값인지 order_id 기준으로 판단하는 맵 — 계산기를 거친 값은 항상 부가세
  // 포함으로 산출되고(lib/settlementCalc.ts), 산재보험료 적용대상이면 그만큼
  // 차감된 금액이라 목록에 그 사실을 캡션으로 안내함(계산기 없이 직접
  // 입력한 값은 부가세·산재보험료 여부를 알 수 없어 캡션을 붙이지 않음)
  const [driverCalcInfoByOrderId, setDriverCalcInfoByOrderId] = useState<
    Record<string, { throughCalc: boolean; insuranceApplied: boolean }>
  >({});
  // 선택한 오더에 연결된 배차의 정산방식·선착불 관련 값 스냅샷 — 정산 등록 시
  // 그대로 복사(작업지시서 4-5, 배차가 없으면 오더 값으로 폴백)
  const [settlementSnapshot, setSettlementSnapshot] = useState<{
    collection_method: string | null;
    billing_cycle: string | null;
    direct_collection_point: string | null;
    network_settlement_type: string | null;
    total_freight_amount: number | null;
    driver_direct_collection_amount: number | null;
    brokerage_fee: number | null;
    brokerage_fee_payer: string | null;
  } | null>(null);

  async function loadInvoices(preset: DatePreset = period) {
    setLoading(true);
    const { from } = getDateRange(preset);
    let query = supabase
      .from("invoices")
      .select(
        "id,order_id,billing_period,customer_charge_total,driver_payout_total,commission_total,tax_invoice_issued,payment_received,driver_paid,status,settlement_type,collection_method,billing_cycle,brokerage_fee,brokerage_fee_paid,locked,created_at,orders(order_no,guest_name,loading_type),companies(name)"
      )
      .order("created_at", { ascending: false })
      .limit(preset === "all" ? ALL_PERIOD_LIMIT : FILTERED_PERIOD_LIMIT);
    if (from) query = query.gte("created_at", from);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setInvoices(data as any as InvoiceRow[]);

    const orderIds = ((data as any as InvoiceRow[]) || [])
      .map((i) => i.order_id)
      .filter((v): v is string => !!v);
    if (orderIds.length > 0) {
      const { data: dispatchRows } = await supabase
        .from("dispatches")
        .select("order_id,driver_base_fare,industrial_insurance_applicable")
        .in("order_id", orderIds);
      const map: Record<string, { throughCalc: boolean; insuranceApplied: boolean }> = {};
      (dispatchRows || []).forEach((d: any) => {
        if (d.order_id) {
          map[d.order_id] = {
            throughCalc: d.driver_base_fare != null,
            insuranceApplied: !!d.industrial_insurance_applicable,
          };
        }
      });
      setDriverCalcInfoByOrderId(map);
    } else {
      setDriverCalcInfoByOrderId({});
    }
    setLoading(false);
  }

  async function loadAvailableOrders() {
    const { data: existingInvoices } = await supabase
      .from("invoices")
      .select("order_id");
    const invoicedOrderIds = new Set(
      (existingInvoices || []).map((i: any) => i.order_id).filter(Boolean)
    );
    const { data } = await supabase
      .from("orders")
      .select(
        "id,order_no,company_id,quote_id,individual_customer_id,settlement_type,collection_method,billing_cycle,direct_collection_point,companies(name),guest_name"
      )
      .eq("status", "운송완료")
      .order("created_at", { ascending: false });
    setAvailableOrders(
      ((data as any as OrderLite[]) || []).filter(
        (o) => !invoicedOrderIds.has(o.id)
      )
    );
  }

  useEffect(() => {
    loadInvoices("all");
    loadAvailableOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 기간 필터 변경 시 정산 목록만 다시 로드
  useEffect(() => {
    loadInvoices(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function handleSelectOrder(orderId: string) {
    setSelectedOrderId(orderId);
    setCustomerChargeTotal("");
    setDriverPayoutTotal("");
    setSettlementSnapshot(null);

    const order = availableOrders.find((o) => o.id === orderId);

    const { data: dispatch } = await supabase
      .from("dispatches")
      .select(
        "customer_charge, driver_payout, collection_method, billing_cycle, direct_collection_point, network_settlement_type, total_freight_amount, driver_direct_collection_amount, brokerage_fee, brokerage_fee_payer"
      )
      .eq("order_id", orderId)
      .maybeSingle();

    if (dispatch) {
      setSettlementSnapshot({
        collection_method: dispatch.collection_method || order?.collection_method || "broker",
        billing_cycle: dispatch.billing_cycle || order?.billing_cycle || "per_order",
        direct_collection_point: dispatch.direct_collection_point || order?.direct_collection_point || null,
        network_settlement_type: dispatch.network_settlement_type || "none",
        total_freight_amount: dispatch.total_freight_amount ?? null,
        driver_direct_collection_amount: dispatch.driver_direct_collection_amount ?? null,
        brokerage_fee: dispatch.brokerage_fee ?? null,
        brokerage_fee_payer: dispatch.brokerage_fee_payer ?? null,
      });
    } else {
      setSettlementSnapshot({
        collection_method: order?.collection_method || "broker",
        billing_cycle: order?.billing_cycle || "per_order",
        direct_collection_point: order?.direct_collection_point || null,
        network_settlement_type: "none",
        total_freight_amount: null,
        driver_direct_collection_amount: null,
        brokerage_fee: null,
        brokerage_fee_payer: null,
      });
    }

    if (dispatch && (dispatch.customer_charge || dispatch.driver_payout)) {
      setCustomerChargeTotal(
        dispatch.customer_charge ? String(Math.round(dispatch.customer_charge)) : ""
      );
      setDriverPayoutTotal(
        dispatch.driver_payout ? String(Math.round(dispatch.driver_payout)) : ""
      );
      return;
    }

    // 배차 기록에 청구운임이 없으면(배차 관리를 거치지 않고 오더 상태만 바로
    // 운송완료로 바꾼 경우 등), 연결된 견적의 최종금액으로 화주 청구금액만이라도 채워줌
    if (order?.quote_id) {
      const { data: quote } = await supabase
        .from("quotes")
        .select("final_amount")
        .eq("id", order.quote_id)
        .maybeSingle();
      if (quote?.final_amount) {
        setCustomerChargeTotal(String(Math.round(quote.final_amount)));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedOrderId) {
      setError("정산할 운송오더를 선택해주세요.");
      return;
    }
    if (!customerChargeTotal.trim() || !driverPayoutTotal.trim()) {
      setError("화주 청구금액과 차주 지급금액을 모두 입력해주세요.");
      return;
    }
    setSaving(true);

    const order = availableOrders.find((o) => o.id === selectedOrderId);
    const chargeNum = Number(customerChargeTotal) || 0;
    const payoutNum = Number(driverPayoutTotal) || 0;
    // 화주 청구금액(customer_charge_total)은 항상 공급가액(부가세 별도)으로
    // 저장되지만, 차주 지급금액(driver_payout_total)은 실제로 차주에게
    // 지급되는 최종 금액(부가세 포함 기준)이므로, 기준을 맞추기 위해
    // 화주 청구금액도 부가세 포함가로 환산한 뒤 차감한다(PR #63 리뷰 피드백)
    const commission = calcInclusiveAmount(chargeNum) - payoutNum;

    const { error } = await supabase.from("invoices").insert({
      order_id: selectedOrderId,
      company_id: order?.company_id || null,
      individual_customer_id: order?.individual_customer_id || null,
      billing_period: billingPeriod || null,
      customer_charge_total: chargeNum || null,
      driver_payout_total: payoutNum || null,
      commission_total: commission || null,
      payment_due_date: paymentDueDate || null,
      receivable_amount: chargeNum || null,
      payable_amount: payoutNum || null,
      settlement_type: order?.settlement_type || "general",
      collection_method: settlementSnapshot?.collection_method || "broker",
      billing_cycle: settlementSnapshot?.billing_cycle || "per_order",
      direct_collection_point: settlementSnapshot?.direct_collection_point || null,
      network_settlement_type: settlementSnapshot?.network_settlement_type || "none",
      total_freight_amount: settlementSnapshot?.total_freight_amount ?? chargeNum ?? null,
      driver_direct_collection_amount: settlementSnapshot?.driver_direct_collection_amount ?? null,
      brokerage_fee: settlementSnapshot?.brokerage_fee ?? null,
      brokerage_fee_payer: settlementSnapshot?.brokerage_fee_payer ?? null,
      status: "정산대기",
      created_by: await getCurrentStaffId(),
    });

    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    // 화주 CRM 실적 자동 반영 (법인 화주에 연결된 오더인 경우만)
    // 카운터를 "더하는" 방식 대신, 실제 정산(invoices) 기록을 매번 다시 세어
    // 계산합니다 - 과거에 오더/정산을 삭제한 적이 있어도 항상 정확합니다.
    if (order?.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("status")
        .eq("id", order.company_id)
        .single();

      const { data: allInvoices } = await supabase
        .from("invoices")
        .select("customer_charge_total,commission_total,payment_received")
        .eq("company_id", order.company_id);

      const list = allInvoices || [];
      const totalOrdersCount = list.length; // 방금 등록한 이 건 포함해서 이미 저장됨
      const totalRevenue = list.reduce(
        (sum, i) => sum + (i.customer_charge_total || 0),
        0
      );
      const totalMargin = list.reduce(
        (sum, i) => sum + (i.commission_total || 0),
        0
      );
      const outstandingAmount = list
        .filter((i) => !i.payment_received)
        .reduce((sum, i) => sum + (i.customer_charge_total || 0), 0);

      if (company) {
        // 실제 정산 건수에 따라 첫거래완료 → 재거래발생 → 반복화주 순으로
        // 자동 승격 (뒤로는 되돌리지 않음)
        const targetStatus =
          totalOrdersCount === 1
            ? "첫거래완료"
            : totalOrdersCount === 2
            ? "재거래발생"
            : "반복화주";
        const currentIdx = STATUS_OPTIONS.indexOf(company.status as any);
        const targetIdx = STATUS_OPTIONS.indexOf(targetStatus as any);
        const nextStatus =
          currentIdx !== -1 && currentIdx >= targetIdx
            ? company.status
            : targetStatus;

        await supabase
          .from("companies")
          .update({
            status: nextStatus,
            total_orders_count: totalOrdersCount,
            total_revenue: totalRevenue,
            total_margin: totalMargin,
            outstanding_amount: outstandingAmount,
            last_order_date: new Date().toISOString().slice(0, 10),
            repeat_customer: totalOrdersCount > 1,
          })
          .eq("id", order.company_id);
      }
    }

    setSaving(false);
    setShowForm(false);
    setSelectedOrderId("");
    setCustomerChargeTotal("");
    setDriverPayoutTotal("");
    setPaymentDueDate("");
    setSettlementSnapshot(null);
    loadInvoices(period);
    loadAvailableOrders();
  }

  const filtered = useMemo(() => {
    return invoices
      .filter((i) => statusFilter === "전체" || i.status === statusFilter)
      .filter((i) => settlementFilter === "전체" || (i.collection_method || "broker") === settlementFilter)
      .filter((i) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          (i.orders?.order_no || "").toLowerCase().includes(q) ||
          (i.companies?.name || "").toLowerCase().includes(q) ||
          (i.orders?.guest_name || "").toLowerCase().includes(q)
        );
      });
  }, [invoices, search, statusFilter, settlementFilter]);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">정산 관리</h1>
          <p className="page-desc">
            운송완료된 오더를 정산 처리하고, 세금계산서·입금·지급 상태를
            관리합니다.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <DateRangeFilter value={period} onChange={setPeriod} />
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "닫기" : "+ 신규 정산 등록"}
          </button>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {period === "all" && invoices.length >= ALL_PERIOD_LIMIT && (
        <div className="error-box">
          최근 {ALL_PERIOD_LIMIT}건만 표시 중입니다. 더 오래된 데이터를 보려면
          기간 필터를 좁혀서 확인해주세요.
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>정산할 운송오더 *</label>
              <select
                value={selectedOrderId}
                onChange={(e) => handleSelectOrder(e.target.value)}
              >
                <option value="">선택</option>
                {availableOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_no} · {o.companies?.name || o.guest_name || "고객미상"}
                  </option>
                ))}
              </select>
              {availableOrders.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  정산 가능한(운송완료) 오더가 없습니다.
                </p>
              )}
            </div>

            <div className="form-grid" style={{ padding: 0 }}>
              <div className="field">
                <label>정산월</label>
                <input
                  type="month"
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                />
              </div>
              <div className="field">
                <label>입금 예정일</label>
                <input
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label>화주 청구금액(원) *</label>
                <MoneyInput value={customerChargeTotal} onChange={setCustomerChargeTotal} />
              </div>
              <div className="field">
                <label>차주 지급금액(원) *</label>
                <MoneyInput value={driverPayoutTotal} onChange={setDriverPayoutTotal} />
              </div>
            </div>

            {customerChargeTotal && driverPayoutTotal && (
              <p style={{ fontSize: 13, marginTop: 10 }}>
                수수료(마진):{" "}
                <strong className="num">
                  {won(Number(customerChargeTotal) - Number(driverPayoutTotal))}
                </strong>
              </p>
            )}

            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "저장 중..." : "정산 등록"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowForm(false)}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 320 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="오더번호, 화주명으로 검색"
            style={{
              width: "100%",
              padding: "9px 30px 9px 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: 13.5,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              ×
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ fontSize: 12.5, padding: "7px 8px" }}
        >
          <option value="전체">전체 상태</option>
          {INVOICE_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={settlementFilter}
          onChange={(e) => setSettlementFilter(e.target.value)}
          style={{ fontSize: 12.5, padding: "7px 8px" }}
        >
          <option value="전체">전체 수금방식</option>
          <option value="broker">주선사 정산</option>
          <option value="driver_direct">선착불</option>
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {period === "all"
              ? "등록된 정산 건이 없습니다."
              : "선택한 기간에 등록된 정산 건이 없습니다."}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>오더번호</th>
                <th style={{ whiteSpace: "nowrap", minWidth: 108 }}>화주</th>
                <th style={{ whiteSpace: "nowrap" }}>정산월</th>
                <th style={{ whiteSpace: "nowrap" }}>화주 청구금액</th>
                <th style={{ whiteSpace: "nowrap" }}>차주 지급금액</th>
                <th style={{ whiteSpace: "nowrap" }}>수수료</th>
                <th style={{ whiteSpace: "nowrap" }}>세금계산서</th>
                <th style={{ whiteSpace: "nowrap" }}>입금</th>
                <th style={{ whiteSpace: "nowrap" }}>지급</th>
                <th style={{ whiteSpace: "nowrap" }}>상태</th>
                <th>정산방식</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr
                  key={i.id}
                  onClick={() => router.push(`/admin/invoices/${i.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <span className="num">{i.orders?.order_no || "-"}</span>
                    {i.orders?.loading_type === "mixable" && (
                      <div style={{ marginTop: 3 }}>
                        <MixableBadge />
                      </div>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {i.companies?.name || i.orders?.guest_name || "-"}
                    {!i.companies?.name && i.orders?.guest_name && (
                      <span className="badge" style={{ marginLeft: 6 }}>
                        개인
                      </span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="num">{i.billing_period || "-"}</span>
                  </td>
                  {(i.collection_method || "broker") === "broker" ? (
                    <>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className="num">{won(i.customer_charge_total)}</span>
                        {i.customer_charge_total != null && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>부가세 별도</div>
                        )}
                      </td>
                      <td>
                        <span className="num" style={{ whiteSpace: "nowrap" }}>
                          {won(i.driver_payout_total)}
                        </span>
                        {i.driver_payout_total != null && i.order_id && driverCalcInfoByOrderId[i.order_id]?.throughCalc && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "normal", maxWidth: 100 }}>
                            부가세 포함
                            {driverCalcInfoByOrderId[i.order_id].insuranceApplied && (
                              <>
                                <br />
                                산재보험료 차감
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className="num">{won(i.commission_total)}</span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td colSpan={2}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "normal", maxWidth: 130, display: "inline-block" }}>
                          선착불
                          <br />
                          (차주 직접수금)
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className="num">{won(i.brokerage_fee)}</span>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "normal", maxWidth: 100 }}>
                          주선수수료
                          <br />
                          {i.brokerage_fee_paid ? "입금완료" : "입금대기"}
                        </div>
                      </td>
                    </>
                  )}
                  <td style={{ whiteSpace: "nowrap" }}>{i.tax_invoice_issued ? "발행" : "-"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{i.payment_received ? "완료" : "대기"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{i.driver_paid ? "완료" : "대기"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: getInvoiceStatusColor(i.status).bg,
                        color: getInvoiceStatusColor(i.status).text,
                      }}
                    >
                      {i.status}
                    </span>
                    {i.locked && (
                      <div style={{ marginTop: 3 }}>
                        <LockedBadge />
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{ display: "inline-block", textAlign: "center", lineHeight: 1.5 }}
                    >
                      <SettlementBadgeLabel collectionMethod={i.collection_method} billingCycle={i.billing_cycle} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
