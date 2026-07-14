"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  DISPATCH_STATUS_OPTIONS,
  getDispatchStatusColor,
  DISPATCH_TO_ORDER_STATUS,
} from "@/lib/dispatchStatusColors";

type OrderLite = {
  id: string;
  order_no: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  quote_id: string | null;
  companies: { name: string } | null;
  guest_name: string | null;
};

type DriverLite = {
  id: string;
  name: string;
  phone: string | null;
  vehicles: { vehicle_number: string | null; vehicle_type: string | null }[];
};

type DispatchRow = {
  id: string;
  dispatch_status: string;
  customer_charge: number | null;
  driver_payout: number | null;
  margin: number | null;
  created_at: string;
  orders: {
    order_no: string | null;
    origin: string | null;
    destination: string | null;
    companies: { name: string } | null;
    guest_name: string | null;
  } | null;
  drivers: { name: string; phone: string | null } | null;
};

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function DispatchesPage() {
  const router = useRouter();
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);
  const [availableOrders, setAvailableOrders] = useState<OrderLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [driverResults, setDriverResults] = useState<DriverLite[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverLite | null>(
    null
  );
  const [customerCharge, setCustomerCharge] = useState("");
  const [driverPayout, setDriverPayout] = useState("");
  const [memo, setMemo] = useState("");

  async function loadDispatches() {
    setLoading(true);
    const { data, error } = await supabase
      .from("dispatches")
      .select(
        "id,dispatch_status,customer_charge,driver_payout,margin,created_at,orders(order_no,origin,destination,companies(name),guest_name),drivers(name,phone)"
      )
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setDispatches(data as any as DispatchRow[]);
    setLoading(false);
  }

  async function loadAvailableOrders() {
    // 배차 전(접수/배차중) 상태의 오더만 후보로 보여줌
    const { data } = await supabase
      .from("orders")
      .select(
        "id,order_no,origin,destination,vehicle_type,quote_id,companies(name),guest_name"
      )
      .in("status", ["접수", "배차중"])
      .order("created_at", { ascending: false });
    setAvailableOrders((data as any as OrderLite[]) || []);
  }

  useEffect(() => {
    loadDispatches();
    loadAvailableOrders();
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

  async function handleSelectOrder(orderId: string) {
    setSelectedOrderId(orderId);
    const order = availableOrders.find((o) => o.id === orderId);
    if (order?.quote_id) {
      const { data: q } = await supabase
        .from("quotes")
        .select("final_amount")
        .eq("id", order.quote_id)
        .single();
      if (q?.final_amount) setCustomerCharge(String(Math.round(q.final_amount)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedOrderId) {
      setError("배차할 운송오더를 선택해주세요.");
      return;
    }
    if (!selectedDriver) {
      setError("배정할 차주를 검색해서 선택해주세요.");
      return;
    }

    setSaving(true);
    const vehicleId = null; // vehicles 테이블은 driver_id로 조회 가능하므로 필요 시 추후 연결

    const { error } = await supabase.from("dispatches").insert({
      order_id: selectedOrderId,
      driver_id: selectedDriver.id,
      vehicle_id: vehicleId,
      dispatch_status: "배차확정",
      customer_charge: customerCharge ? Number(customerCharge) : null,
      driver_payout: driverPayout ? Number(driverPayout) : null,
      memo: memo || null,
    });

    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    // 오더 상태도 "배차완료"로 같이 갱신
    await supabase
      .from("orders")
      .update({ status: DISPATCH_TO_ORDER_STATUS["배차확정"] })
      .eq("id", selectedOrderId);

    setSaving(false);
    setShowForm(false);
    setSelectedOrderId("");
    setSelectedDriver(null);
    setDriverSearch("");
    setCustomerCharge("");
    setDriverPayout("");
    setMemo("");
    loadDispatches();
    loadAvailableOrders();
  }

  async function handleStatusChange(
    dispatchId: string,
    orderNo: string | null,
    status: string
  ) {
    const { error } = await supabase
      .from("dispatches")
      .update({ dispatch_status: status })
      .eq("id", dispatchId);
    if (error) {
      setError(error.message);
      return;
    }
    setDispatches((prev) =>
      prev.map((d) =>
        d.id === dispatchId ? { ...d, dispatch_status: status } : d
      )
    );

    // 연결된 오더 상태도 같이 갱신 (배차 테이블에서 order_id를 다시 조회)
    const { data: dispatch } = await supabase
      .from("dispatches")
      .select("order_id")
      .eq("id", dispatchId)
      .single();
    if (dispatch?.order_id && DISPATCH_TO_ORDER_STATUS[status]) {
      await supabase
        .from("orders")
        .update({ status: DISPATCH_TO_ORDER_STATUS[status] })
        .eq("id", dispatch.order_id);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return dispatches;
    const q = search.trim().toLowerCase();
    return dispatches.filter((d) => {
      const customer = d.orders?.companies?.name || d.orders?.guest_name || "";
      return (
        (d.orders?.order_no || "").toLowerCase().includes(q) ||
        customer.toLowerCase().includes(q) ||
        (d.drivers?.name || "").toLowerCase().includes(q)
      );
    });
  }, [dispatches, search]);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">배차 관리</h1>
          <p className="page-desc">
            접수된 운송오더에 차주를 배정하고 진행상태를 관리합니다.
          </p>
        </div>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "닫기" : "+ 신규 배차"}
        </button>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <form onSubmit={handleSubmit}>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>배차할 운송오더 *</label>
              <select
                value={selectedOrderId}
                onChange={(e) => handleSelectOrder(e.target.value)}
              >
                <option value="">선택</option>
                {availableOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_no} · {o.companies?.name || o.guest_name || "고객미상"} ·{" "}
                    {o.origin} → {o.destination}
                  </option>
                ))}
              </select>
              {availableOrders.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  배차 대기 중인 오더가 없습니다. 먼저 운송오더를 등록해주세요.
                </p>
              )}
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label>배정할 차주 *</label>
              <input
                value={selectedDriver ? selectedDriver.name : driverSearch}
                onChange={(e) => {
                  setSelectedDriver(null);
                  setDriverSearch(e.target.value);
                }}
                placeholder="차주명 검색"
              />
              {!selectedDriver && driverResults.length > 0 && (
                <div
                  className="card"
                  style={{ marginTop: 6, maxHeight: 160, overflowY: "auto" }}
                >
                  {driverResults.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => {
                        setSelectedDriver(d);
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
                        {d.vehicles?.[0]?.vehicle_number || ""}{" "}
                        {d.vehicles?.[0]?.vehicle_type || ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-grid" style={{ padding: 0 }}>
              <div className="field">
                <label>화주 청구운임(원)</label>
                <input
                  type="number"
                  value={customerCharge}
                  onChange={(e) => setCustomerCharge(e.target.value)}
                />
              </div>
              <div className="field">
                <label>차주 지급운임(원)</label>
                <input
                  type="number"
                  value={driverPayout}
                  onChange={(e) => setDriverPayout(e.target.value)}
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>메모</label>
                <textarea
                  rows={2}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </div>
            </div>

            {customerCharge && driverPayout && (
              <p style={{ fontSize: 13, marginTop: 10 }}>
                예상 마진:{" "}
                <strong>
                  {won(Number(customerCharge) - Number(driverPayout))}
                </strong>
              </p>
            )}

            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "저장 중..." : "배차 확정"}
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

      <div style={{ position: "relative", maxWidth: 320, marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="오더번호, 고객명, 차주명으로 검색"
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

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">등록된 배차가 없습니다.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>오더번호</th>
                <th>고객</th>
                <th>구간</th>
                <th>차주</th>
                <th>청구운임</th>
                <th>지급운임</th>
                <th>마진</th>
                <th>배차상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => router.push(`/admin/dispatches/${d.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{d.orders?.order_no || "-"}</td>
                  <td>{d.orders?.companies?.name || d.orders?.guest_name || "-"}</td>
                  <td>
                    {d.orders?.origin || "-"} → {d.orders?.destination || "-"}
                  </td>
                  <td>{d.drivers?.name || "-"}</td>
                  <td>{won(d.customer_charge)}</td>
                  <td>{won(d.driver_payout)}</td>
                  <td>{won(d.margin)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      value={d.dispatch_status}
                      onChange={(e) =>
                        handleStatusChange(
                          d.id,
                          d.orders?.order_no || null,
                          e.target.value
                        )
                      }
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "none",
                        fontWeight: 600,
                        background: getDispatchStatusColor(d.dispatch_status).bg,
                        color: getDispatchStatusColor(d.dispatch_status).text,
                      }}
                    >
                      {DISPATCH_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
