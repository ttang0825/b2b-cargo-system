"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  INVOICE_STATUS_OPTIONS,
  getInvoiceStatusColor,
} from "@/lib/invoiceStatusColors";

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    status: "정산대기",
    tax_invoice_issued: false,
    tax_invoice_date: "",
    payment_received: false,
    payment_received_date: "",
    driver_paid: false,
    driver_paid_date: "",
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*, orders(id,order_no), companies(id,name)")
      .eq("id", id)
      .single();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setInvoice(data);
    setEditForm({
      status: data.status || "정산대기",
      tax_invoice_issued: data.tax_invoice_issued || false,
      tax_invoice_date: data.tax_invoice_date || "",
      payment_received: data.payment_received || false,
      payment_received_date: data.payment_received_date || "",
      driver_paid: data.driver_paid || false,
      driver_paid_date: data.driver_paid_date || "",
    });
    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 화주 입금완료 + 차주 지급완료가 둘 다 체크되면 "입금완료"로,
  // 둘 중 하나라도 체크 해제되면(자동으로 입금완료가 된 상태였을 때만) "정산대기"로 되돌림
  useEffect(() => {
    if (editForm.payment_received && editForm.driver_paid) {
      if (editForm.status !== "입금완료") {
        setEditForm((prev) => ({ ...prev, status: "입금완료" }));
      }
    } else {
      if (editForm.status === "입금완료") {
        setEditForm((prev) => ({ ...prev, status: "정산대기" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.payment_received, editForm.driver_paid]);

  async function handleSave() {
    setSaveError(null);

    if (editForm.tax_invoice_issued && !editForm.tax_invoice_date) {
      setSaveError("세금계산서 발행완료를 체크하셨습니다. 발행일을 입력해주세요.");
      return;
    }
    if (editForm.payment_received && !editForm.payment_received_date) {
      setSaveError("화주 입금완료를 체크하셨습니다. 입금일을 입력해주세요.");
      return;
    }
    if (editForm.driver_paid && !editForm.driver_paid_date) {
      setSaveError("차주 지급완료를 체크하셨습니다. 지급일을 입력해주세요.");
      return;
    }

    setSaving(true);

    const wasReceived = invoice.payment_received;
    const nowReceived = editForm.payment_received;

    const { error } = await supabase
      .from("invoices")
      .update({
        status: editForm.status,
        tax_invoice_issued: editForm.tax_invoice_issued,
        tax_invoice_date: editForm.tax_invoice_date || null,
        payment_received: editForm.payment_received,
        payment_received_date: editForm.payment_received_date || null,
        driver_paid: editForm.driver_paid,
        driver_paid_date: editForm.driver_paid_date || null,
      })
      .eq("id", id);

    if (error) {
      setSaving(false);
      setSaveError(error.message);
      return;
    }

    // 입금 확인 상태가 바뀌면, 연결된 화주의 미수금을 전체 재계산합니다
    // (증분 방식 대신, 그 화주의 모든 미입금 정산건을 다시 합산 - 삭제된
    // 기록이 있어도 항상 정확합니다).
    if (invoice.companies?.id && wasReceived !== nowReceived) {
      const { data: allInvoices } = await supabase
        .from("invoices")
        .select("id,customer_charge_total,payment_received")
        .eq("company_id", invoice.companies.id);
      const outstanding = (allInvoices || [])
        .filter((i) => i.id !== id) // 이 건은 아래서 최신 nowReceived 기준으로 따로 반영
        .filter((i) => !i.payment_received)
        .reduce((sum, i) => sum + (i.customer_charge_total || 0), 0);
      const thisAmount = nowReceived ? 0 : invoice.customer_charge_total || 0;
      await supabase
        .from("companies")
        .update({ outstanding_amount: outstanding + thisAmount })
        .eq("id", invoice.companies.id);
    }

    setSaving(false);
    router.push("/admin/invoices");
  }

  async function handleDelete() {
    if (!invoice) return;
    const confirmed = window.confirm(
      "이 정산 기록을 삭제하시겠습니까? 되돌릴 수 없습니다. (화주 누적실적은 자동으로 되돌아가지 않으니 필요 시 화주 상세에서 직접 조정해주세요.)"
    );
    if (!confirmed) return;
    setDeleting(true);
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    setDeleting(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    router.push("/admin/invoices");
  }

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main className="container">
        <div className="error-box">정산 정보를 불러오지 못했습니다. {error}</div>
        <Link href="/admin/invoices" className="btn btn-ghost">
          ← 목록으로
        </Link>
      </main>
    );
  }

  const statusColor = getInvoiceStatusColor(editForm.status);

  return (
    <main className="container">
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/admin/invoices"
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          ← 정산 목록으로
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">
            {invoice.orders?.order_no || "정산 상세"}
          </h1>
          <p className="page-desc">
            {invoice.companies?.name || "-"} · {invoice.billing_period || "-"}
          </p>
        </div>
        <button
          className="btn-danger"
          onClick={handleDelete}
          disabled={deleting}
          style={{
            padding: "9px 16px",
            borderRadius: "var(--radius)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {deleting ? "확인 중..." : "삭제"}
        </button>
      </div>

      {saveError && <div className="error-box">오류: {saveError}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
            정산상태
          </div>
          <select
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            style={{
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: 999,
              border: "none",
              background: statusColor.bg,
              color: statusColor.text,
            }}
          >
            {INVOICE_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              화주 청구금액
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {won(invoice.customer_charge_total)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              차주 지급금액
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {won(invoice.driver_payout_total)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              수수료(마진)
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {won(invoice.commission_total)}
            </div>
          </div>
          {invoice.orders?.id && (
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                연결 오더
              </div>
              <Link
                href={`/admin/orders/${invoice.orders.id}`}
                style={{ fontSize: 13, textDecoration: "underline" }}
              >
                오더 페이지로 이동 →
              </Link>
            </div>
          )}
          {invoice.companies?.id && (
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                화주
              </div>
              <Link
                href={`/admin/companies/${invoice.companies.id}`}
                style={{ fontSize: 13, textDecoration: "underline" }}
              >
                {invoice.companies.name} 페이지로 이동 →
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          세금계산서 · 입금 · 지급
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          <div>
            <label
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              <input
                type="checkbox"
                checked={editForm.tax_invoice_issued}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    tax_invoice_issued: e.target.checked,
                  })
                }
              />
              세금계산서 발행완료
            </label>
            <input
              type="date"
              value={editForm.tax_invoice_date}
              onChange={(e) =>
                setEditForm({ ...editForm, tax_invoice_date: e.target.value })
              }
              disabled={!editForm.tax_invoice_issued}
            />
          </div>

          <div>
            <label
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              <input
                type="checkbox"
                checked={editForm.payment_received}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    payment_received: e.target.checked,
                  })
                }
              />
              화주 입금완료
            </label>
            <input
              type="date"
              value={editForm.payment_received_date}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  payment_received_date: e.target.value,
                })
              }
              disabled={!editForm.payment_received}
            />
          </div>

          <div>
            <label
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              <input
                type="checkbox"
                checked={editForm.driver_paid}
                onChange={(e) =>
                  setEditForm({ ...editForm, driver_paid: e.target.checked })
                }
              />
              차주 지급완료
            </label>
            <input
              type="date"
              value={editForm.driver_paid_date}
              onChange={(e) =>
                setEditForm({ ...editForm, driver_paid_date: e.target.value })
              }
              disabled={!editForm.driver_paid}
            />
          </div>
        </div>

        <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 14 }}>
          "화주 입금완료"를 체크하면 연결된 화주의 미수금이 자동으로
          차감됩니다.
        </p>
      </div>

      {saveError && <div className="error-box">오류: {saveError}</div>}
      <button className="btn" onClick={handleSave} disabled={saving}>
        {saving ? "저장 중..." : "변경사항 저장"}
      </button>
    </main>
  );
}
