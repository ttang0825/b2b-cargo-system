"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  DISPATCH_STATUS_OPTIONS,
  getDispatchStatusColor,
  DISPATCH_TO_ORDER_STATUS,
} from "@/lib/dispatchStatusColors";
import DateRangeFilter, { DatePreset, getDateRange } from "@/components/DateRangeFilter";
import { getCurrentStaffId } from "@/lib/currentStaff";

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
  regionMatch?: boolean;
};

type DispatchRow = {
  id: string;
  dispatch_status: string;
  customer_charge: number | null;
  driver_payout: number | null;
  margin: number | null;
  created_at: string;
  order_id: string;
  driver_id: string | null;
  orders: {
    order_no: string | null;
    origin: string | null;
    destination: string | null;
    companies: { name: string } | null;
    guest_name: string | null;
  } | null;
  drivers: { name: string; phone: string | null } | null;
};

// "전체" 기간을 선택해도 한 번에 너무 많은 데이터를 불러오지 않도록 안전장치로 상한을 둠
const ALL_PERIOD_LIMIT = 500;
const FILTERED_PERIOD_LIMIT = 500;

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
  const [period, setPeriod] = useState<DatePreset>("all");

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [driverResults, setDriverResults] = useState<DriverLite[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverLite | null>(
    null
  );
  const [recommendedDrivers, setRecommendedDrivers] = useState<DriverLite[]>(
    []
  );
  const [customerCharge, setCustomerCharge] = useState("");
  const [driverPayout, setDriverPayout] = useState("");
  const [memo, setMemo] = useState("");

  async function loadDispatches(preset: DatePreset = period) {
    setLoading(true);
    const { from } = getDateRange(preset);
    let query = supabase
      .from("dispatches")
      .select(
        "id,dispatch_status,customer_charge,driver_payout,margin,created_at,order_id,driver_id,orders(order_no,origin,destination,companies(name),guest_name),drivers(name,phone)"
      )
      .order("created_at", { ascending: false })
      .limit(preset === "all" ? ALL_PERIOD_LIMIT : FILTERED_PERIOD_LIMIT);
    if (from) query = query.gte("created_at", from);

    const { data, error } = await query;
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
    loadDispatches("all");
    loadAvailableOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 기간 필터 변경 시 배차 목록만 다시 로드
  useEffect(() => {
    loadDispatches(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

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
    setSelectedDriver(null);
    setRecommendedDrivers([]);
    const order = availableOrders.find((o) => o.id === orderId);
    if (order?.quote_id) {
      const { data: q } = await supabase
        .from("quotes")
        .select("final_amount")
        .eq("id", order.quote_id)
        .single();
      if (q?.final_amount) setCustomerCharge(String(Math.round(q.final_amount)));
    }
    // 오더가 요구하는 톤수와 같은 차량을 가진 차주를 자동으로 추천하되,
    // 운행 가능지역이 이 오더의 출발지/도착지와 겹치는 차주를 우선 표시
    if (order?.vehicle_type) {
      const { data: matchedVehicles } = await supabase
        .from("vehicles")
        .select(
          "driver_id, vehicle_number, vehicle_type, drivers(id,name,phone,operating_regions)"
        )
        .eq("vehicle_type", order.vehicle_type);

      const routeText = `${order.origin || ""} ${order.destination || ""}`;

      const drivers = (matchedVehicles || [])
        .filter((v: any) => v.drivers)
        .map((v: any) => {
          const regions: string[] = v.drivers.operating_regions
            ? v.drivers.operating_regions.split(",").map((s: string) => s.trim())
            : [];
          const regionMatch = regions.some((r) => r && routeText.includes(r));
          return {
            id: v.drivers.id,
            name: v.drivers.name,
            phone: v.drivers.phone,
            regionMatch,
            vehicles: [
              { vehicle_number: v.vehicle_number, vehicle_type: v.vehicle_type },
            ],
          };
        })
        .sort((a, b) => Number(b.regionMatch) - Number(a.regionMatch));
      setRecommendedDrivers(drivers);
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
      created_by: await getCurrentStaffId(),
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
    loadDispatches(period);
    loadAvailableOrders();
  }

  async function handleStatusChange(
    dispatchId: string,
    orderNo: string | null,
    status: string
  ) {
    const target = dispatches.find((d) => d.id === dispatchId);
    const prevStatus = target?.dispatch_status;

    const { error } = await supabase
      .from("dispatches")
      .update({ dispatch_status: status, updated_by: await getCurrentStaffId() })
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

    if (target?.order_id && DISPATCH_TO_ORDER_STATUS[status]) {
      await supabase
        .from("orders")
        .update({ status: DISPATCH_TO_ORDER_STATUS[status] })
        .eq("id", target.order_id);
    }

    // "운송완료"로 새로 바뀐 경우 +1, 벗어나는 경우 -1
    if (status === "운송완료" && prevStatus !== "운송완료" && target?.driver_id) {
      await adjustDriverTripCount(target.driver_id, 1);
    } else if (
      prevStatus === "운송완료" &&
      status !== "운송완료" &&
      target?.driver_id
    ) {
      await adjustDriverTripCount(target.driver_id, -1);
    }

    // "운송완료"로 새로 바뀌면 정산이 없을 경우 자동 등록
    if (status === "운송완료" && prevStatus !== "운송완료" && target) {
      await autoCreateInvoiceIfNeeded(target);
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

  // 운송완료로 바뀐 오더에 정산이 아직 등록되어 있지 않으면 자동으로 등록
  // (화주 실적은 DB 트리거가 알아서 재계산하므로 여기서 따로 안 건드림)
  async function autoCreateInvoiceIfNeeded(target: DispatchRow) {
    if (!target.order_id) return;

    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("order_id", target.order_id)
      .maybeSingle();
    if (existing) return;

    const { data: order } = await supabase
      .from("orders")
      .select("company_id")
      .eq("id", target.order_id)
      .single();

    const charge = target.customer_charge || 0;
    const payout = target.driver_payout || 0;
    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { error: invoiceError } = await supabase.from("invoices").insert({
      order_id: target.order_id,
      company_id: order?.company_id || null,
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
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <DateRangeFilter value={period} onChange={setPeriod} />
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "닫기" : "+ 신규 배차"}
          </button>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {period === "all" && dispatches.length >= ALL_PERIOD_LIMIT && (
        <div className="error-box">
          최근 {ALL_PERIOD_LIMIT}건만 표시 중입니다. 더 오래된 데이터를 보려면
          기간 필터를 좁혀서 확인해주세요.
        </div>
      )}

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
              {!selectedDriver && recommendedDrivers.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11.5, color: "var(--accent)", marginBottom: 4 }}>
                    ✓ 차량조건이 맞는 차주 (지역까지 일치하면 우선 표시)
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {recommendedDrivers.map((d) => (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => {
                          setSelectedDriver(d);
                          setDriverResults([]);
                        }}
                        className="badge"
                        style={{
                          cursor: "pointer",
                          border: d.regionMatch
                            ? "1px solid var(--accent)"
                            : "1px solid var(--border)",
                          background: d.regionMatch
                            ? "var(--accent-soft)"
                            : "var(--surface)",
                        }}
                      >
                        {d.regionMatch ? "📍 " : ""}
                        {d.name} ({d.vehicles?.[0]?.vehicle_number || "번호미상"})
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <input
                value={selectedDriver ? selectedDriver.name : driverSearch}
                onChange={(e) => {
                  setSelectedDriver(null);
                  setDriverSearch(e.target.value);
                }}
                placeholder="추천 차주 중에 없으면 이름으로 검색"
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
                  step={100}
                  value={customerCharge}
                  onChange={(e) => setCustomerCharge(e.target.value)}
                />
              </div>
              <div className="field">
                <label>차주 지급운임(원)</label>
                <input
                  type="number"
                  step={100}
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
                <strong className="num">
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
          <div className="empty-state">
            {period === "all"
              ? "등록된 배차가 없습니다."
              : "선택한 기간에 등록된 배차가 없습니다."}
          </div>
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
                  <td>
                    <span className="num">{d.orders?.order_no || "-"}</span>
                  </td>
                  <td>{d.orders?.companies?.name || d.orders?.guest_name || "-"}</td>
                  <td>
                    {d.orders?.origin || "-"} → {d.orders?.destination || "-"}
                  </td>
                  <td>{d.drivers?.name || "-"}</td>
                  <td>
                    <span className="num">{won(d.customer_charge)}</span>
                  </td>
                  <td>
                    <span className="num">{won(d.driver_payout)}</span>
                  </td>
                  <td>
                    <span className="num">{won(d.margin)}</span>
                  </td>
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
