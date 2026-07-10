"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const VEHICLES = ["1톤", "1.4톤", "2.5톤", "3.5톤", "5톤", "5톤 플러스/축"];

type Tier = {
  distance_from_km: number;
  distance_to_km: number | null;
  vehicle_type: string;
  base_fare: number;
};

type Surcharge = {
  category: string;
  option_name: string;
  rate_pct: number;
  flat_amount: number;
};

type ExtraFee = {
  vehicle_type: string;
  free_waiting_minutes: number;
  waiting_fee_per_unit: number | null;
  waypoint_fee: number | null;
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

const SINGLE_SELECT_CATEGORIES = [
  "차량형태",
  "상하차방식",
  "물품특성",
  "운송시간",
  "긴급여부",
  "왕복/편도",
];

function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function QuotesPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    vehicle_type: "1톤",
    item: "",
    차량형태: "카고",
    상하차방식: "지게차/도크",
    물품특성: "일반화물",
    운송시간: "평일 주간",
    긴급여부: "일반",
    "왕복/편도": "편도",
    firstDealDiscount: false,
    waitingMinutes: "",
    waypointCount: "",
  });

  async function loadRateData() {
    const [t, s, e] = await Promise.all([
      supabase.from("rate_distance_tiers").select("*"),
      supabase.from("rate_surcharges").select("*"),
      supabase.from("rate_vehicle_extra_fees").select("*"),
    ]);
    setTiers((t.data as Tier[]) || []);
    setSurcharges((s.data as Surcharge[]) || []);
    setExtraFees((e.data as ExtraFee[]) || []);
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
    loadRateData();
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

  function findOption(category: string, name: string) {
    return surcharges.find(
      (s) => s.category === category && s.option_name === name
    );
  }

  const calc = useMemo(() => {
    const distance = Number(form.distance_km) || 0;
    const tierMatch = tiers.find(
      (t) =>
        t.vehicle_type === form.vehicle_type &&
        distance >= t.distance_from_km &&
        (t.distance_to_km === null || distance <= t.distance_to_km)
    );
    if (!tierMatch) return null;

    const base = tierMatch.base_fare;

    const selections: [string, string][] = [
      ["차량형태", form.차량형태],
      ["상하차방식", form.상하차방식],
      ["물품특성", form.물품특성],
      ["운송시간", form.운송시간],
      ["긴급여부", form.긴급여부],
      ["왕복/편도", form["왕복/편도"]],
    ];

    let ratePctTotal = 0;
    let flatTotal = 0;
    const breakdown: { label: string; amount: number }[] = [];

    for (const [cat, opt] of selections) {
      const found = findOption(cat, opt);
      if (!found) continue;
      if (found.rate_pct) {
        ratePctTotal += found.rate_pct;
        breakdown.push({
          label: `${opt} (${(found.rate_pct * 100).toFixed(0)}%)`,
          amount: base * found.rate_pct,
        });
      }
      if (found.flat_amount) {
        flatTotal += found.flat_amount;
        breakdown.push({ label: opt, amount: found.flat_amount });
      }
    }

    if (form.firstDealDiscount) {
      const disc = findOption("특별할인", "첫거래지원(10%)");
      if (disc) {
        ratePctTotal += disc.rate_pct;
        breakdown.push({
          label: "첫거래지원(10%)",
          amount: base * disc.rate_pct,
        });
      }
    }

    const extra = extraFees.find((e) => e.vehicle_type === form.vehicle_type);
    let waitingExtra = 0;
    const waitingMin = Number(form.waitingMinutes) || 0;
    const freeMin = extra?.free_waiting_minutes ?? 30;
    if (extra?.waiting_fee_per_unit && waitingMin > freeMin) {
      const units = Math.ceil((waitingMin - freeMin) / 30);
      waitingExtra = units * extra.waiting_fee_per_unit;
      breakdown.push({ label: `대기료(${waitingMin}분)`, amount: waitingExtra });
    }

    let waypointExtra = 0;
    const waypointCount = Number(form.waypointCount) || 0;
    if (extra?.waypoint_fee && waypointCount > 0) {
      waypointExtra = waypointCount * extra.waypoint_fee;
      breakdown.push({
        label: `경유지 ${waypointCount}곳`,
        amount: waypointExtra,
      });
    }

    const pctAmount = base * ratePctTotal;
    const surchargeTotal = pctAmount + flatTotal + waitingExtra + waypointExtra;
    const final = Math.max(base + surchargeTotal, 0);

    return { base, surchargeTotal, final, breakdown, tierMatch };
  }, [tiers, surcharges, extraFees, form]);

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
    if (!calc) {
      setError("해당 거리에 맞는 운임기준을 찾지 못했습니다. 거리를 확인해주세요.");
      return;
    }

    setSaving(true);
    const quoteNo = `Q-${Date.now()}`;

    const { data: newQuote, error } = await supabase
      .from("quotes")
      .insert({
        quote_no: quoteNo,
        company_id: customerMode === "company" ? selectedCompany!.id : null,
        guest_name: customerMode === "guest" ? form.guest_name : null,
        guest_phone:
          customerMode === "guest" ? form.guest_phone || null : null,
        guest_email:
          customerMode === "guest" ? form.guest_email || null : null,
        origin: form.origin || null,
        destination: form.destination || null,
        distance_km: Number(form.distance_km) || null,
        vehicle_type: form.vehicle_type,
        item: form.item || null,
        base_fare: calc.base,
        surcharge_amount: calc.surchargeTotal,
        discount_amount: 0,
        final_amount: calc.final,
        status: "상담중",
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    // 가산 항목 세부 내역을 quote_items에 저장
    if (newQuote && calc.breakdown.length > 0) {
      await supabase.from("quote_items").insert(
        calc.breakdown.map((b) => ({
          quote_id: newQuote.id,
          item_name: b.label,
          amount: Math.round(b.amount),
        }))
      );
    }

    setSaving(false);
    setSelectedCompany(null);
    setCompanySearch("");
    setForm({
      ...form,
      guest_name: "",
      guest_phone: "",
      guest_email: "",
      origin: "",
      destination: "",
      distance_km: "",
      item: "",
      waitingMinutes: "",
      waypointCount: "",
      firstDealDiscount: false,
    });
    loadQuotes();
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">견적 관리</h1>
          <p className="page-desc">
            거리구간 × 톤수 기본운임에 가산기준을 조합해 자동 계산합니다.
            기존 화주 또는 개인/신규 고객 모두 견적 가능합니다. (부가세 별도)
          </p>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {tiers.length === 0 && (
        <div className="error-box">
          운임기준 데이터가 아직 없습니다. 먼저{" "}
          <a href="/admin/rates" style={{ textDecoration: "underline" }}>
            운임기준표
          </a>
          가 등록되어 있는지 확인해주세요.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 20,
          alignItems: "start",
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: 20 }}>
          <form onSubmit={handleSubmit}>
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
                <label>출발지</label>
                <input
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
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
                <label>거리(km) *</label>
                <input
                  type="number"
                  value={form.distance_km}
                  onChange={(e) =>
                    setForm({ ...form, distance_km: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>톤수 *</label>
                <select
                  value={form.vehicle_type}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_type: e.target.value })
                  }
                >
                  {VEHICLES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {SINGLE_SELECT_CATEGORIES.map((cat) => {
                const options = surcharges.filter((s) => s.category === cat);
                return (
                  <div className="field" key={cat}>
                    <label>{cat}</label>
                    <select
                      value={(form as any)[cat]}
                      onChange={(e) =>
                        setForm({ ...form, [cat]: e.target.value })
                      }
                    >
                      {options.map((o) => (
                        <option key={o.option_name} value={o.option_name}>
                          {o.option_name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}

              <div className="field">
                <label>대기시간(분)</label>
                <input
                  type="number"
                  value={form.waitingMinutes}
                  onChange={(e) =>
                    setForm({ ...form, waitingMinutes: e.target.value })
                  }
                  placeholder="무료 30분 초과분만 가산"
                />
              </div>
              <div className="field">
                <label>경유지 수</label>
                <input
                  type="number"
                  value={form.waypointCount}
                  onChange={(e) =>
                    setForm({ ...form, waypointCount: e.target.value })
                  }
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>품목</label>
                <input
                  value={form.item}
                  onChange={(e) => setForm({ ...form, item: e.target.value })}
                />
              </div>
            </div>

            <label
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                fontSize: 13,
                margin: "14px 0",
              }}
            >
              <input
                type="checkbox"
                checked={form.firstDealDiscount}
                onChange={(e) =>
                  setForm({ ...form, firstDealDiscount: e.target.checked })
                }
              />
              첫거래지원 할인 적용 (10%)
            </label>

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
          {!calc ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              거리와 톤수를 입력하면 실시간으로 계산됩니다.
            </p>
          ) : (
            <div style={{ fontSize: 13.5 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  기본운임 ({form.vehicle_type})
                </span>
                <span>{won(calc.base)}</span>
              </div>
              {calc.breakdown.map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 12.5,
                    color: "var(--text-muted)",
                  }}
                >
                  <span>+ {b.label}</span>
                  <span>{won(b.amount)}</span>
                </div>
              ))}
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
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
                부가세 별도
              </p>
            </div>
          )}
        </div>
      </div>

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
                <th>톤수</th>
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
                  <td>{new Date(q.created_at).toLocaleDateString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
