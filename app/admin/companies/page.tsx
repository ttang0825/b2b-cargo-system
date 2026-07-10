"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { STATUS_OPTIONS, getStatusColor } from "@/lib/statusColors";

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

  const [form, setForm] = useState({
    name: "",
    industry: "",
    region: "",
    phone: "",
    status: "미접촉",
    recommended_vehicle: "",
    notes: "",
  });

  async function loadCompanies() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id,name,industry,sub_industry,metro_region,district,region,phone,status,grade,next_followup_date,created_at,source_sheet"
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

    const { error } = await supabase.from("companies").insert({
      name: form.name,
      industry: form.industry || null,
      region: form.region || null,
      phone: form.phone || null,
      status: form.status,
      recommended_vehicle: form.recommended_vehicle || null,
      notes: form.notes || null,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setForm({
      name: "",
      industry: "",
      region: "",
      phone: "",
      status: "미접촉",
      recommended_vehicle: "",
      notes: "",
    });
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
          av = STATUS_OPTIONS.indexOf(a.status);
          bv = STATUS_OPTIONS.indexOf(b.status);
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
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="예: ○○정밀"
                />
              </div>
              <div className="field">
                <label>업종</label>
                <input
                  value={form.industry}
                  onChange={(e) =>
                    setForm({ ...form, industry: e.target.value })
                  }
                  placeholder="예: 제조 / 금속가공"
                />
              </div>
              <div className="field">
                <label>지역</label>
                <input
                  value={form.region}
                  onChange={(e) =>
                    setForm({ ...form, region: e.target.value })
                  }
                  placeholder="예: 시흥"
                />
              </div>
              <div className="field">
                <label>대표번호</label>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  placeholder="031-000-0000"
                />
              </div>
              <div className="field">
                <label>추천 차량</label>
                <input
                  value={form.recommended_vehicle}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      recommended_vehicle: e.target.value,
                    })
                  }
                  placeholder="예: 1톤 탑차"
                />
              </div>
              <div className="field">
                <label>영업상태</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>메모</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
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
                onClick={() => setShowForm(false)}
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
                    <span className="badge">
                      {c.source_sheet || "직접등록"}
                    </span>
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
