"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Rate = {
  id: string;
  vehicle_type: string;
  base_fare: number;
  per_km_rate: number;
  waiting_fee_per_unit: number;
  night_surcharge_pct: number;
  weekend_surcharge_pct: number;
  cold_surcharge_pct: number;
  forklift_fee: number;
  manual_load_fee: number;
};

type CompanyLite = { id: string; name: string; phone: string | null };

type QuoteRow = {
  id: string;
  quote_no: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  final_amount: number | null;
  status: string;
  created_at: string;
  guest_name: string | null;
  companies: { name: string } | null;
};

function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function QuotesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 고객 구분: 기존 화주 검색 or 개인/신규 게스트
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
    guest_email: "",
    origin: "",
    destination: "",
    distance_km: "",
    vehicle_type: "",
    item: "",
    night: false,
    weekend: false,
    cold: false,
    forklift: false,
    manual: false,
    discount_amount: "",
  });

  async function loadRates() {
    const { data } = await supabase
      .from("rates")
      .select("*")
      .order("vehicle_type");
    setRates((data as Rate[]) || []);
  }

  async function loadQuotes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quotes")
      .select(
        "id,quote_no,origin,destination,vehicle_type,final_amount,status,created_at,guest_name,companies(name)"
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) setError(error.message);
    else setQuotes(data as any as QuoteRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadRates();
    loadQuotes();
  }, []);

  useEffect(() => {
    let active = true;
    async function search() {
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
    const t = setTimeout(search, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [companySearch]);

  const selectedRate = useMemo(
    () => rates.find((r) => r.vehicle_type === form.vehicle_type) || null,
    [rates, form.vehicle_type]
  );

  const calc = useMemo(() => {
    if (!selectedRate) return null;
    const distance = Number(form.distance_km) || 0;
    const base = selectedRate.base_fare + distance * selectedRate.per_km_rate;

    let surchargePct = 0;
    if (form.night) surchargePct += selectedRate.night_surcharge_pct || 0;
    if (form.weekend) surchargePct += selectedRate.weekend_surcharge_pct || 0;
    if (form.cold) surchargePct += selectedRate.cold_surcharge_pct || 0;

    const pctAmount = base * (surchargePct / 100);
    const flatAmount =
      (form.forklift ? selectedRate.forklift_fee || 0 : 0) +
      (form.manual ? selectedRate.manual_load_fee || 0 : 0);

    const surchargeTotal = pctAmount + flatAmount;
    const discount = Number(form.discount_amount) || 0;
    const final = Math.max(base + surchargeTotal - discount, 0);

    return { base, surchargeTotal, discount, final };
  }, [selectedRate, form]);

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
    if (!selectedRate) {
      setError("차량종류(운임기준)를 선택해주세요.");
      return;
    }
    if (!calc) return;

    setSaving(true);

    const quoteNo = `Q-${Date.now()}`;

    const { error } = await supabase.from("quotes").insert({
      quote_no: quoteNo,
      company_id: customerMode === "company" ? selectedCompany!.id : null,
      guest_name: customerMode === "guest" ? form.guest_name : null,
      guest_phone: customerMode === "guest" ? form.guest_phone || null : null,
      guest_email: customerMode === "guest" ? form.guest_email || null : null,
      origin: form.origin || null,
      destination: form.destination || null,
      distance_km: Number(form.distance_km) || null,
      vehicle_type: form.vehicle_type,
      item: form.item || null,
      load_type: form.forklift ? "지게차" : form.manual ? "수작업" : null,
      base_fare: calc.base,
      surcharge_amount: calc.surchargeTotal,
      discount_amount: calc.discount,
      final_amount: calc.final,
      status: "작성중",
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    // 폼 초기화
    setForm({
      guest_name: "",
      guest_phone: "",
      guest_email: "",
      origin: "",
      destination: "",
      distance_km: "",
      vehicle_type: "",
      item: "",
      night: false,
      weekend: false,
      cold: false,
      forklift: false,
      manual: false,
      discount_amount: "",
    });
    setSelectedCompany(null);
    setCompanySearch("");
    loadQuotes();
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">견적 관리</h1>
          <p className="page-desc">
            운임기준표를 기준으로 자동 계산합니다. 기존 화주뿐 아니라
            개인/신규 고객도 견적을 받을 수 있습니다.
          </p>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {rates.length === 0 && (
        <div className="error-box">
          아직 등록된 운임기준이 없습니다. 먼저{" "}
          <a href="/admin/rates" style={{ textDecoration: "underline" }}>
            운임기준표
          </a>
          에서 차량별 기준을 등록해주세요.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 20,
          alignItems: "start",
          marginBottom: 24,
        }}
      >
        {/* 입력 폼 */}
        <div className="card" style={{ padding: 20 }}>
          <form onSubmit={handleSubmit}>
            {/* 고객 구분 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                className={customerMode === "company" ? "btn" : "btn btn-ghost"}
                style={{ fontSize: 12.5, padding: "7px 12px" }}
                onClick={() => setCustomerMode("company")}
              >
                기존 화주(법인)
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
                    placeholder="회사명 입력 (예: 정밀, 유통 등)"
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
                        {c.name}{" "}
                        <span style={{ color: "var(--text-muted)" }}>
                          {c.phone || ""}
                        </span>
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
                    placeholder="010-0000-0000"
                  />
                </div>
                <div className="field">
                  <label>이메일</label>
                  <input
                    value={form.guest_email}
                    onChange={(e) =>
                      setForm({ ...form, guest_email: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            <div className="form-grid" style={{ padding: 0 }}>
              <div className="field">
                <label>출발지</label>
                <input
                  value={form.origin}
                  onChange={(e) =>
                    setForm({ ...form, origin: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>도착지</label>
                <input
                  value={form.destination}
                  onChange={(e) =>
                    setForm({ ...form, destination: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>거리(km)</label>
                <input
                  type="number"
                  value={form.distance_km}
                  onChange={(e) =>
                    setForm({ ...form, distance_km: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>차량종류 *</label>
                <select
                  value={form.vehicle_type}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_type: e.target.value })
                  }
                >
                  <option value="">선택</option>
                  {rates.map((r) => (
                    <option key={r.id} value={r.vehicle_type}>
                      {r.vehicle_type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>품목</label>
                <input
                  value={form.item}
                  onChange={(e) =>
                    setForm({ ...form, item: e.target.value })
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                margin: "14px 0",
                fontSize: 13,
              }}
            >
              {[
                ["night", "야간"],
                ["weekend", "주말"],
                ["cold", "냉장/냉동"],
                ["forklift", "지게차 상하차"],
                ["manual", "수작업 상하차"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                >
                  <input
                    type="checkbox"
                    checked={(form as any)[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.checked })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="field" style={{ maxWidth: 220, marginBottom: 14 }}>
              <label>할인 금액(원)</label>
              <input
                type="number"
                value={form.discount_amount}
                onChange={(e) =>
                  setForm({ ...form, discount_amount: e.target.value })
                }
              />
            </div>

            <button className="btn" type="submit" disabled={saving}>
              {saving ? "저장 중..." : "견적 저장"}
            </button>
          </form>
        </div>

        {/* 실시간 계산 결과 */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
            자동 계산 결과
          </h3>
          {!selectedRate ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              차량종류를 선택하면 실시간으로 계산됩니다.
            </p>
          ) : calc ? (
            <div style={{ fontSize: 13.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "var(--text-muted)" }}>기본운임 + 거리운임</span>
                <span>{won(calc.base)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "var(--text-muted)" }}>할증 합계</span>
                <span>+{won(calc.surchargeTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "var(--text-muted)" }}>할인</span>
                <span>-{won(calc.discount)}</span>
              </div>
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  marginTop: 10,
                  paddingTop: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                <span>최종 견적금액</span>
                <span>{won(calc.final)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* 최근 견적 목록 */}
      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : quotes.length === 0 ? (
          <div className="empty-state">아직 생성된 견적이 없습니다.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>견적번호</th>
                <th>고객</th>
                <th>구간</th>
                <th>차량</th>
                <th>금액</th>
                <th>상태</th>
                <th>일시</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td>{q.quote_no}</td>
                  <td>
                    {q.companies?.name || q.guest_name || "-"}
                    {!q.companies?.name && q.guest_name && (
                      <span className="badge" style={{ marginLeft: 6 }}>
                        개인
                      </span>
                    )}
                  </td>
                  <td>
                    {q.origin || "-"} → {q.destination || "-"}
                  </td>
                  <td>{q.vehicle_type || "-"}</td>
                  <td>{q.final_amount ? won(q.final_amount) : "-"}</td>
                  <td>{q.status}</td>
                  <td>
                    {new Date(q.created_at).toLocaleDateString("ko-KR")}
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
