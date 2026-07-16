"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
function parseRecommendedVehicle(v: string | null | undefined) {
  if (!v) return { tonnage: VEHICLE_TYPES[0], bodytype: BODY_TYPES[0] };
  const trimmed = v.trim();
  for (const t of VEHICLE_TYPES) {
    if (trimmed.startsWith(t)) {
      const rest = trimmed.slice(t.length).trim();
      const matchedBody = BODY_TYPES.find((b) => b === rest);
      return { tonnage: t, bodytype: matchedBody || BODY_TYPES[0] };
    }
  }
  return { tonnage: VEHICLE_TYPES[0], bodytype: BODY_TYPES[0] };
}

const BASIC_FIELDS = [
  ["industry", "업종"],
  ["sub_industry", "세부업종"],
  ["main_items", "취급 품목"],
  ["metro_region", "광역권"],
  ["district", "시군구"],
  ["sub_district", "세부권역"],
  ["industrial_complex", "산업단지"],
  ["website", "웹사이트"],
  ["recommended_vehicle", "추천 차량"],
  ["expected_volume", "예상 운송수요"],
  ["biz_reg_no", "사업자등록번호"],
  ["franchise_operator", "프랜차이즈 본부"],
  ["company_scale", "규모구간"],
];

const SALES_REF_FIELDS = [
  ["priority", "우선순위"],
  ["lead_type", "화주유형"],
  ["sales_message", "영업 메시지 포인트"],
  ["sales_potential", "영업가능성"],
  ["sales_difficulty", "영업난이도"],
  ["cold_chain_risk", "냉장/냉동 리스크"],
  ["volume_potential", "운송수요 가능성"],
  ["total_score", "종합점수"],
  ["next_action", "다음액션"],
  ["data_source", "데이터출처"],
  ["verification_notes", "검증메모"],
];

const CRM_CONTACT_FIELDS = [
  ["contact_name", "담당자명"],
  ["contact_position", "직책"],
  ["contact_mobile", "휴대폰"],
  ["contact_email", "이메일"],
];

const CRM_BIZ_FIELDS = [
  ["payment_terms", "결제조건"],
  ["main_pickup_region", "주요 상차지역"],
  ["main_dropoff_region", "주요 하차지역"],
  ["assigned_staff", "담당직원"],
];

const CRM_PERFORMANCE_FIELDS: [string, string, string?][] = [
  ["total_orders_count", "누적 오더수", "number"],
  ["total_revenue", "누적 매출(원)", "number"],
  ["total_margin", "누적 마진(원)", "number"],
  ["outstanding_amount", "미수금(원)", "number"],
  ["last_order_date", "최근 오더일", "date"],
];

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  type Location = {
    id: string;
    location_name: string | null;
    address: string | null;
    location_type: string | null;
  };
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocType, setNewLocType] = useState("상차지");
  const [newLocAddress, setNewLocAddress] = useState("");
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editingLocValue, setEditingLocValue] = useState("");

  const [editForm, setEditForm] = useState<Record<string, any>>({
    status: "",
    grade: "",
    phone: "",
    address: "",
    contact_department: "",
    next_followup_date: "",
    notes: "",
    repeat_customer: false,
    manual_source_type: "",
    manual_source_note: "",
    recommended_vehicle_tonnage: VEHICLE_TYPES[0],
    recommended_vehicle_bodytype: BODY_TYPES[0],
  });

  const [portalAccounts, setPortalAccounts] = useState<any[]>([]);
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [issuingAccount, setIssuingAccount] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);

  function set(key: string, value: any) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

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
      const allKeys = [
        "status",
        "grade",
        "phone",
        "address",
        "contact_department",
        "next_followup_date",
        "notes",
        "repeat_customer",
        "manual_source_type",
        "manual_source_note",
        ...BASIC_FIELDS.map((f) => f[0]),
        ...SALES_REF_FIELDS.map((f) => f[0]),
        ...CRM_CONTACT_FIELDS.map((f) => f[0]),
        ...CRM_BIZ_FIELDS.map((f) => f[0]),
        ...CRM_PERFORMANCE_FIELDS.map((f) => f[0]),
      ];
      const initial: Record<string, any> = {};
      for (const k of allKeys) {
        initial[k] = data[k] ?? (k === "repeat_customer" ? false : "");
      }
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
      .select("id,auth_user_id,email,name,is_active,must_change_password,created_at")
      .eq("company_id", id)
      .order("created_at", { ascending: false });
    setPortalAccounts(data || []);
  }

  async function handleIssueAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccountEmail.trim()) {
      setPortalError("이메일을 입력해주세요.");
      return;
    }
    setIssuingAccount(true);
    setPortalError(null);
    setIssuedCredentials(null);
    try {
      const res = await fetch("/api/admin/create-portal-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: id,
          email: newAccountEmail.trim(),
          name: newAccountName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPortalError(data.error || "계정 발급에 실패했습니다.");
        return;
      }
      setIssuedCredentials({ email: data.email, password: data.password });
      setNewAccountEmail("");
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

  async function handleResetPassword(authUserId: string, email: string) {
    const confirmed = window.confirm(
      `"${email}" 계정의 비밀번호를 재설정하시겠습니까? 기존 비밀번호는 더 이상 쓸 수 없게 됩니다.`
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
        setPortalError(data.error || "비밀번호 재설정에 실패했습니다.");
        return;
      }
      setIssuedCredentials({ email, password: data.password });
      loadPortalAccounts();
    } catch {
      setPortalError("비밀번호 재설정 중 오류가 발생했습니다.");
    }
  }

  async function loadLocations() {
    const { data } = await supabase
      .from("customer_locations")
      .select("id,location_name,address,location_type")
      .eq("company_id", id);
    setLocations(data || []);
  }

  async function handleAddLocation() {
    if (!newLocAddress.trim()) return;
    const { error } = await supabase.from("customer_locations").insert({
      company_id: id,
      address: newLocAddress,
      location_type: newLocType,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setNewLocAddress("");
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
    const { error } = await supabase
      .from("customer_locations")
      .delete()
      .eq("id", locId);
    if (error) {
      setError(error.message);
      return;
    }
    loadLocations();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const uiOnlyKeys = ["recommended_vehicle_tonnage", "recommended_vehicle_bodytype"];
    const payload: Record<string, any> = {};
    for (const key of Object.keys(editForm)) {
      if (uiOnlyKeys.includes(key)) continue;
      let v = editForm[key];
      if (v === "") v = null;
      if (
        CRM_PERFORMANCE_FIELDS.some(
          (f) => f[0] === key && f[2] === "number"
        )
      ) {
        v = v === null ? null : Number(v);
      }
      payload[key] = v;
    }

    // 톤수 + 차량형태 선택값을 기존 컬럼 하나로 합쳐서 저장
    const tonnage = editForm.recommended_vehicle_tonnage;
    const bodytype = editForm.recommended_vehicle_bodytype;
    payload.recommended_vehicle = tonnage && bodytype ? `${tonnage} ${bodytype}` : null;

    // "기타"가 아니면 출처 설명은 비워서 저장 (다른 분류로 바꿨는데 이전 수기설명이 남지 않도록)
    if (payload.manual_source_type !== "기타") {
      payload.manual_source_note = null;
    }

    const { error } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(false);
    loadCompany();
  }

  async function handleDelete() {
    if (!company) return;
    setDeleting(true);
    setError(null);

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

    const confirmed = window.confirm(
      `"${company.name}" 업체를 정말 완전히 삭제하시겠습니까?\n` +
        `이 작업은 절대 되돌릴 수 없습니다 (백업이 없습니다). ` +
        `단순히 목록에서 빼고 싶다면 취소 후 영업상태를 "거래중단" 또는 "휴면화주"로 바꿔주세요.`
    );
    if (!confirmed) {
      setDeleting(false);
      return;
    }

    const { error } = await supabase.from("companies").delete().eq("id", id);
    setDeleting(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/admin/companies");
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
        <Link href="/admin/companies" className="btn btn-ghost">
          ← 목록으로
        </Link>
      </main>
    );
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/admin/companies"
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          ← 화주 관리 목록으로
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{company.name}</h1>
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
            </>
          ) : (
            <>
              <button className="btn" onClick={handleSave} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setEditing(false);
                  loadCompany();
                }}
              >
                취소
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {/* 영업 상태 */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        {editing ? (
          <div className="form-grid" style={{ padding: 0 }}>
            <div className="field">
              <label>영업상태</label>
              <select
                value={editForm.status}
                onChange={(e) => set("status", e.target.value)}
                style={{
                  fontWeight: 600,
                  background: getStatusColor(editForm.status).bg,
                  color: getStatusColor(editForm.status).text,
                }}
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
                value={editForm.grade}
                onChange={(e) => set("grade", e.target.value)}
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
              <label>대표번호</label>
              <input
                value={editForm.phone}
                onChange={(e) => set("phone", formatPhoneNumber(e.target.value))}
                placeholder="숫자만 입력하면 자동으로 - 표시"
              />
            </div>
            <div className="field">
              <label>담당부서</label>
              <input
                value={editForm.contact_department}
                onChange={(e) => set("contact_department", e.target.value)}
              />
            </div>
            <div className="field">
              <label>다음 연락 예정일</label>
              <input
                type="date"
                value={editForm.next_followup_date || ""}
                onChange={(e) => set("next_followup_date", e.target.value)}
              />
            </div>

            {/* 임포트된 DB 업체는 출처가 고정이라 이 항목을 숨기고, 직접등록 업체만 분류를 고를 수 있음 */}
            {!company.source_sheet && (
              <>
                <div className="field">
                  <label>출처 분류</label>
                  <select
                    value={editForm.manual_source_type}
                    onChange={(e) => set("manual_source_type", e.target.value)}
                  >
                    <option value="">미지정</option>
                    {MANUAL_SOURCE_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o === "기타" ? "기타 (수기작성)" : o}
                      </option>
                    ))}
                  </select>
                </div>
                {editForm.manual_source_type === "기타" && (
                  <div className="field">
                    <label>출처 설명</label>
                    <input
                      value={editForm.manual_source_note}
                      onChange={(e) => set("manual_source_note", e.target.value)}
                      placeholder="예: 지인 소개, 홈페이지 문의 등"
                    />
                  </div>
                )}
              </>
            )}

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>주소</label>
              <input
                value={editForm.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>메모</label>
              <textarea
                rows={3}
                value={editForm.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* 기본 정보 (수정 가능) */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          기본 정보
        </h3>
        <div
          className={editing ? "form-grid" : undefined}
          style={
            editing
              ? { padding: 0 }
              : {
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 4,
                }
          }
        >
          {BASIC_FIELDS.map(([key, label]) => {
            if (key === "recommended_vehicle" && editing) {
              return (
                <div className="field" key={key} style={{ minWidth: 0 }}>
                  <label>{label}</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select
                      value={editForm.recommended_vehicle_tonnage}
                      onChange={(e) =>
                        set("recommended_vehicle_tonnage", e.target.value)
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
                      value={editForm.recommended_vehicle_bodytype}
                      onChange={(e) =>
                        set("recommended_vehicle_bodytype", e.target.value)
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
              );
            }
            return (
              <EditableField
                key={key}
                label={label}
                value={editing ? editForm[key] : company[key]}
                editing={editing}
                onChange={(v) => set(key, v)}
              />
            );
          })}
        </div>
      </div>

      {/* 영업 참고 정보 (수정 가능) */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          영업 참고 정보
        </h3>
        <div
          className={editing ? "form-grid" : undefined}
          style={
            editing
              ? { padding: 0 }
              : {
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 4,
                }
          }
        >
          {SALES_REF_FIELDS.map(([key, label]) => (
            <EditableField
              key={key}
              label={label}
              value={editing ? editForm[key] : company[key]}
              editing={editing}
              onChange={(v) => set(key, v)}
            />
          ))}
        </div>
      </div>

      {/* CRM 상세정보: 담당자 */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          담당자 정보
        </h3>
        <div
          className={editing ? "form-grid" : undefined}
          style={
            editing
              ? { padding: 0 }
              : {
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 4,
                }
          }
        >
          {CRM_CONTACT_FIELDS.map(([key, label]) => {
            if (key === "contact_mobile" && editing) {
              return (
                <div className="field" key={key} style={{ minWidth: 0 }}>
                  <label>{label}</label>
                  <input
                    value={editForm.contact_mobile}
                    onChange={(e) =>
                      set("contact_mobile", formatPhoneNumber(e.target.value))
                    }
                    placeholder="숫자만 입력하면 자동으로 - 표시"
                  />
                </div>
              );
            }
            return (
              <EditableField
                key={key}
                label={label}
                value={editing ? editForm[key] : company[key]}
                editing={editing}
                onChange={(v) => set(key, v)}
              />
            );
          })}
        </div>
      </div>

      {/* CRM 상세정보: 거래조건 + 실적 */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          거래조건 · 실적
        </h3>
        <div
          className={editing ? "form-grid" : undefined}
          style={
            editing
              ? { padding: 0, marginBottom: 14 }
              : {
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 4,
                  marginBottom: 14,
                }
          }
        >
          {CRM_BIZ_FIELDS.map(([key, label]) => {
            if (
              (key === "main_pickup_region" || key === "main_dropoff_region") &&
              editing
            ) {
              return (
                <div
                  className="field"
                  key={key}
                  style={{ gridColumn: "1 / -1", minWidth: 0 }}
                >
                  <label>{label} (중복 선택 가능)</label>
                  <MultiSelectTags
                    options={REGIONS}
                    value={editForm[key] || ""}
                    onChange={(v) => set(key, v)}
                  />
                </div>
              );
            }
            return (
              <EditableField
                key={key}
                label={label}
                value={editing ? editForm[key] : company[key]}
                editing={editing}
                onChange={(v) => set(key, v)}
              />
            );
          })}
        </div>
        <div
          className={editing ? "form-grid" : undefined}
          style={
            editing
              ? { padding: 0 }
              : {
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 4,
                }
          }
        >
          {CRM_PERFORMANCE_FIELDS.map(([key, label, type]) => (
            <EditableField
              key={key}
              label={label}
              value={editing ? editForm[key] : company[key]}
              editing={editing}
              onChange={(v) => set(key, v)}
              type={type || "text"}
            />
          ))}
          {editing ? (
            <div className="field">
              <label>재거래 여부</label>
              <select
                value={editForm.repeat_customer ? "true" : "false"}
                onChange={(e) => set("repeat_customer", e.target.value === "true")}
              >
                <option value="false">아니오</option>
                <option value="true">예</option>
              </select>
            </div>
          ) : (
            <Field
              label="재거래 여부"
              value={company.repeat_customer ? "예" : null}
            />
          )}
        </div>
      </div>

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
                  </div>
                ))
              )}
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <select
            value={newLocType}
            onChange={(e) => setNewLocType(e.target.value)}
            style={{ width: 100, fontSize: 12.5 }}
          >
            <option value="상차지">상차지</option>
            <option value="하차지">하차지</option>
          </select>
          <input
            value={newLocAddress}
            onChange={(e) => setNewLocAddress(e.target.value)}
            placeholder="주소 직접 추가"
            style={{ flex: 1, fontSize: 12.5, padding: "5px 8px" }}
          />
          <button
            className="btn"
            type="button"
            style={{ padding: "5px 12px", fontSize: 12.5 }}
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
                    {acc.email}
                    {acc.name && (
                      <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                        {" "}
                        ({acc.name})
                      </span>
                    )}
                  </div>
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
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                    onClick={() => handleResetPassword(acc.auth_user_id, acc.email)}
                  >
                    비밀번호 재설정
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                    onClick={() => handleToggleAccountActive(acc.id, acc.is_active)}
                  >
                    {acc.is_active ? "비활성화" : "다시 활성화"}
                  </button>
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
            <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--accent)" }}>
              아래 로그인 정보를 화주에게 전달해주세요 (한 번만 표시됩니다)
            </div>
            <div>이메일: <span className="num">{issuedCredentials.email}</span></div>
            <div>임시 비밀번호: <span className="num">{issuedCredentials.password}</span></div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
              최초 로그인 시 비밀번호를 새로 설정하도록 되어 있습니다.
            </div>
          </div>
        )}

        {portalError && <div className="error-box">{portalError}</div>}

        <form onSubmit={handleIssueAccount} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="email"
            value={newAccountEmail}
            onChange={(e) => setNewAccountEmail(e.target.value)}
            placeholder="담당자 이메일"
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
    </main>
  );
}
