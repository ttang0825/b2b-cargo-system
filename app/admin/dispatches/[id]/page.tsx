"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  DISPATCH_STATUS_OPTIONS,
  getDispatchStatusColor,
  DISPATCH_TO_ORDER_STATUS,
} from "@/lib/dispatchStatusColors";

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function DispatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [dispatch, setDispatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editForm, setEditForm] = useState({
    customer_charge: "",
    driver_payout: "",
    pickup_confirmed: false,
    delivery_confirmed: false,
    issue_occurred: false,
    issue_notes: "",
    memo: "",
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("dispatches")
      .select(
        "*, orders(id,order_no,origin,destination,item,vehicle_type), drivers(id,name,phone,vehicles(vehicle_number,vehicle_type))"
      )
      .eq("id", id)
      .single();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDispatch(data);
    setEditForm({
      customer_charge: data.customer_charge ?? "",
      driver_payout: data.driver_payout ?? "",
      pickup_confirmed: data.pickup_confirmed || false,
      delivery_confirmed: data.delivery_confirmed || false,
      issue_occurred: data.issue_occurred || false,
      issue_notes: data.issue_notes || "",
      memo: data.memo || "",
    });
    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(status: string) {
    const prevStatus = dispatch?.dispatch_status;
    const { error } = await supabase
      .from("dispatches")
      .update({ dispatch_status: status })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setDispatch((d: any) => ({ ...d, dispatch_status: status }));
    if (dispatch?.orders?.id && DISPATCH_TO_ORDER_STATUS[status]) {
      await supabase
        .from("orders")
        .update({ status: DISPATCH_TO_ORDER_STATUS[status] })
        .eq("id", dispatch.orders.id);
    }

    // "운송완료"로 새로 바뀐 경우 +1, "운송완료"에서 다른 상태로 벗어나는 경우 -1
    if (
      status === "운송완료" &&
      prevStatus !== "운송완료" &&
      dispatch?.drivers?.id
    ) {
      await adjustDriverTripCount(dispatch.drivers.id, 1);
    } else if (
      prevStatus === "운송완료" &&
      status !== "운송완료" &&
      dispatch?.drivers?.id
    ) {
      await adjustDriverTripCount(dispatch.drivers.id, -1);
    }
  }

  async function adjustDriverTripCount(driverId: string, delta: number) {
    const { data: driver } = await supabase
      .from("drivers")
      .select("completed_trip_count")
      .eq("id", driverId)
      .single();
    if (driver) {
      await supabase
        .from("drivers")
        .update({
          completed_trip_count: Math.max(
            (driver.completed_trip_count || 0) + delta,
            0
          ),
        })
        .eq("id", driverId);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("dispatches")
      .update({
        customer_charge: editForm.customer_charge
          ? Number(editForm.customer_charge)
          : null,
        driver_payout: editForm.driver_payout
          ? Number(editForm.driver_payout)
          : null,
        pickup_confirmed: editForm.pickup_confirmed,
        delivery_confirmed: editForm.delivery_confirmed,
        issue_occurred: editForm.issue_occurred,
        issue_notes: editForm.issue_notes || null,
        memo: editForm.memo || null,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/admin/dispatches");
  }

  async function handleDelete() {
    if (!dispatch) return;
    const confirmed = window.confirm(
      "이 배차 기록을 삭제하시겠습니까? 연결된 오더는 '접수' 상태로 되돌아갑니다."
    );
    if (!confirmed) return;
    setDeleting(true);
    const { error } = await supabase.from("dispatches").delete().eq("id", id);
    if (error) {
      setDeleting(false);
      setError(error.message);
      return;
    }
    if (dispatch.orders?.id) {
      await supabase
        .from("orders")
        .update({ status: "접수" })
        .eq("id", dispatch.orders.id);
    }
    // 삭제되는 배차가 "운송완료" 상태였다면, 차주의 누적 운송건수도 함께 차감합니다.
    if (dispatch.dispatch_status === "운송완료" && dispatch.drivers?.id) {
      await adjustDriverTripCount(dispatch.drivers.id, -1);
    }
    setDeleting(false);
    router.push("/admin/dispatches");
  }

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  if (error || !dispatch) {
    return (
      <main className="container">
        <div className="error-box">배차 정보를 불러오지 못했습니다. {error}</div>
        <Link href="/admin/dispatches" className="btn btn-ghost">
          ← 목록으로
        </Link>
      </main>
    );
  }

  const statusColor = getDispatchStatusColor(dispatch.dispatch_status);
  const margin =
    editForm.customer_charge && editForm.driver_payout
      ? Number(editForm.customer_charge) - Number(editForm.driver_payout)
      : null;

  return (
    <main className="container">
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/admin/dispatches"
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          ← 배차 목록으로
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">
            {dispatch.orders?.order_no || "배차 상세"}
          </h1>
          <p className="page-desc">
            {dispatch.orders?.origin} → {dispatch.orders?.destination}
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
          {deleting ? "확인 중..." : "배차 삭제"}
        </button>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
            배차상태
          </div>
          <select
            value={dispatch.dispatch_status}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: 999,
              border: "none",
              background: statusColor.bg,
              color: statusColor.text,
            }}
          >
            {DISPATCH_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차주</div>
            <div style={{ fontSize: 13.5 }}>
              {dispatch.drivers ? (
                <Link
                  href={`/admin/drivers/${dispatch.drivers.id}`}
                  style={{ textDecoration: "underline" }}
                >
                  {dispatch.drivers.name}
                </Link>
              ) : (
                "-"
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              차주 연락처
            </div>
            <div style={{ fontSize: 13.5 }}>{dispatch.drivers?.phone || "-"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              차량
            </div>
            <div style={{ fontSize: 13.5 }}>
              {dispatch.drivers?.vehicles?.[0]?.vehicle_number || "-"}{" "}
              {dispatch.drivers?.vehicles?.[0]?.vehicle_type || ""}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              품목
            </div>
            <div style={{ fontSize: 13.5 }}>{dispatch.orders?.item || "-"}</div>
          </div>
          {dispatch.orders?.id && (
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                오더 상세
              </div>
              <Link
                href={`/admin/orders/${dispatch.orders.id}`}
                style={{ fontSize: 13.5, textDecoration: "underline" }}
              >
                오더 페이지로 이동 →
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          정산 정보
        </h3>
        <div className="form-grid" style={{ padding: 0, marginBottom: 10 }}>
          <div className="field">
            <label>화주 청구운임(원)</label>
            <input
              type="number"
              step={100}
              value={editForm.customer_charge}
              onChange={(e) =>
                setEditForm({ ...editForm, customer_charge: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label>차주 지급운임(원)</label>
            <input
              type="number"
              step={100}
              value={editForm.driver_payout}
              onChange={(e) =>
                setEditForm({ ...editForm, driver_payout: e.target.value })
              }
            />
          </div>
        </div>
        <p style={{ fontSize: 13.5, fontWeight: 600 }}>
          마진: {margin !== null ? won(margin) : "-"}
        </p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          진행 체크
        </h3>
        <div style={{ display: "flex", gap: 20, marginBottom: 14, fontSize: 13 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={editForm.pickup_confirmed}
              onChange={(e) =>
                setEditForm({ ...editForm, pickup_confirmed: e.target.checked })
              }
            />
            상차 완료 확인
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={editForm.delivery_confirmed}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  delivery_confirmed: e.target.checked,
                })
              }
            />
            하차 완료 확인
          </label>
          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              color: "var(--danger)",
            }}
          >
            <input
              type="checkbox"
              checked={editForm.issue_occurred}
              onChange={(e) =>
                setEditForm({ ...editForm, issue_occurred: e.target.checked })
              }
            />
            문제 발생
          </label>
        </div>
        {editForm.issue_occurred && (
          <div className="field" style={{ marginBottom: 14 }}>
            <label>문제 상세 내용</label>
            <textarea
              rows={2}
              value={editForm.issue_notes}
              onChange={(e) =>
                setEditForm({ ...editForm, issue_notes: e.target.value })
              }
            />
          </div>
        )}
        <div className="field">
          <label>배차 메모</label>
          <textarea
            rows={2}
            value={editForm.memo}
            onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
          />
        </div>
      </div>

      <button className="btn" onClick={handleSave} disabled={saving}>
        {saving ? "저장 중..." : "변경사항 저장"}
      </button>
    </main>
  );
}
