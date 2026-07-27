"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentStaffId } from "@/lib/currentStaff";
import ProcessedByFooter from "@/components/ProcessedByFooter";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  memo: string | null;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string | null;
};

type AddressRow = { id: string; address: string; location_type: string | null; created_at: string };
type OrderRow = {
  id: string;
  order_no: string | null;
  origin: string | null;
  destination: string | null;
  status: string;
  created_at: string;
};
type InvoiceRow = {
  id: string;
  billing_period: string | null;
  customer_charge_total: number | null;
  status: string;
  created_at: string;
};

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR");
}

export default function IndividualCustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", memo: "" });

  async function load() {
    setLoading(true);
    const [{ data: customerData, error: customerError }, { data: addressData }, { data: orderData }, { data: invoiceData }] =
      await Promise.all([
        supabase.from("individual_customers").select("*").eq("id", id).single(),
        supabase
          .from("individual_customer_addresses")
          .select("id,address,location_type,created_at")
          .eq("individual_customer_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("id,order_no,origin,destination,status,created_at")
          .eq("individual_customer_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("invoices")
          .select("id,billing_period,customer_charge_total,status,created_at")
          .eq("individual_customer_id", id)
          .order("created_at", { ascending: false }),
      ]);
    if (customerError) {
      setError(customerError.message);
      setLoading(false);
      return;
    }
    setCustomer(customerData);
    setEditForm({
      name: customerData.name || "",
      phone: customerData.phone || "",
      email: customerData.email || "",
      memo: customerData.memo || "",
    });
    setAddresses(addressData || []);
    setOrders(orderData || []);
    setInvoices(invoiceData || []);
    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave() {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      setError("이름과 연락처를 입력해주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("individual_customers")
      .update({
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || null,
        memo: editForm.memo.trim() || null,
        updated_by: await getCurrentStaffId(),
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(false);
    load();
  }

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  if (error || !customer) {
    return (
      <main className="container">
        <div className="error-box">개인고객 정보를 불러오지 못했습니다. {error}</div>
        <Link href="/admin/individual-customers" className="btn btn-ghost">
          ← 목록으로
        </Link>
      </main>
    );
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 16 }}>
        <Link href="/admin/individual-customers" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          ← 개인고객 목록으로
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{customer.name}</h1>
          <p className="page-desc">
            <span className="num">{customer.phone}</span> · 누적 주문 {orders.length}건
          </p>
        </div>
        {!editing ? (
          <button className="btn" onClick={() => setEditing(true)}>
            정보 수정
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={handleSave} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setEditing(false);
                load();
              }}
            >
              취소
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>기본 정보</h3>
        {editing ? (
          <div className="form-grid" style={{ padding: 0 }}>
            <div className="field">
              <label>이름</label>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="field">
              <label>연락처</label>
              <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>이메일</label>
              <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>메모</label>
              <textarea rows={2} value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })} />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>연락처</div>
              <div style={{ fontSize: 13.5 }} className="num">
                {customer.phone}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>이메일</div>
              <div style={{ fontSize: 13.5 }}>{customer.email || "미입력"}</div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>메모</div>
              <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{customer.memo || "-"}</div>
            </div>
          </div>
        )}
      </div>

      {addresses.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>주소 이력</h3>
          {addresses.map((a) => (
            <div key={a.id} style={{ display: "flex", gap: 10, padding: "6px 0", fontSize: 13, borderBottom: "1px solid var(--border)" }}>
              {a.location_type && <span className="badge">{a.location_type}</span>}
              <span style={{ flex: 1 }}>{a.address}</span>
              <span className="num" style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
                {formatDate(a.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>주문 이력</h3>
        {orders.length === 0 ? (
          <div className="empty-state">주문 이력이 없습니다.</div>
        ) : (
          orders.map((o) => (
            <div
              key={o.id}
              onClick={() => router.push(`/admin/orders/${o.id}`)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                fontSize: 13,
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              <div>
                <span className="num" style={{ fontWeight: 600 }}>
                  {o.order_no}
                </span>{" "}
                <span style={{ color: "var(--text-muted)" }}>
                  {o.origin} → {o.destination}
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="badge">{o.status}</span>
                <span className="num" style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
                  {formatDate(o.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>정산 이력</h3>
        {invoices.length === 0 ? (
          <div className="empty-state">정산 이력이 없습니다.</div>
        ) : (
          invoices.map((i) => (
            <div
              key={i.id}
              onClick={() => router.push(`/admin/invoices/${i.id}`)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                fontSize: 13,
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              <div>
                <span className="num">{i.billing_period || "-"}</span>{" "}
                <span className="num" style={{ color: "var(--text-muted)" }}>
                  {won(i.customer_charge_total)}
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="badge">{i.status}</span>
                <span className="num" style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
                  {formatDate(i.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <ProcessedByFooter
        createdBy={customer.created_by}
        createdAt={customer.created_at}
        updatedBy={customer.updated_by}
        updatedAt={customer.updated_at}
      />
    </main>
  );
}
