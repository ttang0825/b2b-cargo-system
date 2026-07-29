"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ORDER_STATUS_OPTIONS, getOrderStatusColor } from "@/lib/orderStatusColors";
import { LOADING_METHOD_OPTIONS } from "@/lib/loadingMethods";
import { SETTLEMENT_TYPES, getSettlementTypeLabel } from "@/lib/constants";
import DateTimePicker from "@/components/DateTimePicker";
import AddressSearch from "@/components/AddressSearch";
import SettlementTypeChangeModal from "@/components/SettlementTypeChangeModal";
import { getCurrentStaffId, getCurrentStaffRole } from "@/lib/currentStaff";
import ProcessedByFooter from "@/components/ProcessedByFooter";
import ConflictWarning from "@/components/ConflictWarning";
import { optimisticUpdate } from "@/lib/optimisticUpdate";
import { logSettlementTypeChange } from "@/lib/settlementTypeChangeLog";

type OrderDetail = {
  id: string;
  order_no: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  item: string | null;
  status: string;
  settlement_type: string | null;
  requested_pickup_at: string | null;
  requested_delivery_at: string | null;
  load_condition: string | null;
  unload_condition: string | null;
  special_notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  company_id: string | null;
  quote_id: string | null;
  individual_customer_id: string | null;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [linkedDispatchId, setLinkedDispatchId] = useState<string | null>(null);
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [settlementSaving, setSettlementSaving] = useState(false);

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
  }, []);

  const [editForm, setEditForm] = useState({
    status: "",
    origin: "",
    originDetail: "",
    originSido: "",
    originSigungu: "",
    destination: "",
    destinationDetail: "",
    destinationSido: "",
    destinationSigungu: "",
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
      originDetail: "",
      originSido: data.origin_sido || "",
      originSigungu: data.origin_sigungu || "",
      destination: data.destination || "",
      destinationDetail: "",
      destinationSido: data.destination_sido || "",
      destinationSigungu: data.destination_sigungu || "",
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

    const { data: dispatchRow } = await supabase
      .from("dispatches")
      .select("id")
      .eq("order_id", id)
      .limit(1)
      .maybeSingle();
    setLinkedDispatchId(dispatchRow?.id || null);

    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave(force = false) {
    setSaving(true);
    setError(null);
    setConflict(false);
    const fullOrigin = [editForm.origin, editForm.originDetail].filter((v) => v.trim()).join(" ");
    const fullDestination = [editForm.destination, editForm.destinationDetail].filter((v) => v.trim()).join(" ");
    const payload = {
      status: editForm.status,
      origin: fullOrigin || null,
      origin_sido: editForm.originSido || null,
      origin_sigungu: editForm.originSigungu || null,
      destination: fullDestination || null,
      destination_sido: editForm.destinationSido || null,
      destination_sigungu: editForm.destinationSigungu || null,
      vehicle_type: editForm.vehicle_type || null,
      item: editForm.item || null,
      requested_pickup_at: editForm.requested_pickup_at || null,
      requested_delivery_at: editForm.requested_delivery_at || null,
      load_condition: editForm.load_condition || null,
      unload_condition: editForm.unload_condition || null,
      special_notes: editForm.special_notes || null,
      updated_by: await getCurrentStaffId(),
    };

    if (force) {
      const { error } = await supabase.from("orders").update(payload).eq("id", id);
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      setEditing(false);
      load();
      return;
    }

    const { conflict: hasConflict, error } = await optimisticUpdate(
      "orders",
      id,
      payload,
      order?.updated_at
    );
    setSaving(false);
    if (error) {
      setError(error);
      return;
    }
    if (hasConflict) {
      setConflict(true);
      return;
    }
    setEditing(false);
    load();
  }

  // "접수" 단계에서는 자유롭게 변경, 그 이후(배차중~운송완료)는 이미 진행 중인
  // 오더라 사유 입력 모달(SettlementTypeChangeModal)을 거쳐야만 변경 가능.
  // 두 경로 다 즉시 저장 후 load()로 전체를 다시 불러옴 (원칙 36번 — 부분 병합 금지)
  async function handleSettlementTypeChange(newType: string, reason: string | null) {
    if (!order) return;
    setSettlementSaving(true);
    setError(null);
    const staffId = await getCurrentStaffId();
    const beforeType = order.settlement_type;
    const { error } = await supabase
      .from("orders")
      .update({ settlement_type: newType, updated_by: staffId })
      .eq("id", id);
    if (error) {
      setSettlementSaving(false);
      setError(error.message);
      return;
    }
    if (reason) {
      await logSettlementTypeChange({
        targetTable: "orders",
        targetId: id,
        beforeType,
        afterType: newType,
        reason,
        changedBy: staffId,
      });
    }
    setSettlementSaving(false);
    setSettlementModalOpen(false);
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
    const res = await fetch("/api/admin/delete-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "orders", id }),
    });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "삭제에 실패했습니다.");
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
  // 배차가 실제로 매칭되기 전(접수/배차중)에는 화주와 세부조율 중이라 정산방식을
  // 자유롭게 바꿀 수 있고, 배차완료부터는 사유 입력이 필요함 (원칙 39번)
  const settlementNeedsReason = ["배차완료", "운송중", "운송완료"].includes(order.status);

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
            {order.individual_customer_id && (
              <>
                {" "}
                <Link
                  href={`/admin/individual-customers/${order.individual_customer_id}`}
                  style={{ fontSize: 12, textDecoration: "underline" }}
                >
                  개인고객 상세 보기 →
                </Link>
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!editing ? (
            <>
              {linkedDispatchId ? (
                <Link href={`/admin/dispatches/${linkedDispatchId}`} className="btn btn-ghost">
                  배차 상세보기
                </Link>
              ) : (
                <Link href={`/admin/dispatches?from_order=${id}`} className="btn">
                  배차관리로 이동
                </Link>
              )}
              <button className="btn" onClick={() => setEditing(true)}>
                정보 수정
              </button>
              {isAdmin && (
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
              )}
            </>
          ) : (
            <>
              <button className="btn" onClick={() => handleSave()} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setEditing(false);
                  setConflict(false);
                  load();
                }}
              >
                취소
              </button>
            </>
          )}
        </div>
      </div>

      {conflict && (
        <ConflictWarning
          onReload={() => {
            setConflict(false);
            load();
          }}
          onForceSave={() => handleSave(true)}
          saving={saving}
        />
      )}

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
              정산방식
            </div>
            {!settlementNeedsReason ? (
              <select
                value={order.settlement_type || "general"}
                onChange={(e) => handleSettlementTypeChange(e.target.value, null)}
                disabled={settlementSaving}
                style={{ fontWeight: 600 }}
              >
                {SETTLEMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="badge">{getSettlementTypeLabel(order.settlement_type)}</span>
            )}
          </div>
          {settlementNeedsReason && (
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }}
              onClick={() => setSettlementModalOpen(true)}
            >
              정산방식 변경
            </button>
          )}
        </div>
        {settlementNeedsReason && (
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
            배차완료 이후라 정산방식을 바꾸려면 사유를 입력해야 합니다.
          </p>
        )}
      </div>

      {settlementModalOpen && (
        <SettlementTypeChangeModal
          currentType={order.settlement_type || "general"}
          onCancel={() => setSettlementModalOpen(false)}
          onConfirm={(newType, reason) => handleSettlementTypeChange(newType, reason)}
          saving={settlementSaving}
        />
      )}

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
            <AddressSearch
              label="출발지"
              value={editForm.origin}
              detailValue={editForm.originDetail}
              detailPlaceholder="추가 상세주소 (선택)"
              onChange={(addr, sido, sigungu) =>
                setEditForm({ ...editForm, origin: addr, originSido: sido, originSigungu: sigungu })
              }
              onDetailChange={(v) => setEditForm({ ...editForm, originDetail: v })}
            />
            <AddressSearch
              label="도착지"
              value={editForm.destination}
              detailValue={editForm.destinationDetail}
              detailPlaceholder="추가 상세주소 (선택)"
              onChange={(addr, sido, sigungu) =>
                setEditForm({ ...editForm, destination: addr, destinationSido: sido, destinationSigungu: sigungu })
              }
              onDetailChange={(v) => setEditForm({ ...editForm, destinationDetail: v })}
            />
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
                {LOADING_METHOD_OPTIONS.map((c) => (
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
                {LOADING_METHOD_OPTIONS.map((c) => (
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

      <ProcessedByFooter
        createdBy={order.created_by}
        createdAt={order.created_at}
        updatedBy={order.updated_by}
        updatedAt={order.updated_at}
      />
    </main>
  );
}
