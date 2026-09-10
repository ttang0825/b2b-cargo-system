"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { STATUS_OPTIONS, getStatusColor } from "@/lib/statusColors";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import { getSourceChips } from "@/lib/sourceColors";
// ⚠️ 아래 셋은 **화주 항목 폼이 아닌 다른 기능**이 쓴다 — 지우지 말 것:
//    AddressSearch → 「저장된 주소」 섹션(customer_locations 추가)
//    formatPhoneNumber → 화주포털 계정 발급 폼의 담당자 전화번호
import AddressSearch from "@/components/AddressSearch";
import { formatPhoneNumber } from "@/lib/constants";
// 🔴 화주 항목 정의는 `lib/companyFields.ts` 한 곳이다(33차 A장) — 여기에 있던
//    BASIC_FIELDS · SALES_REF_FIELDS · CRM_CONTACT_FIELDS · CRM_BIZ_FIELDS ·
//    CRM_PERFORMANCE_FIELDS 다섯 배열을 그 파일로 옮겼다. 다시 만들지 말 것.
import {
  COMPANY_FIELDS,
  COMPANY_SECTIONS,
  buildCompanyPayload,
  companyFieldsOf,
  emptyCompanyForm,
  isRecurringContractActive,
  parseRecommendedVehicle,
} from "@/lib/companyFields";
import CompanyFieldInput from "@/components/CompanyFieldInput";
import RecurringContractBadge from "@/components/RecurringContractBadge";
import { getCurrentStaffId, getCurrentStaffRole } from "@/lib/currentStaff";
import ProcessedByFooter from "@/components/ProcessedByFooter";
import ConflictWarning from "@/components/ConflictWarning";
import { optimisticUpdate } from "@/lib/optimisticUpdate";
import SmsLogPanel from "@/components/SmsLogPanel";
import SmsConfirmModal, { SmsPreview } from "@/components/SmsConfirmModal";

type CompanyDetail = { [key: string]: any };

function Field({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div style={{ marginBottom: 10, minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13.5,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {String(value)}
      </div>
    </div>
  );
}

// 편집모드일 때는 입력창, 아닐 때는 값을 보여주는 공용 그리드 필드
function EditableField({
  label,
  value,
  editing,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  editing: boolean;
  onChange: (v: string) => void;
  type?: string;
}) {
  if (!editing) return <Field label={label} value={value} />;
  return (
    <div className="field" style={{ minWidth: 0 }}>
      <label>{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// "1톤 카고" 형태의 저장 문자열을 톤수/차량형태 선택값으로 분리







// 🔴 필드 배열 다섯 개와 parseRecommendedVehicle 은 `lib/companyFields.ts` 로 옮겼다
//    (33차 A장). 여기에 다시 만들면 등록 폼과 갈린다.

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  // 활성 화주(CRM) 목록에서 들어온 경우, 목록으로 돌아갈 때/상단메뉴 활성표시도
  // 그쪽 목록을 가리키게 함 (?from_order 패턴과 동일한 출처 파라미터 방식)
  const fromCustomers = searchParams.get("from") === "customers";
  const listHref = fromCustomers ? "/admin/customers" : "/admin/companies";
  const listLabel = fromCustomers ? "활성 화주 목록" : "화주 관리 목록";

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
  }, []);

  type Location = {
    id: string;
    location_name: string | null;
    address: string | null;
    location_type: string | null;
    sido: string | null;
    sigungu: string | null;
  };
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocType, setNewLocType] = useState("상차지");
  const [newLocAddress, setNewLocAddress] = useState("");
  const [newLocDetail, setNewLocDetail] = useState("");
  const [newLocSido, setNewLocSido] = useState("");
  const [newLocSigungu, setNewLocSigungu] = useState("");
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editingLocValue, setEditingLocValue] = useState("");

  // 🔴 빈 값 묶음도 정의 파일이 만든다 — 여기에 키 목록을 다시 적으면 갈린다.
  const [editForm, setEditForm] = useState<Record<string, any>>(emptyCompanyForm);

  const [portalAccounts, setPortalAccounts] = useState<any[]>([]);
  const [newAccountPhone, setNewAccountPhone] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [issuingAccount, setIssuingAccount] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<{ login_id: string; password: string } | null>(null);
  const [smsPreview, setSmsPreview] = useState<SmsPreview | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState("");
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  useEffect(() => {
    setPortalUrl(`${window.location.origin}/customer/login`);
  }, []);

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 1500);
  }

  // 주소검색이 함께 준 sido/sigungu 를 대응 컬럼에 같이 담는다(원칙 37번).
  // 🔴 이걸 빼면 광역권·시군구 자동기입이 조용히 비어 배차 판단에 못 쓴다.
  const setAddress = useCallback(
    (key: string, addr: string, sido: string, sigungu: string) => {
      const prefix = key.replace(/_address$/, "");
      setEditForm((prev) => ({
        ...prev,
        [key]: addr,
        [`${key}Detail`]: "",
        [`${prefix}_sido`]: sido,
        [`${prefix}_sigungu`]: sigungu,
      }));
    },
    []
  );

  // 🔴 `useCallback` 을 벗기지 말 것(등록 폼과 같은 이유 — memo 가 무력해진다).
  const set = useCallback((key: string, value: any) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function loadCompany() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      setError(error.message);
    } else {
      setCompany(data);
      // 🔴 DB 값 → 폼 state. 키 목록을 여기 적지 말고 정의 파일을 돌린다.
      //    ⚠️ 주소는 저장할 때 「도로명 + 상세」를 한 문자열로 합쳤으므로 되돌릴 수
      //       없다 — 전체를 도로명 칸에 넣고 상세 칸을 비우는 것이 기존 동작이다.
      const initial: Record<string, any> = {};
      for (const f of COMPANY_FIELDS) {
        initial[f.key] = data[f.key] ?? (f.type === "checkbox" ? false : "");
      }
      // 주소검색이 채우는 파생 컬럼 — 정의에는 없지만 저장할 때 같이 쓴다.
      for (const k of [
        "main_pickup_sido",
        "main_pickup_sigungu",
        "main_dropoff_sido",
        "main_dropoff_sigungu",
      ]) {
        initial[k] = data[k] ?? "";
      }
      initial.main_pickup_addressDetail = "";
      initial.main_dropoff_addressDetail = "";
      const parsedVehicle = parseRecommendedVehicle(data.recommended_vehicle);
      initial.recommended_vehicle_tonnage = parsedVehicle.tonnage;
      initial.recommended_vehicle_bodytype = parsedVehicle.bodytype;
      setEditForm(initial);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (id) {
      loadCompany();
      loadLocations();
      loadPortalAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadPortalAccounts() {
    const { data } = await supabase
      .from("customer_accounts")
      .select("id,auth_user_id,login_id,email,name,contact_mobile,is_active,must_change_password,created_at")
      .eq("company_id", id)
      .order("created_at", { ascending: false });
    setPortalAccounts(data || []);
  }

  async function handleIssueAccount(e: React.FormEvent) {
    e.preventDefault();
    setIssuingAccount(true);
    setPortalError(null);
    setIssuedCredentials(null);
    try {
      const res = await fetch("/api/admin/create-portal-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: id,
          contact_mobile: newAccountPhone.trim() || null,
          name: newAccountName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPortalError(data.error || "계정 발급에 실패했습니다.");
        return;
      }
      setIssuedCredentials({ login_id: data.login_id, password: data.password });
      if (data.smsPreview) setSmsPreview(data.smsPreview);
      setNewAccountPhone("");
      setNewAccountName("");
      loadPortalAccounts();
    } catch {
      setPortalError("계정 발급 중 오류가 발생했습니다.");
    } finally {
      setIssuingAccount(false);
    }
  }

  async function handleToggleAccountActive(accountId: string, isActive: boolean) {
    await supabase
      .from("customer_accounts")
      .update({ is_active: !isActive })
      .eq("id", accountId);
    loadPortalAccounts();
  }

  async function handleSupportLogin(accountId: string, email: string) {
    const confirmed = window.confirm(
      `"${email}" 화주 계정으로 접속하시겠습니까? 접속 기록이 남습니다.`
    );
    if (!confirmed) return;
    setPortalError(null);
    try {
      const res = await fetch("/api/admin/support-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_account_id: accountId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPortalError(data.error || "지원접속에 실패했습니다.");
        return;
      }
      const verifyUrl = `/customer/support-verify?token_hash=${encodeURIComponent(data.token_hash)}`;
      window.open(verifyUrl, "_blank");
    } catch {
      setPortalError("지원접속 중 오류가 발생했습니다.");
    }
  }

  async function handleDeleteAccount(authUserId: string, email: string) {
    const confirmed = window.confirm(
      `"${email}" 계정을 완전히 삭제하시겠습니까? 로그인 계정 자체가 삭제되며 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;
    setPortalError(null);
    try {
      const res = await fetch("/api/admin/delete-portal-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth_user_id: authUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPortalError(data.error || "계정 삭제에 실패했습니다.");
        return;
      }
      loadPortalAccounts();
    } catch {
      setPortalError("계정 삭제 중 오류가 발생했습니다.");
    }
  }

  async function handleResetPassword(authUserId: string, loginId: string) {
    const confirmed = window.confirm(
      `"${loginId}" 계정의 비밀번호를 재발급하시겠습니까? 기존 비밀번호는 더 이상 쓸 수 없게 됩니다.`
    );
    if (!confirmed) return;
    setPortalError(null);
    try {
      const res = await fetch("/api/admin/reset-portal-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth_user_id: authUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPortalError(data.error || "비밀번호 재발급에 실패했습니다.");
        return;
      }
      setIssuedCredentials({ login_id: loginId, password: data.password });
      if (data.smsPreview) setSmsPreview(data.smsPreview);
      loadPortalAccounts();
    } catch {
      setPortalError("비밀번호 재발급 중 오류가 발생했습니다.");
    }
  }

  async function loadLocations() {
    const { data } = await supabase
      .from("customer_locations")
      .select("id,location_name,address,location_type,sido,sigungu")
      .eq("company_id", id);
    setLocations(data || []);
  }

  async function handleAddLocation() {
    if (!newLocAddress.trim()) return;
    const fullAddress = [newLocAddress, newLocDetail].filter((v) => v.trim()).join(" ");
    const { error } = await supabase.from("customer_locations").insert({
      company_id: id,
      address: fullAddress,
      location_type: newLocType,
      sido: newLocSido || null,
      sigungu: newLocSigungu || null,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setNewLocAddress("");
    setNewLocDetail("");
    setNewLocSido("");
    setNewLocSigungu("");
    loadLocations();
  }

  async function handleUpdateLocation(locId: string) {
    const { error } = await supabase
      .from("customer_locations")
      .update({ address: editingLocValue })
      .eq("id", locId);
    if (error) {
      setError(error.message);
      return;
    }
    setEditingLocId(null);
    loadLocations();
  }

  async function handleDeleteLocation(locId: string) {
    const confirmed = window.confirm("이 주소를 삭제하시겠습니까?");
    if (!confirmed) return;
    const res = await fetch("/api/admin/delete-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "customer_locations", id: locId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "삭제에 실패했습니다.");
      return;
    }
    loadLocations();
  }

  async function handleSave(force = false) {
    setSaving(true);
    setError(null);
    setConflict(false);

    // 🔴 payload 조립은 `buildCompanyPayload()` 한 함수만 쓴다 — 신규 등록·상세 수정·
    //    신청 승인 세 입구가 공통이다. 각자 조립하면 조용히 갈린다(그게 이 차수의 원인).
    //    ⚠️ 여기는 `includePerformance: true` 다 — 상세 화면은 실적값도 보여주므로
    //       state 에 들어 있고, 빼면 저장할 때 그 컬럼이 payload 에서 사라진다.
    //       (정산이 갱신하는 값이라 입력칸 자체는 잠겨 있다)
    const payload = buildCompanyPayload(editForm, { includePerformance: true });
    payload.updated_by = await getCurrentStaffId();

    if (force) {
      const { error } = await supabase.from("companies").update(payload).eq("id", id);
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      setEditing(false);
      loadCompany();
      return;
    }

    const { conflict: hasConflict, error } = await optimisticUpdate(
      "companies",
      id,
      payload,
      company?.updated_at
    );
    setSaving(false);
    if (error) {
      setError(error);
      return;
    }
    if (hasConflict) {
      setConflict(true);
      return;
    }
    setEditing(false);
    loadCompany();
  }

  async function handleDelete() {
    if (!company) return;
    setDeleting(true);
    setDeleteError(null);

    const [quoteRes, orderRes, invoiceRes] = await Promise.all([
      supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("company_id", id),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("company_id", id),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("company_id", id),
    ]);

    const relatedCount =
      (quoteRes.count || 0) + (orderRes.count || 0) + (invoiceRes.count || 0);

    if (relatedCount > 0) {
      setDeleting(false);
      alert(
        `이 업체는 이미 견적/운송/정산 기록이 ${relatedCount}건 있어 완전삭제할 수 없습니다.\n` +
          `대신 영업상태를 "거래중단"으로 변경해주세요.`
      );
      return;
    }

    const accountWarning =
      portalAccounts.length > 0
        ? `\n이 업체의 포털 계정 ${portalAccounts.length}개도 함께 삭제되어 로그인할 수 없게 됩니다.`
        : "";
    const confirmed = window.confirm(
      `"${company.name}" 업체를 정말 완전히 삭제하시겠습니까?\n` +
        `이 작업은 절대 되돌릴 수 없습니다 (백업이 없습니다).${accountWarning} ` +
        `단순히 목록에서 빼고 싶다면 취소 후 영업상태를 "거래중단" 또는 "휴면화주"로 바꿔주세요.`
    );
    if (!confirmed) {
      setDeleting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/delete-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: id }),
      });
      const data = await res.json();
      setDeleting(false);
      if (!res.ok) {
        setDeleteError(data.error || "삭제에 실패했습니다.");
        return;
      }
    } catch {
      setDeleting(false);
      setDeleteError("삭제 중 오류가 발생했습니다.");
      return;
    }

    router.push(listHref);
  }

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  if (error || !company) {
    return (
      <main className="container">
        <div className="error-box">
          업체 정보를 불러오지 못했습니다. {error}
        </div>
        <Link href={listHref} className="btn btn-ghost">
          ← 목록으로
        </Link>
      </main>
    );
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 16 }}>
        <Link
          href={listHref}
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          ← {listLabel}으로
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1
            className="page-title"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            {company.name}
            {/* 🔴 종료일이 지난 계약에는 안 붙는다(목록과 같은 판정) */}
            <RecurringContractBadge company={company} />
          </h1>
          <p
            className="page-desc"
            style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
          >
            {getSourceChips(company).map((chip, i) => (
              <span
                key={i}
                className="badge"
                style={{ background: chip.bg, color: chip.text }}
              >
                {chip.label}
              </span>
            ))}
            <span>{company.industry || "업종 미확인"}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!editing ? (
            <>
              <button className="btn" onClick={() => setEditing(true)}>
                정보 수정
              </button>
              {isAdmin && (
                <button
                  className="btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "var(--radius)",
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {deleting ? "확인 중..." : "완전삭제"}
                </button>
              )}
            </>
          ) : (
            <>
              <button className="btn" onClick={() => handleSave()} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setEditing(false);
                  setConflict(false);
                  loadCompany();
                }}
              >
                취소
              </button>
            </>
          )}
        </div>
      </div>

      {conflict && (
        <ConflictWarning
          onReload={() => {
            setConflict(false);
            loadCompany();
          }}
          onForceSave={() => handleSave(true)}
          saving={saving}
        />
      )}

      {deleteError && <div className="error-box">{deleteError}</div>}

      {/* 영업 상태 */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        {/*
          🔴 이 카드는 **표시 전용**이다(33차 A장). 전에는 여기서도 영업상태·화주등급·
             대표번호·담당부서·다음 연락일·출처·주소·메모 **9개를 편집**할 수 있었고,
             아래 「기본 정보」 구획에서도 같은 항목을 편집할 수 있었다 — 같은 값을
             두 자리에서 고치게 되어 담당자가 어느 쪽이 맞는지 헷갈린다.
          🔴 편집 입구는 아래 구획 하나다 — 여기에 입력칸을 다시 만들지 말 것.
          ⚠️ 수정 중에는 이 카드가 **저장 전 원래 값**을 보여준다(company 기준).
        */}
        {editing && (
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 10 }}>
            아래 구획에서 수정하고 있습니다 — 이 요약은 저장 전 값입니다.
          </div>
        )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 4,
            }}
          >
            <div style={{ marginBottom: 10, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                영업상태
              </div>
              <span
                style={{
                  display: "inline-block",
                  marginTop: 2,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: getStatusColor(company.status).bg,
                  color: getStatusColor(company.status).text,
                }}
              >
                {company.status}
              </span>
            </div>
            <Field label="화주등급" value={company.grade} />
            <Field label="대표번호" value={company.phone} />
            <Field label="담당부서" value={company.contact_department} />
            <Field
              label="다음 연락 예정일"
              value={company.next_followup_date}
            />
            <Field label="주소" value={company.address} />
          </div>
      </div>

{/*
        항목 구획 — 🔴 `lib/companyFields.ts` 를 돌린다. 이 화면에 필드 배열을
        다시 만들지 말 것(33차 A장에 다섯 배열을 그 파일로 옮겼다).
        🔴 등록 폼과 **같은 정의·같은 입력 컴포넌트**를 쓴다 — 그래서 다시 갈릴 수 없다.
        ⚠️ 「실적」 구획은 정산이 자동 갱신하는 값이라 등록 폼에는 없고 여기만 나온다
           (`inForm: false`). 그래서 등록 폼은 `companyFormFieldsOf`, 여기는
           `companyFieldsOf` 를 쓴다.
      */}
      {COMPANY_SECTIONS.map((section) => {
        const fields = companyFieldsOf(section);
        if (fields.length === 0) return null;
        // 표시 모드에서 값이 하나도 없는 구획은 그리지 않는다(빈 카드가 남지 않도록).
        const hasAnyValue = fields.some((f) => {
          const v = company[f.key];
          return f.type === "checkbox" ? v === true : v !== null && v !== undefined && v !== "";
        });
        if (!editing && !hasAnyValue) return null;
        return (
          <div key={section} className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
              {section}
              {section === "정기계약" && !editing && company.is_recurring_contract && (
                <span style={{ marginLeft: 8, verticalAlign: "middle" }}>
                  {isRecurringContractActive(company) ? (
                    <RecurringContractBadge company={company} />
                  ) : (
                    /* 🔴 종료일이 지난 계약은 배지 대신 「종료됨」이다 — 체크는 기록으로
                       남기되 목록에 배지를 영원히 남기지 않는다는 결정의 짝이다. */
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background: "#F3F4F6",
                        color: "#6B7280",
                      }}
                    >
                      종료됨
                    </span>
                  )}
                </span>
              )}
              {section === "실적" && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 400,
                    color: "var(--text-muted)",
                  }}
                >
                  정산에서 자동 갱신됩니다
                </span>
              )}
            </h3>
            <div
              className={editing ? "form-grid" : undefined}
              style={
                editing
                  ? { padding: 0 }
                  : {
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: 4,
                    }
              }
            >
              {fields.map((f) => {
                if (editing) {
                  // 🔴 조건부 노출은 정의 파일의 `showWhen` 이 정한다 — 여기에 조건을
                  //    적으면 등록 폼과 다르게 판단하게 된다(그래서 갈렸던 자리다).
                  if (f.showWhen && !f.showWhen(editForm)) return null;
                  return (
                    <CompanyFieldInput
                      key={f.key}
                      field={f}
                      value={editForm[f.key]}
                      detailValue={editForm[`${f.key}Detail`]}
                      tonnage={editForm.recommended_vehicle_tonnage}
                      bodytype={editForm.recommended_vehicle_bodytype}
                      onChange={set}
                      onAddressChange={setAddress}
                      /* 실적값은 정산이 갱신하므로 손으로 못 바꾸게 한다. */
                      disabled={f.inForm === false}
                    />
                  );
                }
                const raw = company[f.key];
                let shown: any =
                  f.type === "checkbox" ? (raw === true ? "예" : null) : raw;
                if (
                  (shown === null || shown === undefined || shown === "") &&
                  f.emptyLabel
                ) {
                  // 🔴 「비어 있음」이 곧 규칙인 항목(정산 마감일)은 그 뜻을 그린다.
                  shown = f.emptyLabel;
                } else if (shown !== null && shown !== undefined && shown !== "" && f.displaySuffix) {
                  shown = `${shown}${f.displaySuffix}`;
                }
                return <Field key={f.key} label={f.label} value={shown} />;
              })}
            </div>
          </div>
        );
      })}

      
      {/* 저장된 주소 (상차지/하차지) */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          저장된 주소
        </h3>

        {["상차지", "하차지"].map((type) => {
          const list = locations.filter((l) => l.location_type === type);
          return (
            <div key={type} style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                {type}
              </div>
              {list.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                  저장된 {type}가 없습니다.
                </p>
              ) : (
                list.map((loc, i) => (
                  <div
                    key={loc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 11.5,
                        flexShrink: 0,
                      }}
                    >
                      주소{i + 1}
                    </span>
                    {editingLocId === loc.id ? (
                      <input
                        autoFocus
                        value={editingLocValue}
                        onChange={(e) => setEditingLocValue(e.target.value)}
                        onBlur={() => handleUpdateLocation(loc.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            (e.target as HTMLInputElement).blur();
                        }}
                        style={{ flex: 1, fontSize: 13, padding: "3px 6px" }}
                      />
                    ) : (
                      <span
                        style={{ flex: 1, cursor: "pointer" }}
                        onClick={() => {
                          setEditingLocId(loc.id);
                          setEditingLocValue(loc.address || "");
                        }}
                        title="클릭해서 수정"
                      >
                        {loc.address}
                      </span>
                    )}
                    {isAdmin && (
                      <button
                        className="btn-danger"
                        style={{
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                        onClick={() => handleDeleteLocation(loc.id)}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          );
        })}

        <div style={{ marginTop: 12, maxWidth: 380 }}>
          <select
            value={newLocType}
            onChange={(e) => setNewLocType(e.target.value)}
            style={{ width: 100, fontSize: 12.5, marginBottom: 6 }}
          >
            <option value="상차지">상차지</option>
            <option value="하차지">하차지</option>
          </select>
          <AddressSearch
            label="새 주소"
            className=""
            value={newLocAddress}
            detailValue={newLocDetail}
            placeholder="주소검색 또는 직접 입력"
            detailPlaceholder="상세주소 (선택)"
            onChange={(addr, sido, sigungu) => {
              setNewLocAddress(addr);
              setNewLocSido(sido);
              setNewLocSigungu(sigungu);
            }}
            onDetailChange={setNewLocDetail}
          />
          <button
            className="btn"
            type="button"
            style={{ padding: "5px 12px", fontSize: 12.5, marginTop: 6 }}
            onClick={handleAddLocation}
          >
            추가
          </button>
        </div>
      </div>

      {/* 화주포털 계정 관리 */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 6 }}>
          화주포털 계정
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 0, marginBottom: 16 }}>
          이 화주가 견적·배차·정산 현황을 직접 조회할 수 있는 포털 계정을 발급합니다.
          보통 첫 운송오더가 등록되는 시점에 발급하는 것을 권장합니다.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--bg)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>포털 접속 주소</span>
          <span className="num" style={{ fontSize: 12.5, flex: 1, minWidth: 160 }}>
            {portalUrl}
          </span>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
            onClick={() => handleCopy(portalUrl, "url")}
          >
            {copiedLabel === "url" ? "복사됨 ✓" : "복사"}
          </button>
        </div>

        {portalAccounts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {portalAccounts.map((acc) => (
              <div
                key={acc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    <span className="num">{acc.login_id || "(구 계정, 아이디 없음)"}</span>
                    {acc.name && (
                      <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                        {" "}
                        ({acc.name})
                      </span>
                    )}
                  </div>
                  {acc.contact_mobile ? (
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                      담당자 전화번호: {acc.contact_mobile}
                    </div>
                  ) : (
                    acc.email && (
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                        연락처 이메일: {acc.email}
                      </div>
                    )
                  )}
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                    {new Date(acc.created_at).toLocaleDateString("ko-KR")} 발급
                    {acc.must_change_password && " · 최초 비밀번호 미변경"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    className="badge"
                    style={
                      acc.is_active
                        ? undefined
                        : { background: "var(--danger-soft)", color: "var(--danger)" }
                    }
                  >
                    {acc.is_active ? "활성" : "비활성"}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                      onClick={() => handleResetPassword(acc.auth_user_id, acc.login_id)}
                    >
                      비밀번호 재발급
                    </button>
                  )}
                  {isAdmin && acc.is_active && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                      onClick={() => handleSupportLogin(acc.id, acc.email)}
                    >
                      지원접속
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                    onClick={() => handleToggleAccountActive(acc.id, acc.is_active)}
                  >
                    {acc.is_active ? "비활성화" : "다시 활성화"}
                  </button>
                  {!acc.is_active && isAdmin && (
                    <button
                      type="button"
                      className="btn-danger"
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                      onClick={() => handleDeleteAccount(acc.auth_user_id, acc.email)}
                    >
                      완전삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {issuedCredentials && (
          <div
            style={{
              background: "var(--accent-soft)",
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--accent)" }}>
              아래 정보를 화주에게 전달해주세요 (한 번만 표시됩니다)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span>포털 주소: <span className="num">{portalUrl}</span></span>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10.5, cursor: "pointer" }}
                onClick={() => handleCopy(portalUrl, "issued-url")}
              >
                {copiedLabel === "issued-url" ? "복사됨" : "복사"}
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span>아이디: <span className="num">{issuedCredentials.login_id}</span></span>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10.5, cursor: "pointer" }}
                onClick={() => handleCopy(issuedCredentials.login_id, "issued-login-id")}
              >
                {copiedLabel === "issued-login-id" ? "복사됨" : "복사"}
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>임시 비밀번호: <span className="num">{issuedCredentials.password}</span></span>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10.5, cursor: "pointer" }}
                onClick={() => handleCopy(issuedCredentials.password, "issued-password")}
              >
                {copiedLabel === "issued-password" ? "복사됨" : "복사"}
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
              최초 로그인 시 비밀번호를 새로 설정하도록 되어 있습니다.
            </div>
          </div>
        )}

        {portalError && <div className="error-box">{portalError}</div>}

        <form onSubmit={handleIssueAccount} onKeyDown={handleFormKeyDown} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="tel"
            value={newAccountPhone}
            onChange={(e) => setNewAccountPhone(formatPhoneNumber(e.target.value))}
            placeholder="담당자 전화번호 (선택)"
            style={{ flex: "1 1 200px" }}
          />
          <input
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="담당자 이름 (선택)"
            style={{ flex: "1 1 140px" }}
          />
          <button className="btn" type="submit" disabled={issuingAccount}>
            {issuingAccount ? "발급 중..." : "포털 계정 발급"}
          </button>
        </form>
      </div>

      {portalAccounts.length > 0 && (
        <SmsLogPanel relatedType="portal_account" relatedIds={portalAccounts.map((a) => a.id)} />
      )}

      {/* 향후 연동 예정 영역 */}
      <div
        className="card"
        style={{ padding: 20, marginBottom: 20, opacity: 0.6 }}
      >
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 6 }}>
          영업활동이력 · 견적내역 · 정산내역
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>
          다음 단계(배차/정산 화면 제작)에서 이 업체와 연결된 통화기록,
          견적서, 거래내역이 이 자리에 표시됩니다.
        </p>
      </div>

      <ProcessedByFooter
        createdBy={company.created_by}
        createdAt={company.created_at}
        updatedBy={company.updated_by}
        updatedAt={company.updated_at}
      />

      {smsPreview && (
        <SmsConfirmModal
          preview={smsPreview}
          onSent={() => setSmsPreview(null)}
          onSkip={() => setSmsPreview(null)}
        />
      )}
    </main>
  );
}
