"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ORDER_STATUS_OPTIONS, getOrderStatusColor } from "@/lib/orderStatusColors";
import { LOAD_UNLOAD_CONDITIONS } from "@/lib/constants";
import { generateDailyNumber } from "@/lib/generateNumber";
import DateTimePicker from "@/components/DateTimePicker";
import DateRangeFilter, { DatePreset, getDateRange } from "@/components/DateRangeFilter";

type CompanyLite = { id: string; name: string; phone: string | null };

type OrderRow = {
  id: string;
  order_no: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  item: string | null;
  status: string;
  requested_pickup_at: string | null;
  created_at: string;
  guest_name: string | null;
  companies: { name: string } | null;
};

const SORT_OPTIONS = [
  { key: "created_at", label: "등록일" },
  { key: "requested_pickup_at", label: "상차일" },
  { key: "status", label: "배차상태" },
  { key: "customer", label: "고객명" },
];

// "전체" 기간을 선택해도 한 번에 너무 많은 데이터를 불러오지 않도록 안전장치로 상한을 둠
const ALL_PERIOD_LIMIT = 500;
const FILTERED_PERIOD_LIMIT = 500;

function OrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuoteId = searchParams.get("from_quote");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [period, setPeriod] = useState<DatePreset>("all");

  const [customerMode, setCustomerMode] = useState<"company" | "guest">(
    "company"
  );
  const [companySearch, setCompanySearch] = useState("");
  const [companyResults, setCompanyResults] = useState<CompanyLite[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyLite | null>(
    null
  );

  const [form, setForm] = useState({
    guest_name: "",
    guest_phone: "",
    origin: "",
    destination: "",
    vehicle_type: "",
    item: "",
    requested_pickup_at: "",
    requested_delivery_at: "",
    load_condition: "",
    unload_condition: "",
    special_notes: "",
    quote_id: "",
  });

  // 거리 정보가 없는 화면이라, 상차 후 고정 2시간 이후로만 하차일시를 선택하게 함
  const minDeliveryDateTime = (() => {
    if (!form.requested_pickup_at) return undefined;
    const d = new Date(form.requested_pickup_at);
    d.setHours(d.getHours() + 2);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  })();

  async function loadOrders(preset: DatePreset = period) {
    setLoading(true);
    const { from } = getDateRange(preset);
    let query = supabase
      .from("orders")
      .select(
        "id,order_no,origin,destination,vehicle_type,item,status,requested_pickup_at,created_at,guest_name,companies(name)"
      )
      .order("created_at", { ascending: false })
      .limit(preset === "all" ? ALL_PERIOD_LIMIT : FILTERED_PERIOD_LIMIT);
    if (from) query = query.gte("created_at", from);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setOrders(data as any as OrderRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 기간 필터 변경 시 목록만 다시 로드
  useEffect(() => {
    loadOrders(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // 견적 상세페이지에서 "운송오더 생성" 버튼으로 넘어온 경우, 견적 내용을 미리 채워줌
  useEffect(() => {
    async function prefillFromQuote() {
      if (!fromQuoteId) return;
      const { data: q } = await supabase
        .from("quotes")
        .select(
          "id,company_id,guest_name,guest_phone,origin,destination,vehicle_type,item,selected_options,notes,requested_pickup_at,requested_dropoff_at,companies(id,name,phone)"
        )
        .eq("id", fromQuoteId)
        .single();
      if (!q) return;

      const options = (q.selected_options as any) || {};

      setShowForm(true);
      setForm((prev) => ({
        ...prev,
        origin: q.origin || "",
        destination: q.destination || "",
        vehicle_type: q.vehicle_type || "",
        item: q.item || "",
        quote_id: q.id,
        guest_name: q.guest_name || "",
        guest_phone: q.guest_phone || "",
        load_condition: options.상차조건 || "",
        unload_condition: options.하차조건 || "",
        special_notes: q.notes || "",
        requested_pickup_at: q.requested_pickup_at ? q.requested_pickup_at.slice(0, 16) : "",
        requested_delivery_at: q.requested_dropoff_at ? q.requested_dropoff_at.slice(0, 16) : "",
      }));
      if (q.company_id && (q as any).companies) {
        setCustomerMode("company");
        setSelectedCompany((q as any).companies);
      } else if (q.guest_name) {
        setCustomerMode("guest");
      }
    }
    prefillFromQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromQuoteId]);

  useEffect(() => {
    let active = true;
    async function search_() {
      if (companySearch.trim().length < 1) {
        setCompanyResults([]);
        return;
      }
      const { data } = await supabase
        .from("companies")
        .select("id,name,phone")
        .ilike("name", `%${companySearch}%`)
        .limit(8);
      if (active) setCompanyResults((data as CompanyLite[]) || []);
    }
    const t = setTimeout(search_, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [companySearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (customerMode === "company" && !selectedCompany) {
      setError("화주 업체를 검색해서 선택해주세요.");
      return;
    }
    if (customerMode === "guest" && !form.guest_name.trim()) {
      setError("개인/신규 고객명을 입력해주세요.");
      return;
    }
    if (!form.origin.trim() || !form.destination.trim()) {
      setError("출발지와 도착지를 입력해주세요.");
      return;
    }
    if (form.requested_pickup_at && form.requested_delivery_at) {
      const diffMs =
        new Date(form.requested_delivery_at).getTime() - new Date(form.requested_pickup_at).getTime();
      if (diffMs < 2 * 60 * 60 * 1000) {
        setError("하차 예정일시는 상차 후 최소 2시간 이후로 설정해주세요.");
        return;
      }
    }

    setSaving(true);
    const orderNo = await generateDailyNumber("orders", "O");

    const { error } = await supabase.from("orders").insert({
      order_no: orderNo,
      company_id: customerMode === "company" ? selectedCompany!.id : null,
      guest_name: customerMode === "guest" ? form.guest_name : null,
      guest_phone: customerMode === "guest" ? form.guest_phone || null : null,
      quote_id: form.quote_id || null,
      origin: form.origin,
      destination: form.destination,
      vehicle_type: form.vehicle_type || null,
      item: form.item || null,
      requested_pickup_at: form.requested_pickup_at || null,
      requested_delivery_at: form.requested_delivery_at || null,
      load_condition: form.load_condition || null,
      unload_condition: form.unload_condition || null,
      special_notes: form.special_notes || null,
      status: "접수",
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }

    setShowForm(false);
    setSelectedCompany(null);
    setCompanySearch("");
    setForm({
      guest_name: "",
      guest_phone: "",
      origin: "",
      destination: "",
      vehicle_type: "",
      item: "",
      requested_pickup_at: "",
      requested_delivery_at: "",
      load_condition: "",
      unload_condition: "",
      special_notes: "",
      quote_id: "",
    });
    router.replace("/admin/orders");
    loadOrders(period);
  }

  async function handleStatusChange(id: string, status: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  const filtered = useMemo(() => {
    return orders
      .filter((o) => statusFilter === "전체" || o.status === statusFilter)
      .filter((o) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        const customer = o.companies?.name || o.guest_name || "";
        return (
          customer.toLowerCase().includes(q) ||
          (o.origin || "").toLowerCase().includes(q) ||
          (o.destination || "").toLowerCase().includes(q) ||
          (o.order_no || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let av: string | number = "";
        let bv: string | number = "";
        switch (sortKey) {
          case "requested_pickup_at":
            av = a.requested_pickup_at || "";
            bv = b.requested_pickup_at || "";
            break;
          case "status":
            av = (ORDER_STATUS_OPTIONS as readonly string[]).indexOf(a.status);
            bv = (ORDER_STATUS_OPTIONS as readonly string[]).indexOf(b.status);
            break;
          case "customer":
            av = a.companies?.name || a.guest_name || "";
            bv = b.companies?.name || b.guest_name || "";
            break;
          default:
            av = a.created_at;
            bv = b.created_at;
        }
        let cmp: number;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = String(av).localeCompare(String(bv), "ko");
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [orders, search, statusFilter, sortKey, sortDir]);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">운송오더 관리</h1>
          <p className="page-desc">
            수주된 견적 또는 직접 접수된 운송 건을 관리합니다.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <DateRangeFilter value={period} onChange={setPeriod} />
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "닫기" : "+ 신규 오더 등록"}
          </button>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {period === "all" && orders.length >= ALL_PERIOD_LIMIT && (
        <div className="error-box">
          최근 {ALL_PERIOD_LIMIT}건만 표시 중입니다. 더 오래된 데이터를 보려면
          기간 필터를 좁혀서 확인해주세요.
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                className={customerMode === "company" ? "btn" : "btn btn-ghost"}
                style={{ fontSize: 12.5, padding: "7px 12px" }}
                onClick={() => setCustomerMode("company")}
              >
                기존 화주
              </button>
              <button
                type="button"
                className={customerMode === "guest" ? "btn" : "btn btn-ghost"}
                style={{ fontSize: 12.5, padding: "7px 12px" }}
                onClick={() => setCustomerMode("guest")}
              >
                개인 / 신규 고객
              </button>
            </div>

            {customerMode === "company" ? (
              <div style={{ marginBottom: 14 }}>
                <div className="field">
                  <label>화주 업체 검색</label>
                  <input
                    value={selectedCompany ? selectedCompany.name : companySearch}
                    onChange={(e) => {
                      setSelectedCompany(null);
                      setCompanySearch(e.target.value);
                    }}
                    placeholder="회사명 입력"
                  />
                </div>
                {!selectedCompany && companyResults.length > 0 && (
                  <div
                    className="card"
                    style={{ marginTop: 6, maxHeight: 160, overflowY: "auto" }}
                  >
                    {companyResults.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCompany(c);
                          setCompanyResults([]);
                        }}
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          cursor: "pointer",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="form-grid" style={{ padding: 0, marginBottom: 14 }}>
                <div className="field">
                  <label>고객명 *</label>
                  <input
                    value={form.guest_name}
                    onChange={(e) =>
                      setForm({ ...form, guest_name: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>연락처</label>
                  <input
                    value={form.guest_phone}
                    onChange={(e) =>
                      setForm({ ...form, guest_phone: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            <div className="form-grid" style={{ padding: 0 }}>
              <div className="field">
                <label>출발지 *</label>
                <input
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                />
              </div>
              <div className="field">
                <label>도착지 *</label>
                <input
                  value={form.destination}
                  onChange={(e) =>
                    setForm({ ...form, destination: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>차량</label>
                <input
                  value={form.vehicle_type}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_type: e.target.value })
                  }
                  placeholder="예: 1톤 탑차"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <DateTimePicker
                  label="상차 예정일시"
                  value={form.requested_pickup_at}
                  onChange={(v) =>
                    setForm({ ...form, requested_pickup_at: v })
                  }
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <DateTimePicker
                  label="하차 예정일시"
                  value={form.requested_delivery_at}
                  onChange={(v) =>
                    setForm({ ...form, requested_delivery_at: v })
                  }
                  minDateTime={minDeliveryDateTime}
                  minDateTimeLabel="상차 후 최소 2시간 이후로 선택해주세요"
                />
              </div>
              <div className="field">
                <label>상차 조건</label>
                <select
                  value={form.load_condition}
                  onChange={(e) =>
                    setForm({ ...form, load_condition: e.target.value })
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
                  value={form.unload_condition}
                  onChange={(e) =>
                    setForm({ ...form, unload_condition: e.target.value })
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
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>품목</label>
                <input
                  value={form.item}
                  onChange={(e) => setForm({ ...form, item: e.target.value })}
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>특이사항</label>
                <textarea
                  rows={2}
                  value={form.special_notes}
                  onChange={(e) =>
                    setForm({ ...form, special_notes: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "저장 중..." : "오더 등록"}
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
            placeholder="고객명, 오더번호, 구간으로 검색"
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
          {ORDER_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>정렬</span>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          style={{ fontSize: 12.5, padding: "7px 8px" }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }}
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        >
          {sortDir === "asc" ? "오름차순 ↑" : "내림차순 ↓"}
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {period === "all"
              ? "등록된 운송오더가 없습니다."
              : "선택한 기간에 등록된 운송오더가 없습니다."}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>오더번호</th>
                <th>고객</th>
                <th>구간</th>
                <th>차량</th>
                <th>상차일</th>
                <th>배차상태</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => router.push(`/admin/orders/${o.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <span className="num">{o.order_no}</span>
                  </td>
                  <td>
                    {o.companies?.name || o.guest_name || "-"}
                    {!o.companies?.name && o.guest_name && (
                      <span className="badge" style={{ marginLeft: 6 }}>
                        개인
                      </span>
                    )}
                  </td>
                  <td>
                    {o.origin || "-"} → {o.destination || "-"}
                  </td>
                  <td>{o.vehicle_type || "-"}</td>
                  <td>
                    <span className="num">
                      {o.requested_pickup_at
                        ? new Date(o.requested_pickup_at).toLocaleString("ko-KR", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      value={o.status}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "none",
                        fontWeight: 600,
                        background: getOrderStatusColor(o.status).bg,
                        color: getOrderStatusColor(o.status).text,
                      }}
                    >
                      {ORDER_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className="num">
                      {new Date(o.created_at).toLocaleDateString("ko-KR")}
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

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <main className="container">
          <div className="empty-state">불러오는 중...</div>
        </main>
      }
    >
      <OrdersPageInner />
    </Suspense>
  );
}
