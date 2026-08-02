"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import {
  DISPATCH_STATUS_OPTIONS,
  getDispatchStatusColor,
  DISPATCH_TO_ORDER_STATUS,
} from "@/lib/dispatchStatusColors";
import DateRangeFilter, { DatePreset, getDateRange } from "@/components/DateRangeFilter";
import { getCurrentStaffId } from "@/lib/currentStaff";
import MoneyInput from "@/components/MoneyInput";
import MixableBadge from "@/components/MixableBadge";
import { shortAddress } from "@/lib/shortAddress";
import { calcInclusiveAmount } from "@/lib/vat";

type OrderLite = {
  id: string;
  order_no: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  settlement_type: string | null;
  collection_method: string | null;
  billing_cycle: string | null;
  direct_collection_point: string | null;
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

type NetworkLite = { id: string; name: string; is_active: boolean };

type DispatchRow = {
  id: string;
  dispatch_status: string;
  customer_charge: number | null;
  driver_payout: number | null;
  margin: number | null;
  created_at: string;
  order_id: string;
  driver_id: string | null;
  assignment_type: string;
  requested_network_ids: string[] | null;
  confirmed_network_id: string | null;
  external_driver_name: string | null;
  settlement_type: string | null;
  collection_method: string | null;
  billing_cycle: string | null;
  direct_collection_point: string | null;
  network_settlement_type: string | null;
  total_freight_amount: number | null;
  driver_direct_collection_amount: number | null;
  brokerage_fee: number | null;
  brokerage_fee_payer: string | null;
  orders: {
    order_no: string | null;
    origin: string | null;
    destination: string | null;
    loading_type: string | null;
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

function DispatchesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOrderId = searchParams.get("from_order");
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
  const [assignmentType, setAssignmentType] = useState<"internal" | "external">("internal");
  const [selectedNetworkIds, setSelectedNetworkIds] = useState<string[]>([]);
  const [networks, setNetworks] = useState<NetworkLite[]>([]);

  const networkNameById = useMemo(() => {
    const map: Record<string, string> = {};
    networks.forEach((n) => (map[n.id] = n.name));
    return map;
  }, [networks]);

  async function loadDispatches(preset: DatePreset = period) {
    setLoading(true);
    const { from } = getDateRange(preset);
    let query = supabase
      .from("dispatches")
      .select(
        "id,dispatch_status,customer_charge,driver_payout,margin,created_at,order_id,driver_id,assignment_type,requested_network_ids,confirmed_network_id,external_driver_name,settlement_type,collection_method,billing_cycle,direct_collection_point,network_settlement_type,total_freight_amount,driver_direct_collection_amount,brokerage_fee,brokerage_fee_payer,orders(order_no,origin,destination,loading_type,companies(name),guest_name),drivers(name,phone)"
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
        "id,order_no,origin,destination,vehicle_type,settlement_type,collection_method,billing_cycle,direct_collection_point,quote_id,companies(name),guest_name"
      )
      .in("status", ["접수", "배차중"])
      .order("created_at", { ascending: false });
    setAvailableOrders((data as any as OrderLite[]) || []);
  }

  async function loadNetworks() {
    const { data } = await supabase
      .from("external_networks")
      .select("id,name,is_active")
      .order("sort_order", { ascending: true });
    setNetworks((data as any as NetworkLite[]) || []);
  }

  useEffect(() => {
    loadDispatches("all");
    loadAvailableOrders();
    loadNetworks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 운송오더 상세의 "배차관리로 이동" 버튼으로 넘어온 경우, 그 오더를 자동으로
  // 선택해서 등록폼을 열어줌 (공개문의 → 견적관리 전환 프리필과 동일한 패턴)
  useEffect(() => {
    if (!fromOrderId) return;
    if (!availableOrders.some((o) => o.id === fromOrderId)) return;
    setShowForm(true);
    handleSelectOrder(fromOrderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromOrderId, availableOrders]);

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

    setSaving(true);
    const vehicleId = null; // vehicles 테이블은 driver_id로 조회 가능하므로 필요 시 추후 연결
    const sourceOrder = availableOrders.find((o) => o.id === selectedOrderId);

    // 배차는 항상 "접수중"으로 시작 — 내부차주든 외부정보망이든 실제로 배차가
    // 잡혔는지는 아직 확정되지 않은 상태. 확정은 상세화면의 전용 절차에서만 가능
    const { error } = await supabase.from("dispatches").insert({
      order_id: selectedOrderId,
      driver_id: assignmentType === "internal" ? selectedDriver?.id || null : null,
      vehicle_id: vehicleId,
      dispatch_status: "접수중",
      assignment_type: assignmentType,
      requested_network_ids: assignmentType === "external" ? selectedNetworkIds : [],
      settlement_type: sourceOrder?.settlement_type || "general",
      collection_method: sourceOrder?.collection_method || "broker",
      billing_cycle: sourceOrder?.billing_cycle || "per_order",
      direct_collection_point:
        sourceOrder?.collection_method === "driver_direct" ? sourceOrder?.direct_collection_point : null,
      total_freight_amount: customerCharge ? Number(customerCharge) : null,
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

    // 오더 상태도 "배차중"으로 같이 갱신
    await supabase
      .from("orders")
      .update({ status: DISPATCH_TO_ORDER_STATUS["접수중"] })
      .eq("id", selectedOrderId);

    setSaving(false);
    setShowForm(false);
    setSelectedOrderId("");
    setSelectedDriver(null);
    setDriverSearch("");
    setCustomerCharge("");
    setDriverPayout("");
    setMemo("");
    setAssignmentType("internal");
    setSelectedNetworkIds([]);
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
      .select("company_id,individual_customer_id")
      .eq("id", target.order_id)
      .single();

    const charge = target.customer_charge || 0;
    const payout = target.driver_payout || 0;
    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    // 화주 청구금액은 공급가액, 차주 지급금액은 실제 지급되는 최종금액
    // (부가세 포함 기준)이라 기준이 달랐음 — 청구금액을 부가세 포함가로
    // 환산해서 맞춘 뒤 차감(PR #63 리뷰 피드백)
    const commission = calcInclusiveAmount(charge) - payout;

    // 배차 확정 시점의 정산방식·선착불 관련 값을 정산건 생성 시 그대로
    // 스냅샷 복사(작업지시서 4-5) — 이 목록화면 경로는 예전부터
    // settlement_type 자체가 누락돼있던 버그가 있었음(상세화면 경로에는
    // 있었음), 이번에 신규 필드와 함께 같이 채움
    const { error: invoiceError } = await supabase.from("invoices").insert({
      order_id: target.order_id,
      company_id: order?.company_id || null,
      individual_customer_id: order?.individual_customer_id || null,
      billing_period: billingPeriod,
      settlement_reference_date: new Date().toISOString().slice(0, 10),
      customer_charge_total: charge || null,
      driver_payout_total: payout || null,
      commission_total: commission || null,
      receivable_amount: charge || null,
      payable_amount: payout || null,
      settlement_type: target.settlement_type || "general",
      collection_method: target.collection_method || "broker",
      billing_cycle: target.billing_cycle || "per_order",
      direct_collection_point: target.direct_collection_point || null,
      network_settlement_type: target.network_settlement_type || "none",
      total_freight_amount: target.total_freight_amount ?? charge ?? null,
      driver_direct_collection_amount: target.driver_direct_collection_amount ?? null,
      brokerage_fee: target.brokerage_fee ?? null,
      brokerage_fee_payer: target.brokerage_fee_payer ?? null,
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
          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
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
              <label>배정방식</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className={assignmentType === "internal" ? "btn" : "btn btn-ghost"}
                  style={{ fontSize: 12.5, padding: "7px 12px" }}
                  onClick={() => setAssignmentType("internal")}
                >
                  내부차주
                </button>
                <button
                  type="button"
                  className={assignmentType === "external" ? "btn" : "btn btn-ghost"}
                  style={{ fontSize: 12.5, padding: "7px 12px" }}
                  onClick={() => setAssignmentType("external")}
                >
                  외부정보망
                </button>
              </div>
            </div>

            {assignmentType === "external" && (
              <div className="field" style={{ marginBottom: 14 }}>
                <label>후보 정보망 (여러 곳 선택 가능)</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {networks.filter((n) => n.is_active).map((n) => (
                    <label
                      key={n.id}
                      className="badge"
                      style={{
                        cursor: "pointer",
                        border: selectedNetworkIds.includes(n.id)
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border)",
                        background: selectedNetworkIds.includes(n.id)
                          ? "var(--accent-soft)"
                          : "var(--surface)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNetworkIds.includes(n.id)}
                        onChange={(e) =>
                          setSelectedNetworkIds((prev) =>
                            e.target.checked ? [...prev, n.id] : prev.filter((id) => id !== n.id)
                          )
                        }
                        style={{ margin: 0 }}
                      />
                      {n.name}
                    </label>
                  ))}
                  {networks.filter((n) => n.is_active).length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      등록된 외부 정보망이 없습니다. "외부 정보망 관리"에서 먼저 추가해주세요.
                    </span>
                  )}
                </div>
              </div>
            )}

            {assignmentType === "internal" && (
            <div className="field" style={{ marginBottom: 14 }}>
              <label>배정할 차주 (아직 안 정해졌으면 비워두고 나중에 상세화면에서 선택 가능)</label>
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
            )}

            <div className="form-grid" style={{ padding: 0 }}>
              <div className="field">
                <label>화주 청구운임(원)</label>
                <MoneyInput value={customerCharge} onChange={setCustomerCharge} />
              </div>
              <div className="field">
                <label>차주 지급운임(원)</label>
                <MoneyInput value={driverPayout} onChange={setDriverPayout} />
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
                {saving ? "저장 중..." : "배차 등록 (접수중으로 시작)"}
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
                <th style={{ whiteSpace: "nowrap" }}>오더번호</th>
                <th style={{ whiteSpace: "nowrap" }}>고객</th>
                <th style={{ width: 170 }}>구간</th>
                <th style={{ whiteSpace: "nowrap" }}>배정</th>
                <th style={{ whiteSpace: "nowrap" }}>청구운임</th>
                <th style={{ whiteSpace: "nowrap" }}>지급운임</th>
                <th style={{ whiteSpace: "nowrap" }}>마진</th>
                <th style={{ whiteSpace: "nowrap" }}>마진율</th>
                <th style={{ whiteSpace: "nowrap" }}>배차상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const assignmentText =
                  d.assignment_type === "external"
                    ? d.confirmed_network_id
                      ? `${networkNameById[d.confirmed_network_id] || "외부정보망"} 배차`
                      : (d.requested_network_ids || []).length > 0
                      ? `후보: ${(d.requested_network_ids || [])
                          .map((id) => networkNameById[id] || "?")
                          .join(", ")}`
                      : "외부정보망 (미정)"
                    : d.drivers?.name || "내부차주 (미정)";
                return (
                <tr
                  key={d.id}
                  onClick={() => router.push(`/admin/dispatches/${d.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="num">{d.orders?.order_no || "-"}</span>
                    {d.orders?.loading_type === "mixable" && (
                      <div style={{ marginTop: 3 }}>
                        <MixableBadge />
                      </div>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{d.orders?.companies?.name || d.orders?.guest_name || "-"}</td>
                  <td style={{ width: 170, fontSize: 12.5 }}>
                    <div>{shortAddress(d.orders?.origin)}</div>
                    <div style={{ color: "var(--text-muted)" }}>→ {shortAddress(d.orders?.destination)}</div>
                  </td>
                  <td style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>{assignmentText}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="num">{won(d.customer_charge)}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="num">{won(d.driver_payout)}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="num">{won(d.margin)}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="num">
                      {d.margin !== null && d.customer_charge
                        ? `${((d.margin / d.customer_charge) * 100).toFixed(1)}%`
                        : "-"}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap" }}>
                    {d.dispatch_status === "접수중" ? (
                      <button
                        type="button"
                        className="badge"
                        onClick={() => router.push(`/admin/dispatches/${d.id}`)}
                        style={{
                          cursor: "pointer",
                          border: "none",
                          fontWeight: 600,
                          background: getDispatchStatusColor("접수중").bg,
                          color: getDispatchStatusColor("접수중").text,
                        }}
                      >
                        접수중 · 상세에서 확정
                      </button>
                    ) : (
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
                        {DISPATCH_STATUS_OPTIONS.filter((s) => s !== "접수중").map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

export default function DispatchesPage() {
  return (
    <Suspense
      fallback={
        <main className="container">
          <div className="empty-state">불러오는 중...</div>
        </main>
      }
    >
      <DispatchesPageInner />
    </Suspense>
  );
}
