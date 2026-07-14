"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { generateDailyNumber } from "@/lib/generateNumber";
import DateRangeFilter, { DatePreset, getDateRange } from "@/components/DateRangeFilter";

declare global {
  interface Window {
    daum: any;
  }
}

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

type CompanyLite = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  status: string;
};

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

// 영업 퍼널 순서 (견적 저장 시 상태를 "뒤로 되돌리지" 않고 앞으로만 진행시키기 위한 기준)
const STATUS_ORDER = [
  "미접촉",
  "연락시도",
  "연락완료",
  "추후연락",
  "제안서발송",
  "견적요청",
  "견적발송",
  "첫거래완료",
  "재거래발생",
  "반복화주",
  "월정산화주",
];

function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function QuotesPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [postcodeReady, setPostcodeReady] = useState(false);
  const [period, setPeriod] = useState<DatePreset>("all");

  const [savedLocations, setSavedLocations] = useState<
    { id: string; location_name: string | null; address: string | null; location_type: string | null }[]
  >([]);
  const [saveOrigin, setSaveOrigin] = useState(false);
  const [saveDestination, setSaveDestination] = useState(false);

  // 다음(Daum) 우편번호 서비스 스크립트 로드 (API 키 불필요, 무료)
  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) {
      setPostcodeReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src =
      "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => setPostcodeReady(true);
    document.body.appendChild(script);
  }, []);

  function openAddressSearch(target: "origin" | "destination") {
    if (!postcodeReady || !window.daum) return;
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        const addr = data.roadAddress || data.jibunAddress;
        if (target === "origin") {
          setForm((prev) => ({ ...prev, origin: addr, originDetail: "" }));
        } else {
          setForm((prev) => ({
            ...prev,
            destination: addr,
            destinationDetail: "",
          }));
        }
      },
    }).open();
  }

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
    originDetail: "",
    destination: "",
    destinationDetail: "",
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

  async function loadQuotes(preset: DatePreset = period) {
    setLoading(true);
    const { from } = getDateRange(preset);
    let query = supabase
      .from("quotes")
      .select(
        "id,quote_no,origin,destination,vehicle_type,final_amount,status,created_at,guest_name,companies(name)"
      )
      .order("created_at", { ascending: false })
      .limit(preset === "all" ? 50 : 200);
    if (from) query = query.gte("created_at", from);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setQuotes(data as any as QuoteRow[]);
    setLoading(false);
  }

  // 최초 진입 시 운임기준 데이터 + 견적 목록 로드
  useEffect(() => {
    loadRateData();
    loadQuotes("all");
  }, []);

  // 기간 필터 변경 시 목록만 다시 로드
  useEffect(() => {
    loadQuotes(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    let active = true;
    async function search() {
      if (companySearch.trim().length < 1) {
        setCompanyResults([]);
        return;
      }
      const { data } = await supabase
        .from("companies")
        .select("id,name,phone,address,status")
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

  useEffect(() => {
    async function loadLocations() {
      if (customerMode !== "company" || !selectedCompany) {
        setSavedLocations([]);
        return;
      }
      const { data } = await supabase
        .from("customer_locations")
        .select("id,location_name,address,location_type")
        .eq("company_id", selectedCompany.id);
      setSavedLocations(data || []);
    }
    loadLocations();
  }, [selectedCompany, customerMode]);

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
    if (!form.origin.trim()) {
      setError("출발지를 입력해주세요.");
      return;
    }
    if (!form.destination.trim()) {
      setError("도착지를 입력해주세요.");
      return;
    }
    if (!form.distance_km || Number(form.distance_km) <= 0) {
      setError("거리(km)를 입력해주세요.");
      return;
    }
    if (!calc) {
      setError("해당 거리에 맞는 운임기준을 찾지 못했습니다. 거리를 확인해주세요.");
      return;
    }

    setSaving(true);
    const quoteNo = await generateDailyNumber("quotes", "Q");

    const fullOrigin = [form.origin, form.originDetail]
      .filter((v) => v.trim())
      .join(" ");
    const fullDestination = [form.destination, form.destinationDetail]
      .filter((v) => v.trim())
      .join(" ");

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
        origin: fullOrigin || null,
        destination: fullDestination || null,
        distance_km: Number(form.distance_km) || null,
        vehicle_type: form.vehicle_type,
        item: form.item || null,
        base_fare: calc.base,
        surcharge_amount: calc.surchargeTotal,
        discount_amount: 0,
        final_amount: calc.final,
        status: "상담중",
        selected_options: {
          톤수: form.vehicle_type,
          차량형태: form.차량형태,
          상하차방식: form.상하차방식,
          물품특성: form.물품특성,
          운송시간: form.운송시간,
          긴급여부: form.긴급여부,
          "왕복/편도": form["왕복/편도"],
          대기시간_분: Number(form.waitingMinutes) || 0,
          경유지수: Number(form.waypointCount) || 0,
          첫거래지원할인: form.firstDealDiscount,
        },
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    // 견적을 받은 화주는 영업상태를 "견적요청" 이상으로 자동 승격 (이미 더 진행된 상태면 건드리지 않음)
    if (customerMode === "company" && selectedCompany) {
      const currentIdx = STATUS_ORDER.indexOf(selectedCompany.status);
      const targetIdx = STATUS_ORDER.indexOf("견적요청");
      if (currentIdx !== -1 && currentIdx < targetIdx) {
        await supabase
          .from("companies")
          .update({ status: "견적요청" })
          .eq("id", selectedCompany.id);
      }
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

    // 체크했다면 이번 출발지/도착지를 이 화주의 자주 쓰는 주소로 저장
    if (customerMode === "company" && selectedCompany) {
      const toSave = [];
      if (saveOrigin && fullOrigin)
        toSave.push({
          company_id: selectedCompany.id,
          address: fullOrigin,
          location_type: "상차지",
        });
      if (saveDestination && fullDestination)
        toSave.push({
          company_id: selectedCompany.id,
          address: fullDestination,
          location_type: "하차지",
        });
      if (toSave.length > 0) {
        await supabase.from("customer_locations").insert(toSave);
      }
    }

    setSaving(false);
    setSelectedCompany(null);
    setCompanySearch("");
    setSaveOrigin(false);
    setSaveDestination(false);
    setForm({
      ...form,
      guest_name: "",
      guest_phone: "",
      guest_email: "",
      origin: "",
      originDetail: "",
      destination: "",
      destinationDetail: "",
      distance_km: "",
      item: "",
      waitingMinutes: "",
      waypointCount: "",
      firstDealDiscount: false,
    });
    loadQuotes(period);
  }

  async function handleDeleteQuote(id: string, quoteNo: string | null) {
    const confirmed = window.confirm(
      `견적 "${quoteNo}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;
    await supabase.from("quote_items").delete().eq("quote_id", id);
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    loadQuotes(period);
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
        <DateRangeFilter value={period} onChange={setPeriod} />
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
          <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                (e.target as HTMLElement).tagName !== "TEXTAREA"
              ) {
                e.preventDefault();
              }
            }}
          >
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
                          // 출발지가 비어있으면 화주의 등록 주소를 기본값으로 채워줍니다 (수정 가능)
                          if (c.address && !form.origin.trim()) {
                            setForm((prev) => ({ ...prev, origin: c.address || "" }));
                          }
                        }}
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          cursor: "pointer",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {c.name}
                        {c.address && (
                          <span
                            style={{
                              display: "block",
                              fontSize: 11.5,
                              color: "var(--text-muted)",
                              marginTop: 2,
                            }}
                          >
                            {c.address}
                          </span>
                        )}
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
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={form.origin}
                    onChange={(e) =>
                      setForm({ ...form, origin: e.target.value })
                    }
                    placeholder="도로명주소 검색 또는 직접 입력"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{
                      padding: "0 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                    onClick={() => openAddressSearch("origin")}
                  >
                    주소검색
                  </button>
                </div>
                <input
                  value={form.originDetail}
                  onChange={(e) =>
                    setForm({ ...form, originDetail: e.target.value })
                  }
                  placeholder="상세주소 (동/층/호수, 창고 위치 등)"
                  style={{ marginTop: 6 }}
                />
                {savedLocations.filter((l) => l.location_type === "상차지")
                  .length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    {savedLocations
                      .filter((l) => l.location_type === "상차지")
                      .map((l) => (
                        <span
                          key={l.id}
                          className="badge"
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            setForm({
                              ...form,
                              origin: l.address || "",
                              originDetail: "",
                            })
                          }
                        >
                          {l.address}
                        </span>
                      ))}
                  </div>
                )}
                {customerMode === "company" && selectedCompany && (
                  <label
                    htmlFor="saveOrigin"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 6,
                      fontSize: 12,
                      color: "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      id="saveOrigin"
                      type="checkbox"
                      checked={saveOrigin}
                      onChange={(e) => setSaveOrigin(e.target.checked)}
                      style={{ margin: 0 }}
                    />
                    이 출발지를 화주 주소록에 저장
                  </label>
                )}
              </div>

              <div className="field">
                <label>도착지 *</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={form.destination}
                    onChange={(e) =>
                      setForm({ ...form, destination: e.target.value })
                    }
                    placeholder="도로명주소 검색 또는 직접 입력"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{
                      padding: "0 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                    onClick={() => openAddressSearch("destination")}
                  >
                    주소검색
                  </button>
                </div>
                <input
                  value={form.destinationDetail}
                  onChange={(e) =>
                    setForm({ ...form, destinationDetail: e.target.value })
                  }
                  placeholder="상세주소 (동/층/호수, 하차장 위치 등)"
                  style={{ marginTop: 6 }}
                />
                {savedLocations.filter((l) => l.location_type === "하차지")
                  .length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    {savedLocations
                      .filter((l) => l.location_type === "하차지")
                      .map((l) => (
                        <span
                          key={l.id}
                          className="badge"
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            setForm({
                              ...form,
                              destination: l.address || "",
                              destinationDetail: "",
                            })
                          }
                        >
                          {l.address}
                        </span>
                      ))}
                  </div>
                )}
                {customerMode === "company" && selectedCompany && (
                  <label
                    htmlFor="saveDestination"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 6,
                      fontSize: 12,
                      color: "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      id="saveDestination"
                      type="checkbox"
                      checked={saveDestination}
                      onChange={(e) => setSaveDestination(e.target.checked)}
                      style={{ margin: 0 }}
                    />
                    이 도착지를 화주 주소록에 저장
                  </label>
                )}
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

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : quotes.length === 0 ? (
          <div className="empty-state">
            {period === "all"
              ? "아직 생성된 견적이 없습니다."
              : "선택한 기간에 생성된 견적이 없습니다."}
          </div>
        ) : (
          <table style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th>견적번호</th>
                <th>고객</th>
                <th>구간</th>
                <th>톤수</th>
                <th>금액</th>
                <th>상태</th>
                <th>일시</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => router.push(`/admin/quotes/${q.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="cell-nowrap">{q.quote_no}</td>
                  <td className="cell-nowrap" style={{ minWidth: 110 }}>
                    {q.companies?.name || q.guest_name || "-"}
                    {!q.companies?.name && q.guest_name && (
                      <span className="badge" style={{ marginLeft: 6 }}>
                        개인
                      </span>
                    )}
                  </td>
                  <td>
                    <div>{q.origin || "-"} →</div>
                    <div>{q.destination || "-"}</div>
                  </td>
                  <td className="cell-nowrap">{q.vehicle_type || "-"}</td>
                  <td className="cell-nowrap">{q.final_amount ? won(q.final_amount) : "-"}</td>
                  <td className="cell-nowrap">{q.status}</td>
                  <td className="cell-nowrap">{new Date(q.created_at).toLocaleDateString("ko-KR")}</td>
                  <td className="cell-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-danger"
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                      onClick={() => handleDeleteQuote(q.id, q.quote_no)}
                    >
                      삭제
                    </button>
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
