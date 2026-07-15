"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { STATUS_OPTIONS, getStatusColor } from "@/lib/statusColors";
import {
  REGIONS,
  VEHICLE_TYPES,
  BODY_TYPES,
  GRADE_OPTIONS,
  formatPhoneNumber,
} from "@/lib/constants";
import { MANUAL_SOURCE_OPTIONS, getSourceChips } from "@/lib/sourceColors";
import MultiSelectTags from "@/components/MultiSelectTags";

type Company = {
  id: string;
  name: string;
  industry: string | null;
  sub_industry: string | null;
  metro_region: string | null;
  district: string | null;
  region: string | null;
  phone: string | null;
  status: string;
  grade: string | null;
  next_followup_date: string | null;
  created_at: string;
  source_sheet: string | null;
  manual_source_type: string | null;
  manual_source_note: string | null;
};

const SOURCE_TABS = [
  { key: "전체", label: "전체" },
  { key: "수도권중소업체DB", label: "수도권 중소업체" },
  { key: "프랜차이즈DB", label: "프랜차이즈" },
  { key: "패키징공장DB", label: "패키징공장" },
  { key: "직접등록", label: "직접 등록" },
];

const ACTIVE_STATUSES_FOR_BUTTON = [
  "견적요청",
  "견적발송",
  "첫거래완료",
  "재거래발생",
  "반복화주",
  "월정산화주",
];

const SORT_OPTIONS = [
  { key: "created_at", label: "등록일" },
  { key: "source", label: "출처" },
  { key: "name", label: "회사명" },
  { key: "industry", label: "업종/세부업종" },
  { key: "region", label: "지역" },
  { key: "status", label: "영업상태" },
];

const EMPTY_FORM = {
  name: "",
  industry: "",
  sub_industry: "",
  metro_region: "",
  district: "",
  address: "",
  phone: "",
  website: "",
  main_items: "",
  biz_reg_no: "",
  contact_name: "",
  contact_position: "",
  contact_mobile: "",
  contact_email: "",
  payment_terms: "",
  main_pickup_region: "",
  main_dropoff_region: "",
  assigned_staff: "",
  recommended_vehicle_tonnage: VEHICLE_TYPES[0],
  recommended_vehicle_bodytype: BODY_TYPES[0],
  status: "미접촉",
  grade: "",
  next_followup_date: "",
  notes: "",
  source_type: "",
  source_note: "",
};

function formatIndustry(c: Company) {
  if (c.industry && c.sub_industry) return `${c.industry} / ${c.sub_industry}`;
  return c.industry || c.sub_industry || "-";
}

function formatRegion(c: Company) {
  if (c.metro_region && c.district) return `${c.metro_region} ${c.district}`;
  return c.metro_region || c.district || c.region || "-";
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("전체");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [form, setForm] = useState(EMPTY_FORM);

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadCompanies() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id,name,industry,sub_industry,metro_region,district,region,phone,status,grade,next_followup_date,created_at,source_sheet,manual_source_type,manual_source_note"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setCompanies(data as Company[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("회사명은 필수입니다.");
      return;
    }
    setSaving(true);
    setError(null);

    const recommendedVehicle =
      form.recommended_vehicle_tonnage && form.recommended_vehicle_bodytype
        ? `${form.recommended_vehicle_tonnage} ${form.recommended_vehicle_bodytype}`
        : null;

    const { error } = await supabase.from("companies").insert({
      name: form.name,
      industry: form.industry || null,
      sub_industry: form.sub_industry || null,
      metro_region: form.metro_region || null,
      district: form.district || null,
      address: form.address || null,
      phone: form.phone || null,
      website: form.website || null,
      main_items: form.main_items || null,
      biz_reg_no: form.biz_reg_no || null,
      contact_name: form.contact_name || null,
      contact_position: form.contact_position || null,
      contact_mobile: form.contact_mobile || null,
      contact_email: form.contact_email || null,
      payment_terms: form.payment_terms || null,
      main_pickup_region: form.main_pickup_region || null,
      main_dropoff_region: form.main_dropoff_region || null,
      assigned_staff: form.assigned_staff || null,
      recommended_vehicle: recommendedVehicle,
      status: form.status,
      grade: form.grade || null,
      next_followup_date: form.next_followup_date || null,
      notes: form.notes || null,
      manual_source_type: form.source_type || null,
      manual_source_note:
        form.source_type === "기타" ? form.source_note || null : null,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setForm(EMPTY_FORM);
    setShowForm(false);
    loadCompanies();
  }

  async function handleStatusChange(id: string, status: string) {
    const { error } = await supabase
      .from("companies")
      .update({ status })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
  }

  async function handleSendToCRM(id: string, name: string) {
    const confirmed = window.confirm(
      `"${name}"을(를) 활성 화주(CRM)로 전환하시겠습니까? 영업상태가 "견적요청"으로 변경됩니다.`
    );
    if (!confirmed) return;
    await handleStatusChange(id, "견적요청");
  }

  const filteredCompanies = companies
    .filter((c) => {
      if (activeTab === "전체") return true;
      if (activeTab === "직접등록") return !c.source_sheet;
      return c.source_sheet === activeTab;
    })
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone || "").includes(q) ||
        formatRegion(c).toLowerCase().includes(q) ||
        formatIndustry(c).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "source":
          av = a.source_sheet || "직접등록";
          bv = b.source_sheet || "직접등록";
          break;
        case "name":
          av = a.name;
          bv = b.name;
          break;
        case "industry":
          av = formatIndustry(a);
          bv = formatIndustry(b);
          break;
        case "region":
          av = formatRegion(a);
          bv = formatRegion(b);
          break;
        case "status":
          av = (STATUS_OPTIONS as readonly string[]).indexOf(a.status);
          bv = (STATUS_OPTIONS as readonly string[]).indexOf(b.status);
          break;
        case "created_at":
        default:
          av = a.created_at;
          bv = b.created_at;
      }
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv), "ko");
      return sortDir === "asc" ? cmp : -cmp;
    });

  const tabCounts: Record<string, number> = { 전체: companies.length };
  for (const c of companies) {
    const key = c.source_sheet || "직접등록";
    tabCounts[key] = (tabCounts[key] || 0) + 1;
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">화주 관리 (영업대상 + 화주 통합)</h1>
          <p className="page-desc">
            영업대상 업체와 실제 화주를 하나의 목록에서 상태값으로 관리합니다.
          </p>
        </div>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "닫기" : "+ 신규 업체 등록"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        {SOURCE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? "btn" : "btn btn-ghost"}
            style={{ fontSize: 12.5, padding: "7px 12px" }}
          >
            {tab.label} ({tabCounts[tab.key] || 0})
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 360 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="회사명, 연락처, 지역, 업종으로 검색"
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
              aria-label="검색어 지우기"
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
                lineHeight: 1,
                padding: 4,
              }}
            >
              ×
            </button>
          )}
        </div>
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

      {error && <div className="error-box">오류: {error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>회사명 *</label>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="예: ○○정밀"
                />
              </div>
              <div className="field">
                <label>업종</label>
                <input
                  value={form.industry}
                  onChange={(e) => setField("industry", e.target.value)}
                  placeholder="예: 제조 / 금속가공"
                />
              </div>
              <div className="field">
                <label>세부업종</label>
                <input
                  value={form.sub_industry}
                  onChange={(e) => setField("sub_industry", e.target.value)}
                />
              </div>
              <div className="field">
                <label>광역권</label>
                <select
                  value={form.metro_region}
                  onChange={(e) => setField("metro_region", e.target.value)}
                >
                  <option value="">선택</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>시군구</label>
                <input
                  value={form.district}
                  onChange={(e) => setField("district", e.target.value)}
                  placeholder="예: 시흥시"
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>주소</label>
                <input
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                />
              </div>
              <div className="field">
                <label>대표번호</label>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setField("phone", formatPhoneNumber(e.target.value))
                  }
                  placeholder="숫자만 입력하면 자동으로 - 표시"
                />
              </div>
              <div className="field">
                <label>웹사이트</label>
                <input
                  value={form.website}
                  onChange={(e) => setField("website", e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="field">
                <label>취급 품목</label>
                <input
                  value={form.main_items}
                  onChange={(e) => setField("main_items", e.target.value)}
                />
              </div>
              <div className="field">
                <label>사업자등록번호</label>
                <input
                  value={form.biz_reg_no}
                  onChange={(e) => setField("biz_reg_no", e.target.value)}
                  placeholder="000-00-00000"
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  marginTop: 8,
                }}
              >
                담당자 정보
              </div>
              <div className="field">
                <label>담당자명</label>
                <input
                  value={form.contact_name}
                  onChange={(e) => setField("contact_name", e.target.value)}
                />
              </div>
              <div className="field">
                <label>직책</label>
                <input
                  value={form.contact_position}
                  onChange={(e) => setField("contact_position", e.target.value)}
                />
              </div>
              <div className="field">
                <label>휴대폰</label>
                <input
                  value={form.contact_mobile}
                  onChange={(e) =>
                    setField("contact_mobile", formatPhoneNumber(e.target.value))
                  }
                  placeholder="숫자만 입력하면 자동으로 - 표시"
                />
              </div>
              <div className="field">
                <label>이메일</label>
                <input
                  value={form.contact_email}
                  onChange={(e) => setField("contact_email", e.target.value)}
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  marginTop: 8,
                }}
              >
                거래 정보
              </div>
              <div className="field">
                <label>추천 차량</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <select
                    value={form.recommended_vehicle_tonnage}
                    onChange={(e) =>
                      setField("recommended_vehicle_tonnage", e.target.value)
                    }
                    style={{ flex: 1 }}
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    value={form.recommended_vehicle_bodytype}
                    onChange={(e) =>
                      setField("recommended_vehicle_bodytype", e.target.value)
                    }
                    style={{ flex: 1 }}
                  >
                    {BODY_TYPES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>결제조건</label>
                <input
                  value={form.payment_terms}
                  onChange={(e) => setField("payment_terms", e.target.value)}
                  placeholder="예: 월말 정산"
                />
              </div>
              <div className="field">
                <label>담당직원</label>
                <input
                  value={form.assigned_staff}
                  onChange={(e) => setField("assigned_staff", e.target.value)}
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>주요 상차지역 (중복 선택 가능)</label>
                <MultiSelectTags
                  options={REGIONS}
                  value={form.main_pickup_region}
                  onChange={(v) => setField("main_pickup_region", v)}
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>주요 하차지역 (중복 선택 가능)</label>
                <MultiSelectTags
                  options={REGIONS}
                  value={form.main_dropoff_region}
                  onChange={(v) => setField("main_dropoff_region", v)}
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  marginTop: 8,
                }}
              >
                출처
              </div>
              <div className="field">
                <label>출처 분류</label>
                <select
                  value={form.source_type}
                  onChange={(e) => setField("source_type", e.target.value)}
                >
                  <option value="">미지정</option>
                  {MANUAL_SOURCE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o === "기타" ? "기타 (수기작성)" : o}
                    </option>
                  ))}
                </select>
              </div>
              {form.source_type === "기타" && (
                <div className="field">
                  <label>출처 설명</label>
                  <input
                    value={form.source_note}
                    onChange={(e) => setField("source_note", e.target.value)}
                    placeholder="예: 지인 소개, 홈페이지 문의 등"
                  />
                </div>
              )}

              <div
                style={{
                  gridColumn: "1 / -1",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  marginTop: 8,
                }}
              >
                영업 정보
              </div>
              <div className="field">
                <label>영업상태</label>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>화주등급</label>
                <select
                  value={form.grade}
                  onChange={(e) => setField("grade", e.target.value)}
                >
                  <option value="">미지정</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>다음 연락 예정일</label>
                <input
                  type="date"
                  value={form.next_followup_date}
                  onChange={(e) => setField("next_followup_date", e.target.value)}
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>메모</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="통화내용, 특이사항"
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setShowForm(false);
                }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filteredCompanies.length === 0 ? (
          <div className="empty-state">
            해당 조건에 등록된 업체가 없습니다.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>출처</th>
                <th>회사명</th>
                <th>업종/세부업종</th>
                <th>지역</th>
                <th>대표번호</th>
                <th>영업상태</th>
                <th>등록일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/admin/companies/${c.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {getSourceChips(c).map((chip, i) => (
                        <span
                          key={i}
                          className="badge"
                          style={{ background: chip.bg, color: chip.text }}
                        >
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{c.name}</td>
                  <td>{formatIndustry(c)}</td>
                  <td>{formatRegion(c)}</td>
                  <td>{c.phone || "-"}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      value={c.status}
                      onChange={(e) =>
                        handleStatusChange(c.id, e.target.value)
                      }
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "none",
                        fontWeight: 600,
                        background: getStatusColor(c.status).bg,
                        color: getStatusColor(c.status).text,
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{new Date(c.created_at).toLocaleDateString("ko-KR")}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {!ACTIVE_STATUSES_FOR_BUTTON.includes(c.status) && (
                      <button
                        className="btn-ghost"
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => handleSendToCRM(c.id, c.name)}
                      >
                        CRM 전환
                      </button>
                    )}
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
