"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Company = {
  id: string;
  name: string;
  industry: string | null;
  region: string | null;
  phone: string | null;
  status: string;
  grade: string | null;
  next_followup_date: string | null;
  created_at: string;
};

const STATUS_OPTIONS = [
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
  "휴면화주",
  "거래중단",
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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
        "id,name,industry,region,phone,status,grade,next_followup_date,created_at"
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
        ) : companies.length === 0 ? (
          <div className="empty-state">
            등록된 업체가 없습니다. 우측 상단에서 신규 업체를 등록해보세요.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>회사명</th>
                <th>업종</th>
                <th>지역</th>
                <th>대표번호</th>
                <th>영업상태</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.industry || "-"}</td>
                  <td>{c.region || "-"}</td>
                  <td>{c.phone || "-"}</td>
                  <td>
                    <select
                      value={c.status}
                      onChange={(e) =>
                        handleStatusChange(c.id, e.target.value)
                      }
                      style={{
                        fontSize: "12px",
                        padding: "4px 6px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
