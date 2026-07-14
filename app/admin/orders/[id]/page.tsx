"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ORDER_STATUS_OPTIONS, getOrderStatusColor } from "@/lib/orderStatusColors";
import { LOAD_UNLOAD_CONDITIONS } from "@/lib/constants";
import DateTimePicker from "../DateTimePicker";

type OrderDetail = {
  id: string;
  order_no: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  item: string | null;
  status: string;
  requested_pickup_at: string | null;
  requested_delivery_at: string | null;
  load_condition: string | null;
  unload_condition: string | null;
  special_notes: string | null;
  created_at: string;
  guest_name: string | null;
  guest_phone: string | null;
  company_id: string | null;
  quote_id: string | null;
  companies: { id: string; name: string; phone: string | null } | null;
};

function Field({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div style={{ marginBottom: 10, minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{label}</div>
      <div
        style={{
          fontSize: 13.5,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {String(value)}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editForm, setEditForm] = useState({
    status: "",
    origin: "",
    destination: "",
    vehicle_type: "",
    item: "",
    requested_pickup_at: "",
    requested_delivery_at: "",
    load_condition: "",
    unload_condition: "",
    special_notes: "",
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, companies(id,name,phone)")
      .eq("id", id)
      .single();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setOrder(data as any);
    setEditForm({
      status: data.status || "접수",
      origin: data.origin || "",
      destination: data.destination || "",
      vehicle_type: data.vehicle_type || "",
      item: data.item || "",
      requested_pickup_at: data.requested_pickup_at
        ? data.requested_pickup_at.slice(0, 16)
        : "",
      requested_delivery_at: data.requested_delivery_at
        ? data.requested_delivery_at.slice(0, 16)
        : "",
      load_condition: data.load_condition || "",
      unload_condition: data.unload_condition || "",
      special_notes: data.special_notes || "",
    });
    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("orders")
      .update({
        status: editForm.status,
        origin: editForm.origin || null,
        destination: editForm.destination || null,
        vehicle_type: editForm.vehicle_type || null,
        item: editForm.item || null,
        requested_pickup_at: editForm.requested_pickup_at || null,
        requested_delivery_at: editForm.requested_delivery_at || null,
        load_condition: editForm.load_condition || null,
        unload_condition: editForm.unload_condition || null,
        special_notes: editForm.special_notes || null,
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

  async function handleDelete() {
    if (!order) return;
    setDeleting(true);
    setError(null);

    const [dispatchRes, invoiceRes] = await Promise.all([
      supabase
        .from("dispatches")
        .select("id", { count: "exact", head: true })
        .eq("order_id", id),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("order_id", id),
    ]);
    const relatedCount = (dispatchRes.count || 0) + (invoiceRes.count || 0);
    if (relatedCount > 0) {
      setDeleting(false);
      alert(
        `이 오더는 배차/정산 기록이 ${relatedCount}건 있어 삭제할 수 없습니다.\n대신 상태를 "취소"로 변경해주세요.`
      );
      return;
    }

    const confirmed = window.confirm(
      `오더 "${order.order_no}"를 삭제하시겠습니까? 되돌릴 수 없습니다.`
    );
    if (!confirmed) {
      setDeleting(false);
      return;
    }
    const { error } = await supabase.from("orders").delete().eq("id", id);
    setDeleting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/admin/orders");
  }

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="container">
        <div className="error-box">오더 정보를 불러오지 못했습니다. {error}</div>
        <Link href="/admin/orders" className="btn btn-ghost">
          ← 목록으로
        </Link>
      </main>
    );
  }

  const statusColor = getOrderStatusColor(order.status);

  return (
    <main className="container">
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/admin/orders"
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          ← 운송오더 목록으로
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{order.order_no}</h1>
          <p className="page-desc">
            {order.companies?.name || order.guest_name}
            {!order.companies && order.guest_name && (
              <span className="badge" style={{ marginLeft: 8 }}>
                개인/신규
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!editing ? (
            <>
              <button className="btn" onClick={() => setEditing(true)}>
                정보 수정
              </button>
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
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        {editing ? (
          <div className="form-grid" style={{ padding: 0 }}>
            <div className="field">
              <label>배차상태</label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
                style={{
                  fontWeight: 600,
                  background: getOrderStatusColor(editForm.status).bg,
                  color: getOrderStatusColor(editForm.status).text,
                }}
              >
                {ORDER_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>출발지</label>
              <input
                value={editForm.origin}
                onChange={(e) =>
                  setEditForm({ ...editForm, origin: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>도착지</label>
              <input
                value={editForm.destination}
                onChange={(e) =>
                  setEditForm({ ...editForm, destination: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>차량</label>
              <input
                value={editForm.vehicle_type}
                onChange={(e) =>
                  setEditForm({ ...editForm, vehicle_type: e.target.value })
                }
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <DateTimePicker
                label="상차 예정일시"
                value={editForm.requested_pickup_at}
                onChange={(v) =>
                  setEditForm({ ...editForm, requested_pickup_at: v })
                }
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <DateTimePicker
                label="하차 예정일시"
                value={editForm.requested_delivery_at}
                onChange={(v) =>
                  setEditForm({ ...editForm, requested_delivery_at: v })
                }
              />
            </div>
            <div className="field">
              <label>상차 조건</label>
              <select
                value={editForm.load_condition}
                onChange={(e) =>
                  setEditForm({ ...editForm, load_condition: e.target.value })
                }
              >
                <option value="">선택</option>
                {LOAD_UNLOAD_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>하차 조건</label>
              <select
                value={editForm.unload_condition}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    unload_condition: e.target.value,
                  })
                }
              >
                <option value="">선택</option>
                {LOAD_UNLOAD_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>품목</label>
              <input
                value={editForm.item}
                onChange={(e) =>
                  setEditForm({ ...editForm, item: e.target.value })
                }
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>특이사항</label>
              <textarea
                rows={3}
                value={editForm.special_notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, special_notes: e.target.value })
                }
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 4,
            }}
          >
            <div style={{ marginBottom: 10, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                배차상태
              </div>
              <span
                style={{
                  display: "inline-block",
                  marginTop: 2,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: statusColor.bg,
                  color: statusColor.text,
                }}
              >
                {order.status}
              </span>
            </div>
            <Field label="출발지" value={order.origin} />
            <Field label="도착지" value={order.destination} />
            <Field label="차량" value={order.vehicle_type} />
            <Field
              label="상차 예정일시"
              value={
                order.requested_pickup_at
                  ? new Date(order.requested_pickup_at).toLocaleString("ko-KR")
                  : null
              }
            />
            <Field
              label="하차 예정일시"
              value={
                order.requested_delivery_at
                  ? new Date(order.requested_delivery_at).toLocaleString(
                      "ko-KR"
                    )
                  : null
              }
            />
            <Field label="상차 조건" value={order.load_condition} />
            <Field label="하차 조건" value={order.unload_condition} />
            <Field label="품목" value={order.item} />
            <Field label="고객 연락처" value={order.guest_phone} />
          </div>
        )}
        {order.special_notes && !editing && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              특이사항
            </div>
            <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>
              {order.special_notes}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 10 }}>
          연결 정보
        </h3>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {order.companies && (
            <Link
              href={`/admin/companies/${order.companies.id}`}
              style={{ fontSize: 13, textDecoration: "underline" }}
            >
              화주 상세 → {order.companies.name}
            </Link>
          )}
          {order.quote_id && (
            <Link
              href={`/admin/quotes/${order.quote_id}`}
              style={{ fontSize: 13, textDecoration: "underline" }}
            >
              원본 견적 보기 →
            </Link>
          )}
        </div>
      </div>

      <div
        className="card"
        style={{ padding: 20, marginBottom: 20, opacity: 0.6 }}
      >
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 6 }}>
          배차 정보 · 정산 정보
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>
          다음 단계(배차/정산 화면 제작)에서 이 오더와 연결된 기사·차량·정산
          내역이 이 자리에 표시됩니다.
        </p>
      </div>
    </main>
  );
}
