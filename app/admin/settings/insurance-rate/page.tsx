"use client";

import { useEffect, useState } from "react";
import { getCurrentStaffRole } from "@/lib/currentStaff";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import ProcessedByFooter from "@/components/ProcessedByFooter";
import {
  getLatestInsuranceRateSettings,
  DEFAULT_INSURANCE_RATE_SETTINGS,
  type InsuranceRateSettingsRow,
} from "@/lib/insuranceRateSettings";

export default function InsuranceRateSettingsPage() {
  const [row, setRow] = useState<InsuranceRateSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [expenseDeductionRate, setExpenseDeductionRate] = useState(
    String(DEFAULT_INSURANCE_RATE_SETTINGS.expense_deduction_rate)
  );
  const [insuranceRateTotal, setInsuranceRateTotal] = useState(
    String(DEFAULT_INSURANCE_RATE_SETTINGS.insurance_rate_total)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const data = await getLatestInsuranceRateSettings();
    if (!data) {
      setError("설정값을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }
    setRow(data);
    setExpenseDeductionRate(String(data.expense_deduction_rate));
    setInsuranceRateTotal(String(data.insurance_rate_total));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    setSaving(true);
    setActionError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/insurance-rate-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          expense_deduction_rate: Number(expenseDeductionRate),
          insurance_rate_total: Number(insuranceRateTotal),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "저장에 실패했습니다.");
        setSaving(false);
        return;
      }
      setSaved(true);
      await load();
    } catch {
      setActionError("저장 중 오류가 발생했습니다.");
    }
    setSaving(false);
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">산재보험료 요율 설정</h1>
          <p className="page-desc">
            배차 상세의 "차주 운임 상세 계산"에서 산재보험료를 계산할 때 쓰이는 필요경비공제율/
            산재보험료율입니다. 고용노동부가 매년 재고시하는 값이라 필요할 때마다 관리자가 직접
            수정할 수 있게 되어 있습니다. 저장 즉시 이후의 모든 계산에 반영되며, 이미 저장된 과거
            배차 건의 값은 바뀌지 않습니다.
          </p>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}
      {actionError && <div className="error-box">{actionError}</div>}

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : row ? (
        <div className="card" style={{ padding: 20, maxWidth: 420 }}>
          <form onSubmit={handleSave} onKeyDown={handleFormKeyDown} className="form-grid" style={{ padding: 0 }}>
            <div className="field">
              <label>필요경비공제율(%)</label>
              <input
                type="number"
                step={0.1}
                value={expenseDeductionRate}
                onChange={(e) => setExpenseDeductionRate(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <div className="field">
              <label>산재보험료율 총계(%)</label>
              <input
                type="number"
                step={0.01}
                value={insuranceRateTotal}
                onChange={(e) => setInsuranceRateTotal(e.target.value)}
                disabled={!isAdmin}
              />
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
                차주부담분·주선사부담분은 이 값의 절반씩(현재 설정 기준 {(Number(insuranceRateTotal) / 2 || 0).toFixed(2)}%씩)입니다.
              </p>
            </div>

            {isAdmin ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? "저장 중..." : "저장"}
                </button>
                {saved && (
                  <span style={{ marginLeft: 10, fontSize: 12.5, color: "var(--accent)" }}>저장되었습니다.</span>
                )}
              </div>
            ) : (
              <p style={{ gridColumn: "1 / -1", fontSize: 12.5, color: "var(--text-muted)" }}>
                조회만 가능합니다. 수정은 관리자만 할 수 있습니다.
              </p>
            )}
          </form>

          <ProcessedByFooter updatedBy={row.updated_by} updatedAt={row.updated_at} />
        </div>
      ) : (
        <div className="empty-state">설정값이 없습니다.</div>
      )}
    </main>
  );
}
