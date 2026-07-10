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
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5 }}>{String(value)}</div>
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
    if (id) loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
            <button className="btn" onClick={() => setEditing(true)}>
              정보 수정
            </button>
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
            <div style={{ marginBottom: 10 }}>
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
            <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>
              {company.notes}
            </div>
          </div>
        )}
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
