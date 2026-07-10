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

  const [editForm, setEditForm] = useState({
    status: "",
    grade: "",
    phone: "",
    address: "",
    contact_department: "",
    next_followup_date: "",
    notes: "",
  });

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
      setEditForm({
        status: data.status || "미접촉",
        grade: data.grade || "",
        phone: data.phone || "",
        address: data.address || "",
        contact_department: data.contact_department || "",
        next_followup_date: data.next_followup_date || "",
        notes: data.notes || "",
      });
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
    const { error } = await supabase
      .from("companies")
      .update({
        status: editForm.status,
        grade: editForm.grade || null,
        phone: editForm.phone || null,
        address: editForm.address || null,
        contact_department: editForm.contact_department || null,
        next_followup_date: editForm.next_followup_date || null,
        notes: editForm.notes || null,
      })
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

    // 이 업체와 연결된 실거래 기록(견적/운송오더/정산)이 있는지 먼저 확인합니다.
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
        `이 업체는 이미 견적/운송/정산 기록이 ${relatedCount}건 있어 삭제할 수 없습니다.\n` +
          `대신 영업상태를 "거래중단"으로 변경해주세요. (기록은 보존, 목록에서만 구분됩니다)`
      );
      return;
    }

    const confirmed = window.confirm(
      `"${company.name}" 업체를 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
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
                {deleting ? "확인 중..." : "삭제"}
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={handleSave} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setEditing(false)}
              >
                취소
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {/* 영업 상태 / 편집 영역 */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        {editing ? (
          <div className="form-grid" style={{ padding: 0 }}>
            <div className="field">
              <label>영업상태</label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
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
                onChange={(e) =>
                  setEditForm({ ...editForm, grade: e.target.value })
                }
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
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>담당부서</label>
              <input
                value={editForm.contact_department}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    contact_department: e.target.value,
                  })
                }
              />
            </div>
            <div className="field">
              <label>다음 연락 예정일</label>
              <input
                type="date"
                value={editForm.next_followup_date || ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    next_followup_date: e.target.value,
                  })
                }
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>주소</label>
              <input
                value={editForm.address}
                onChange={(e) =>
                  setEditForm({ ...editForm, address: e.target.value })
                }
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>메모</label>
              <textarea
                rows={3}
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
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

      {/* 기본 조사정보 */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          기본 정보
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 4,
          }}
        >
          <Field label="업종" value={company.industry} />
          <Field label="세부업종" value={company.sub_industry} />
          <Field label="취급 품목" value={company.main_items} />
          <Field label="광역권" value={company.metro_region} />
          <Field label="시군구" value={company.district} />
          <Field label="세부권역" value={company.sub_district} />
          <Field label="산업단지" value={company.industrial_complex} />
          <Field label="웹사이트" value={company.website} />
          <Field label="추천 차량" value={company.recommended_vehicle} />
          <Field label="예상 운송수요" value={company.expected_volume} />
          <Field label="냉장/냉동 필요" value={company.cold_chain_needed ? "예" : null} />
          <Field label="사업자등록번호" value={company.biz_reg_no} />
          <Field label="프랜차이즈 본부" value={company.franchise_operator} />
          <Field label="규모구간" value={company.company_scale} />
        </div>
      </div>

      {/* 영업 참고 정보 (엑셀 조사 데이터) */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          영업 참고 정보
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 4,
          }}
        >
          <Field label="우선순위" value={company.priority} />
          <Field label="화주유형" value={company.lead_type} />
          <Field label="영업 메시지 포인트" value={company.sales_message} />
          <Field label="영업가능성" value={company.sales_potential} />
          <Field label="영업난이도" value={company.sales_difficulty} />
          <Field label="냉장/냉동 리스크" value={company.cold_chain_risk} />
          <Field label="운송수요 가능성" value={company.volume_potential} />
          <Field label="종합점수" value={company.total_score} />
          <Field label="다음액션" value={company.next_action} />
          <Field label="데이터출처" value={company.data_source} />
          <Field label="검증메모" value={company.verification_notes} />
        </div>
        {company.notes && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              메모
            </div>
            <div
              style={{
                fontSize: 13.5,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {company.notes}
            </div>
          </div>
        )}
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
                      {type === "상차지" ? "주소" : "주소"}
                      {i + 1}
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
          다음 단계(견적/배차/정산 화면 제작)에서 이 업체와 연결된 통화기록,
          견적서, 거래내역이 이 자리에 표시됩니다.
        </p>
      </div>
    </main>
  );
}
