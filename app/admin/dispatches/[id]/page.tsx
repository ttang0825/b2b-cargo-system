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
import { getCurrentStaffId, getCurrentStaffRole } from "@/lib/currentStaff";
import ProcessedByFooter from "@/components/ProcessedByFooter";
import ConflictWarning from "@/components/ConflictWarning";
import { optimisticUpdate } from "@/lib/optimisticUpdate";

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

type NetworkLite = { id: string; name: string; is_active: boolean };
type DriverLite = {
  id: string;
  name: string;
  phone: string | null;
  vehicles: { vehicle_number: string | null; vehicle_type: string | null }[];
};

export default function DispatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [dispatch, setDispatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [conflict, setConflict] = useState(false);

  const [networks, setNetworks] = useState<NetworkLite[]>([]);
  const [selectedDriverInfo, setSelectedDriverInfo] = useState<DriverLite | null>(null);
  const [driverSearch, setDriverSearch] = useState("");
  const [driverResults, setDriverResults] = useState<DriverLite[]>([]);

  const [confirmedNetworkId, setConfirmedNetworkId] = useState("");
  const [externalDriverName, setExternalDriverName] = useState("");
  const [externalDriverPhone, setExternalDriverPhone] = useState("");
  const [externalVehiclePlate, setExternalVehiclePlate] = useState("");
  const [confirming, setConfirming] = useState(false);

  const networkNameById: Record<string, string> = {};
  networks.forEach((n) => (networkNameById[n.id] = n.name));

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
  }, []);

  useEffect(() => {
    supabase
      .from("external_networks")
      .select("id,name,is_active")
      .order("sort_order", { ascending: true })
      .then(({ data }) => setNetworks((data as any as NetworkLite[]) || []));
  }, []);

  useEffect(() => {
    let active = true;
    async function search_() {
      if (driverSearch.trim().length < 1) {
        setDriverResults([]);
        return;
      }
      const { data } = await supabase
        .from("drivers")
        .select("id,name,phone,vehicles(vehicle_number,vehicle_type)")
        .ilike("name", `%${driverSearch}%`)
        .limit(8);
      if (active) setDriverResults((data as any as DriverLite[]) || []);
    }
    const t = setTimeout(search_, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [driverSearch]);

  const [editForm, setEditForm] = useState({
    customer_charge: "",
    driver_payout: "",
    pickup_confirmed: false,
    delivery_confirmed: false,
    issue_occurred: false,
    issue_notes: "",
    memo: "",
    assignment_type: "internal" as "internal" | "external",
    driver_id: null as string | null,
    requested_network_ids: [] as string[],
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
      assignment_type: (data.assignment_type as "internal" | "external") || "internal",
      driver_id: data.driver_id || null,
      requested_network_ids: data.requested_network_ids || [],
    });
    setSelectedDriverInfo(data.drivers || null);
    setConfirmedNetworkId(data.confirmed_network_id || "");
    setExternalDriverName(data.external_driver_name || "");
    setExternalDriverPhone(data.external_driver_phone || "");
    setExternalVehiclePlate(data.external_vehicle_plate || "");
    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleAssignmentTypeChange(type: "internal" | "external") {
    // 배정방식을 바꾸면 반대쪽에서 선택해뒀던 정보는 초기화 (운임은 유지)
    setEditForm((f) => ({
      ...f,
      assignment_type: type,
      driver_id: type === "internal" ? f.driver_id : null,
      requested_network_ids: type === "external" ? f.requested_network_ids : [],
    }));
    if (type === "external") {
      setSelectedDriverInfo(null);
      setDriverSearch("");
    }
  }

  async function handleConfirm() {
    setError(null);
    if (editForm.assignment_type === "internal") {
      if (!editForm.driver_id) {
        setError("배차확정하려면 차주를 먼저 선택해주세요.");
        return;
      }
    } else {
      if (!confirmedNetworkId) {
        setError("실제로 배차가 확정된 정보망을 선택해주세요.");
        return;
      }
      if (!externalDriverName.trim() || !externalDriverPhone.trim()) {
        setError("배정된 차주의 이름과 연락처를 입력해주세요.");
        return;
      }
    }

    setConfirming(true);
    const payload: any = {
      dispatch_status: "배차확정",
      assignment_type: editForm.assignment_type,
      driver_id: editForm.assignment_type === "internal" ? editForm.driver_id : null,
      requested_network_ids: editForm.requested_network_ids,
      confirmed_network_id: editForm.assignment_type === "external" ? confirmedNetworkId : null,
      external_driver_name: editForm.assignment_type === "external" ? externalDriverName.trim() : null,
      external_driver_phone: editForm.assignment_type === "external" ? externalDriverPhone.trim() : null,
      external_vehicle_plate:
        editForm.assignment_type === "external" ? externalVehiclePlate.trim() || null : null,
      customer_charge: editForm.customer_charge ? Number(editForm.customer_charge) : null,
      driver_payout: editForm.driver_payout ? Number(editForm.driver_payout) : null,
      updated_by: await getCurrentStaffId(),
    };

    const { error } = await supabase.from("dispatches").update(payload).eq("id", id);
    if (error) {
      setConfirming(false);
      setError(error.message);
      return;
    }
    if (dispatch?.orders?.id) {
      await supabase
        .from("orders")
        .update({ status: DISPATCH_TO_ORDER_STATUS["배차확정"] })
        .eq("id", dispatch.orders.id);
    }
    setConfirming(false);
    load();
  }

  async function handleStatusChange(status: string) {
    const prevStatus = dispatch?.dispatch_status;
    const { error } = await supabase
      .from("dispatches")
      .update({ dispatch_status: status, updated_by: await getCurrentStaffId() })
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

    // "운송완료"로 새로 바뀌면 정산이 없을 경우 자동 등록
    if (status === "운송완료" && prevStatus !== "운송완료" && dispatch?.orders?.id) {
      await autoCreateInvoiceIfNeeded(dispatch.orders.id);
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

  // 운송완료로 바뀐 오더에 정산이 아직 없으면 자동으로 등록
  // (화주 실적은 DB 트리거가 알아서 재계산하므로 여기서 따로 안 건드림)
  async function autoCreateInvoiceIfNeeded(orderId: string) {
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existing) return;

    const { data: order } = await supabase
      .from("orders")
      .select("company_id,individual_customer_id")
      .eq("id", orderId)
      .single();

    const charge = Number(editForm.customer_charge) || 0;
    const payout = Number(editForm.driver_payout) || 0;
    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { error: invoiceError } = await supabase.from("invoices").insert({
      order_id: orderId,
      company_id: order?.company_id || null,
      individual_customer_id: order?.individual_customer_id || null,
      billing_period: billingPeriod,
      customer_charge_total: charge || null,
      driver_payout_total: payout || null,
      commission_total: charge - payout || null,
      receivable_amount: charge || null,
      payable_amount: payout || null,
      status: "정산대기",
      created_by: await getCurrentStaffId(),
    });
    if (invoiceError) {
      setError(`정산 자동등록에 실패했습니다: ${invoiceError.message}`);
    }
  }

  async function handleSave(force = false) {
    setSaving(true);
    setError(null);
    setConflict(false);
    const payload = {
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
      assignment_type: editForm.assignment_type,
      driver_id: editForm.assignment_type === "internal" ? editForm.driver_id : null,
      requested_network_ids: editForm.requested_network_ids,
      updated_by: await getCurrentStaffId(),
    };

    if (force) {
      const { error } = await supabase.from("dispatches").update(payload).eq("id", id);
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/admin/dispatches");
      return;
    }

    const { conflict: hasConflict, error } = await optimisticUpdate(
      "dispatches",
      id,
      payload,
      dispatch?.updated_at
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
    router.push("/admin/dispatches");
  }

  async function handleDelete() {
    if (!dispatch) return;
    const confirmed = window.confirm(
      "이 배차 기록을 삭제하시겠습니까? 연결된 오더는 '접수' 상태로 되돌아갑니다."
    );
    if (!confirmed) return;
    setDeleting(true);
    const res = await fetch("/api/admin/delete-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "dispatches", id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleting(false);
      setError(data.error || "삭제에 실패했습니다.");
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
            {deleting ? "확인 중..." : "배차 삭제"}
          </button>
        )}
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
            배차상태
          </div>
          {dispatch.dispatch_status === "접수중" ? (
            <span
              style={{
                display: "inline-block",
                fontWeight: 600,
                padding: "5px 10px",
                borderRadius: 999,
                background: statusColor.bg,
                color: statusColor.text,
              }}
            >
              접수중
            </span>
          ) : (
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
              {DISPATCH_STATUS_OPTIONS.filter((s) => s !== "접수중").map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        {dispatch.dispatch_status === "접수중" ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 6 }}>
                배정방식
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className={editForm.assignment_type === "internal" ? "btn" : "btn btn-ghost"}
                  style={{ fontSize: 12.5, padding: "7px 12px" }}
                  onClick={() => handleAssignmentTypeChange("internal")}
                >
                  내부차주
                </button>
                <button
                  type="button"
                  className={editForm.assignment_type === "external" ? "btn" : "btn btn-ghost"}
                  style={{ fontSize: 12.5, padding: "7px 12px" }}
                  onClick={() => handleAssignmentTypeChange("external")}
                >
                  외부정보망
                </button>
              </div>
            </div>

            {editForm.assignment_type === "internal" ? (
              <div className="field" style={{ marginBottom: 14 }}>
                <label>배정할 차주</label>
                <input
                  value={selectedDriverInfo ? selectedDriverInfo.name : driverSearch}
                  onChange={(e) => {
                    setSelectedDriverInfo(null);
                    setEditForm((f) => ({ ...f, driver_id: null }));
                    setDriverSearch(e.target.value);
                  }}
                  placeholder="이름으로 검색"
                />
                {!selectedDriverInfo && driverResults.length > 0 && (
                  <div className="card" style={{ marginTop: 6, maxHeight: 160, overflowY: "auto" }}>
                    {driverResults.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setSelectedDriverInfo(d);
                          setEditForm((f) => ({ ...f, driver_id: d.id }));
                          setDriverResults([]);
                        }}
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          cursor: "pointer",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {d.name}{" "}
                        <span style={{ color: "var(--text-muted)" }}>
                          {d.vehicles?.[0]?.vehicle_number || ""} {d.vehicles?.[0]?.vehicle_type || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="field" style={{ marginBottom: 14 }}>
                <label>후보 정보망 (여러 곳 선택 가능)</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {networks.filter((n) => n.is_active).map((n) => (
                    <label
                      key={n.id}
                      className="badge"
                      style={{
                        cursor: "pointer",
                        border: editForm.requested_network_ids.includes(n.id)
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border)",
                        background: editForm.requested_network_ids.includes(n.id)
                          ? "var(--accent-soft)"
                          : "var(--surface)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editForm.requested_network_ids.includes(n.id)}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            requested_network_ids: e.target.checked
                              ? [...f.requested_network_ids, n.id]
                              : f.requested_network_ids.filter((id) => id !== n.id),
                          }))
                        }
                        style={{ margin: 0 }}
                      />
                      {n.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16 }}>
              <h4 style={{ fontSize: 13.5, marginTop: 0, marginBottom: 10 }}>배차확정</h4>
              {editForm.assignment_type === "internal" ? (
                <div>
                  <p style={{ fontSize: 13, marginBottom: 10 }}>
                    선택된 차주:{" "}
                    {selectedDriverInfo ? (
                      <strong>
                        {selectedDriverInfo.name} ({selectedDriverInfo.phone || "연락처 미상"})
                      </strong>
                    ) : (
                      "아직 선택되지 않았습니다"
                    )}
                  </p>
                  <button className="btn" onClick={handleConfirm} disabled={!editForm.driver_id || confirming}>
                    {confirming ? "확정 중..." : "배차확정"}
                  </button>
                </div>
              ) : (
                <div className="form-grid" style={{ padding: 0 }}>
                  <div className="field">
                    <label>실제로 확정된 정보망</label>
                    <select value={confirmedNetworkId} onChange={(e) => setConfirmedNetworkId(e.target.value)}>
                      <option value="">선택</option>
                      {editForm.requested_network_ids.map((nid) => (
                        <option key={nid} value={nid}>
                          {networkNameById[nid] || nid}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>배정된 차주 이름</label>
                    <input value={externalDriverName} onChange={(e) => setExternalDriverName(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>배정된 차주 연락처</label>
                    <input value={externalDriverPhone} onChange={(e) => setExternalDriverPhone(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>차량번호</label>
                    <input value={externalVehiclePlate} onChange={(e) => setExternalVehiclePlate(e.target.value)} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <button className="btn" onClick={handleConfirm} disabled={confirming}>
                      {confirming ? "확정 중..." : "배차확정"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            {dispatch.assignment_type === "external" ? (
              <>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>배정 정보망</div>
                  <div style={{ fontSize: 13.5 }}>
                    {dispatch.confirmed_network_id ? networkNameById[dispatch.confirmed_network_id] || "-" : "-"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차주</div>
                  <div style={{ fontSize: 13.5 }}>{dispatch.external_driver_name || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차주 연락처</div>
                  <div style={{ fontSize: 13.5 }}>{dispatch.external_driver_phone || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차량번호</div>
                  <div style={{ fontSize: 13.5 }}>{dispatch.external_vehicle_plate || "-"}</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차주</div>
                  <div style={{ fontSize: 13.5 }}>
                    {dispatch.drivers ? (
                      <Link href={`/admin/drivers/${dispatch.drivers.id}`} style={{ textDecoration: "underline" }}>
                        {dispatch.drivers.name}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차주 연락처</div>
                  <div style={{ fontSize: 13.5 }}>{dispatch.drivers?.phone || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차량</div>
                  <div style={{ fontSize: 13.5 }}>
                    {dispatch.drivers?.vehicles?.[0]?.vehicle_number || "-"}{" "}
                    {dispatch.drivers?.vehicles?.[0]?.vehicle_type || ""}
                  </div>
                </div>
              </>
            )}
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>품목</div>
              <div style={{ fontSize: 13.5 }}>{dispatch.orders?.item || "-"}</div>
            </div>
            {dispatch.orders?.id && (
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>오더 상세</div>
                <Link href={`/admin/orders/${dispatch.orders.id}`} style={{ fontSize: 13.5, textDecoration: "underline" }}>
                  오더 페이지로 이동 →
                </Link>
              </div>
            )}
          </div>
        )}
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

      <button className="btn" onClick={() => handleSave()} disabled={saving}>
        {saving ? "저장 중..." : "변경사항 저장"}
      </button>

      <ProcessedByFooter
        createdBy={dispatch.created_by}
        createdAt={dispatch.created_at}
        updatedBy={dispatch.updated_by}
        updatedAt={dispatch.updated_at}
      />
    </main>
  );
}
