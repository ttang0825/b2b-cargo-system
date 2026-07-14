"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  INVOICE_STATUS_OPTIONS,
  getInvoiceStatusColor,
} from "@/lib/invoiceStatusColors";

type OrderLite = {
  id: string;
  order_no: string | null;
  company_id: string | null;
  companies: { name: string } | null;
  guest_name: string | null;
};

type InvoiceRow = {
  id: string;
  billing_period: string | null;
  customer_charge_total: number | null;
  driver_payout_total: number | null;
  commission_total: number | null;
  tax_invoice_issued: boolean;
  payment_received: boolean;
  driver_paid: boolean;
  status: string;
  created_at: string;
  orders: { order_no: string | null } | null;
  companies: { name: string } | null;
};

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

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [billingPeriod, setBillingPeriod] = useState(currentMonth());
  const [customerChargeTotal, setCustomerChargeTotal] = useState("");
  const [driverPayoutTotal, setDriverPayoutTotal] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");

  async function loadInvoices() {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id,billing_period,customer_charge_total,driver_payout_total,commission_total,tax_invoice_issued,payment_received,driver_paid,status,created_at,orders(order_no),companies(name)"
      )
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setInvoices(data as any as InvoiceRow[]);
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
      .select("id,order_no,company_id,companies(name),guest_name")
      .eq("status", "운송완료")
      .order("created_at", { ascending: false });
    setAvailableOrders(
      ((data as any as OrderLite[]) || []).filter(
        (o) => !invoicedOrderIds.has(o.id)
      )
    );
  }

  useEffect(() => {
    loadInvoices();
    loadAvailableOrders();
  }, []);

  async function handleSelectOrder(orderId: string) {
    setSelectedOrderId(orderId);
    const { data: dispatch } = await supabase
      .from("dispatches")
      .select("customer_charge, driver_payout")
      .eq("order_id", orderId)
      .maybeSingle();
    if (dispatch) {
      setCustomerChargeTotal(
        dispatch.customer_charge ? String(Math.round(dispatch.customer_charge)) : ""
      );
      setDriverPayoutTotal(
        dispatch.driver_payout ? String(Math.round(dispatch.driver_payout)) : ""
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedOrderId) {
      setError("정산할 운송오더를 선택해주세요.");
      return;
    }
    setSaving(true);

    const order = availableOrders.find((o) => o.id === selectedOrderId);
    const chargeNum = Number(customerChargeTotal) || 0;
    const payoutNum = Number(driverPayoutTotal) || 0;
    const commission = chargeNum - payoutNum;

    const { error } = await supabase.from("invoices").insert({
      order_id: selectedOrderId,
      company_id: order?.company_id || null,
      billing_period: billingPeriod || null,
      customer_charge_total: chargeNum || null,
      driver_payout_total: payoutNum || null,
      commission_total: commission || null,
      payment_due_date: paymentDueDate || null,
      receivable_amount: chargeNum || null,
      payable_amount: payoutNum || null,
      status: "정산대기",
    });

    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    // 화주 CRM 누적실적 자동 반영 (법인 화주에 연결된 오더인 경우만)
    if (order?.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("total_orders_count,total_revenue,total_margin,outstanding_amount")
        .eq("id", order.company_id)
        .single();
      if (company) {
        await supabase
          .from("companies")
          .update({
            total_orders_count: (company.total_orders_count || 0) + 1,
            total_revenue: (company.total_revenue || 0) + chargeNum,
            total_margin: (company.total_margin || 0) + commission,
            outstanding_amount: (company.outstanding_amount || 0) + chargeNum,
            last_order_date: new Date().toISOString().slice(0, 10),
            repeat_customer: (company.total_orders_count || 0) + 1 > 1,
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
    loadInvoices();
    loadAvailableOrders();
  }

  const filtered = useMemo(() => {
    return invoices
      .filter((i) => statusFilter === "전체" || i.status === statusFilter)
      .filter((i) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          (i.orders?.order_no || "").toLowerCase().includes(q) ||
          (i.companies?.name || "").toLowerCase().includes(q)
        );
      });
  }, [invoices, search, statusFilter]);

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
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "닫기" : "+ 신규 정산 등록"}
        </button>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <form onSubmit={handleSubmit}>
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
                <label>화주 청구금액(원)</label>
                <input
                  type="number"
                  value={customerChargeTotal}
                  onChange={(e) => setCustomerChargeTotal(e.target.value)}
                />
              </div>
              <div className="field">
                <label>차주 지급금액(원)</label>
                <input
                  type="number"
                  value={driverPayoutTotal}
                  onChange={(e) => setDriverPayoutTotal(e.target.value)}
                />
              </div>
            </div>

            {customerChargeTotal && driverPayoutTotal && (
              <p style={{ fontSize: 13, marginTop: 10 }}>
                수수료(마진):{" "}
                <strong>
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
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">등록된 정산 건이 없습니다.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>오더번호</th>
                <th>화주</th>
                <th>정산월</th>
                <th>청구금액</th>
                <th>지급금액</th>
                <th>수수료</th>
                <th>세금계산서</th>
                <th>입금</th>
                <th>지급</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr
                  key={i.id}
                  onClick={() => router.push(`/admin/invoices/${i.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{i.orders?.order_no || "-"}</td>
                  <td>{i.companies?.name || "-"}</td>
                  <td>{i.billing_period || "-"}</td>
                  <td>{won(i.customer_charge_total)}</td>
                  <td>{won(i.driver_payout_total)}</td>
                  <td>{won(i.commission_total)}</td>
                  <td>{i.tax_invoice_issued ? "발행" : "-"}</td>
                  <td>{i.payment_received ? "완료" : "대기"}</td>
                  <td>{i.driver_paid ? "완료" : "대기"}</td>
                  <td>
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
