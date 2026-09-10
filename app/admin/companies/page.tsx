"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { STATUS_OPTIONS, getStatusColor } from "@/lib/statusColors";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import { getSourceChips } from "@/lib/sourceColors";
import { getCurrentStaffId } from "@/lib/currentStaff";
// 🔴 화주 항목 정의는 `lib/companyFields.ts` 한 곳이다 — 이 화면에 필드 배열을
//    다시 만들지 말 것(33차 A장). 신규 등록·상세 수정·신청 승인 세 입구가 같은 정의를 읽는다.
import {
  COMPANY_FORM_OPEN_SECTIONS,
  COMPANY_SECTIONS,
  COMPANY_REQUIRED_FIELDS,
  buildCompanyPayload,
  companyFormFieldsOf,
  emptyCompanyForm,
  isRecurringContractActive,
  type CompanySection,
} from "@/lib/companyFields";
import CompanyFieldInput from "@/components/CompanyFieldInput";
import RecurringContractBadge from "@/components/RecurringContractBadge";

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
  // 🔴 배지 판정에 종료일이 반드시 필요하다 — `is_recurring_contract` 만 읽으면
  //    끝난 계약의 배지가 목록에 영원히 남는다(isRecurringContractActive).
  is_recurring_contract: boolean | null;
  recurring_contract_ended_on: string | null;
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

// 🔴 폼의 빈 값은 `emptyCompanyForm()` 이 만든다 — 여기에 EMPTY_FORM 을 다시
//    적으면 lib/companyFields.ts 와 갈린다(33차 A장에 그래서 지운 자리다).

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

  const [form, setForm] = useState<Record<string, any>>(emptyCompanyForm);
  // 접이식 구획 — 🔴 접혀 있어도 폼에서 빠지지 않는다(입력한 값은 그대로 저장된다).
  const [openSections, setOpenSections] = useState<CompanySection[]>([
    ...COMPANY_FORM_OPEN_SECTIONS,
  ]);
  // 「정기계약만 보기」
  const [recurringOnly, setRecurringOnly] = useState(false);

  // 🔴 `useCallback` 을 벗기지 말 것 — 참조가 매 렌더 바뀌면 `CompanyFieldInput` 의
  //    `React.memo` 가 무력해져 입력칸 51개가 전부 다시 그려진다(리뷰 1라운드 「버벅거림」).
  const setField = useCallback((key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 주소검색이 돌려주는 sido/sigungu 를 대응 컬럼에 같이 담는다(원칙 37번).
  const setAddressField = useCallback(
    (key: string, addr: string, sido: string, sigungu: string) => {
      const prefix = key.replace(/_address$/, "");
      setForm((prev) => ({
        ...prev,
        [key]: addr,
        [`${key}Detail`]: "",
        [`${prefix}_sido`]: sido,
        [`${prefix}_sigungu`]: sigungu,
      }));
    },
    []
  );

  const toggleSection = useCallback((section: CompanySection) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  }, []);

  async function loadCompanies() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("companies")
      .select(
        // 🔴 정기계약 배지는 `is_recurring_contract` 와 **종료일 둘 다** 필요하다
        //    (종료일이 지난 계약에는 배지를 붙이지 않는다).
        "id,name,industry,sub_industry,metro_region,district,region,phone,status,grade,next_followup_date,created_at,source_sheet,manual_source_type,manual_source_note,is_recurring_contract,recurring_contract_ended_on"
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
    // 🔴 필수 항목도 정의 파일이 정한다 — 여기에 목록을 다시 적지 말 것.
    const missing = COMPANY_REQUIRED_FIELDS.filter(
      (f) => !String(form[f.key] ?? "").trim()
    );
    if (missing.length > 0) {
      setError(`${missing.map((f) => f.label).join(", ")}은(는) 필수입니다.`);
      // 필수 항목이 접힌 구획에 있으면 펼쳐서 어디를 채워야 하는지 보여준다.
      setOpenSections((prev) =>
        Array.from(new Set([...prev, ...missing.map((f) => f.section)]))
      );
      return;
    }
    setSaving(true);
    setError(null);

    const staffId = await getCurrentStaffId();
    // 🔴 payload 조립도 `buildCompanyPayload()` 한 함수만 쓴다(세 입구 공통).
    //    실적값(`includePerformance`)은 신규 등록에 넣지 않는다 — 정산이 갱신한다.
    const { error } = await supabase.from("companies").insert({
      ...buildCompanyPayload(form),
      created_by: staffId,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setForm(emptyCompanyForm());
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
    // 🔴 종료일이 지난 계약은 걸러진다 — 배지와 같은 판정을 쓴다(정의처 한 곳).
    .filter((c) => (recurringOnly ? isRecurringContractActive(c) : true))
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

      {/* 🔴 조회 실패 배너는 어느 조건에도 넣지 말 것 — 아래 두 블록 바깥에 있어야
          폼이 열려 있든 닫혀 있든 오류가 보인다. */}
      {error && <div className="error-box">오류: {error}</div>}

      {/* 🔴 카드에 padding 을 준다 — 다른 등록 폼(오더·차주)과 같은 어휘다.
          안 주면 구획 제목이 카드 가장자리에 붙어 입력칸과 좌우 기준선이 어긋난다
          (`.form-grid` 는 자체 padding 22px 을 갖는데 제목 버튼은 0이라 그랬다).
          그래서 아래에서 `.form-grid` 의 padding 을 눌러 이중 여백을 없앤다. */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
            {/*
              🔴 항목을 여기에 손으로 적지 말 것 — `lib/companyFields.ts` 를 돌린다.
                 등록 폼과 상세 수정 폼이 **같은 정의**를 읽어야 다시 갈리지 않는다.
              🔴 접힌 구획도 **마운트를 유지하고 CSS 로만 감춘다**(`display: none`).
                 조건부 렌더링(`open && <div/>`)으로 되돌리지 말 것 — 펼칠 때마다
                 AddressSearch·MultiSelectTags 가 다시 마운트되어 **CPU 6배 스로틀에서
                 「거래 조건」 펼침이 238ms** 였다(실사용 리뷰 1라운드 「버벅거림」의 원인).
                 `display: none` 은 탭 순서에서도 빠지므로 접근성은 그대로다.
              🔴 접힌 구획의 값도 그대로 저장된다 — state 는 처음부터 하나다.
            */}
            {COMPANY_SECTIONS.map((section) => {
              // 🔴 `form` 을 넘겨 조건부 항목(출처 설명)을 정의가 걸러 준다.
              const fields = companyFormFieldsOf(section, form);
              if (fields.length === 0) return null; // 「실적」은 등록 폼에 없다
              const open = openSections.includes(section);
              return (
                <div key={section} style={{ marginBottom: 14 }}>
                  <button
                    type="button"
                    onClick={() => toggleSection(section)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "11px 14px",
                      background: open ? "transparent" : "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      cursor: "pointer",
                      font: "inherit",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--text)",
                      textAlign: "left",
                    }}
                    aria-expanded={open}
                  >
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {open ? "\u25BC" : "\u25B6"}
                    </span>
                    {section}
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        fontWeight: 400,
                        color: "var(--text-muted)",
                      }}
                    >
                      {open ? `${fields.length}항목` : `상세 정보 더보기 (${fields.length}항목)`}
                    </span>
                  </button>
                  <div
                    className="form-grid"
                    style={{
                      display: open ? "grid" : "none",
                      padding: "14px 2px 4px",
                    }}
                  >
                    {fields.map((f) => (
                      <CompanyFieldInput
                        key={f.key}
                        field={f}
                        value={form[f.key]}
                        detailValue={form[`${f.key}Detail`]}
                        tonnage={form.recommended_vehicle_tonnage}
                        bodytype={form.recommended_vehicle_bodytype}
                        onChange={setField}
                        onAddressChange={setAddressField}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid var(--border)",
              }}
            >
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "저장 중..." : "등록"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setForm(emptyCompanyForm());
                  setShowForm(false);
                }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 🔴 등록 폼이 열려 있으면 목록·검색·탭을 통째로 그리지 않는다(아래 목록 주석 참고).
          화주 540건을 페이지네이션 없이 그리는 동안 폼 구획을 토글하면 그 전체가
          다시 배치되어 화면이 멈춘 것처럼 느껴졌다.
          🔴 **위의 `{showForm && …}` 폼 블록을 이 괄호 안으로 옮기지 말 것** — 두 조건이
             서로 배타적이라 폼이 **영영 렌더링되지 않는다.** 실사용 리뷰 3라운드
             「신규업체등록을 누르면 아무것도 안뜬다」가 정확히 그 상태였다(내가 이 블록을
             만들 때 폼까지 감싸버렸다). 순서는 **폼이 먼저, 이 블록이 나중**이다. */}
      {!showForm && (
        <>
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
        {/*
          「정기계약만 보기」 — 🔴 배지와 **같은 판정**을 쓴다(isRecurringContractActive).
             종료일이 지난 계약은 여기서도 걸러진다.
        */}
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            cursor: "pointer",
            padding: "8px 10px",
            border: `1px solid ${recurringOnly ? "#4338CA" : "var(--border)"}`,
            borderRadius: "var(--radius)",
            background: recurringOnly ? "#E0E7FF" : "transparent",
            color: recurringOnly ? "#4338CA" : "var(--text)",
            fontWeight: recurringOnly ? 700 : 400,
            whiteSpace: "nowrap",
          }}
        >
          <input
            type="checkbox"
            checked={recurringOnly}
            onChange={(e) => setRecurringOnly(e.target.checked)}
            style={{ width: 15, height: 15, margin: 0 }}
          />
          정기계약만 보기
        </label>
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


      {/*
        🔴 `contain: layout style` 을 빼지 말 것 — 등록 폼의 구획을 펼치고 닫을 때
           **아래 목록 전체의 레이아웃이 다시 계산되던 것**을 막는다. 실사용 리뷰
           2라운드 「클릭시 버벅대고 윈도우도 같이 버벅댄다」의 진짜 원인이었다.
           실측(목록 300행 · CPU 6배 스로틀 프로덕션): **192ms → 103ms**.
        ⚠️ React 재렌더가 아니라 **브라우저 레이아웃**이 원인이라 memo 로는 안 줄었다
           (React 동기 작업은 이미 10ms 였다).
        🔴 `paint` 를 더하지 말 것 — 이득이 9ms 뿐인데 이 카드가 클리핑 컨테이너가 되어
           안쪽 요소가 카드 밖으로 넘칠 수 없게 된다.
        ⚠️ 목록이 길수록 비용이 커진다 — 근본 해결은 페이지네이션이고 별도 로드맵 항목이다.
      */}
      {/*
        🔴 **등록 폼이 열려 있는 동안에는 목록을 그리지 않는다.**
           화주가 실제로 **540건**이고 이 목록은 페이지네이션 없이 전부 그리므로,
           등록 폼에서 구획을 접었다 펼 때마다 그 수천 개 DOM 이 통째로 다시 배치됐다.
           그것이 실사용 리뷰 2라운드 「클릭시 버벅대고 윈도우도 같이 버벅댄다」의
           진짜 원인이다(실측: 목록 300행 기준 121ms → 감추면 79ms, 540행이면 더 크다).
        🟢 정보 손실이 아니다 — 등록을 닫으면 목록이 그대로 돌아온다.
        ⚠️ 근본 해결은 목록 페이지네이션이고 별도 로드맵 항목이다(§5 「유료 플랜 전환 /
           페이지네이션」). 그때 이 분기는 없애도 된다.
      */}
      <div className="card" style={{ contain: "layout style" }}>
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
                  <td>
                    <span
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      {c.name}
                      {/* 🔴 종료일이 지난 계약에는 안 붙는다(컴포넌트가 판정한다) */}
                      <RecurringContractBadge company={c} small />
                    </span>
                  </td>
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
        </>
      )}
    </main>
  );
}
