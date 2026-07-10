"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { STATUS_OPTIONS, getStatusColor } from "@/lib/statusColors";

const GRADE_OPTIONS = ["S", "A", "B", "C", "D", "휴면"];

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
  });

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
      setEditForm(initial);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (id) {
      loadCompany();
      loadLocations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

    const payload: Record<string, any> = {};
    for (const key of Object.keys(editForm)) {
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
          <p className="page-desc">
            <span className="badge">{company.source_sheet || "직접등록"}</span>
            {"  "}
            {company.industry || "업종 미확인"}
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
                onChange={(e) => set("phone", e.target.value)}
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
          {BASIC_FIELDS.map(([key, label]) => (
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
          {CRM_CONTACT_FIELDS.map(([key, label]) => (
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
          {CRM_BIZ_FIELDS.map(([key, label]) => (
            <EditableField
              key={key}
              label={label}
              value={editing ? editForm[key] : company[key]}
              editing={editing}
              onChange={(v) => set(key, v)}
            />
          ))}
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
