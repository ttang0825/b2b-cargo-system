"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentStaffRole } from "@/lib/currentStaff";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import ProcessedByFooter from "@/components/ProcessedByFooter";
import {
  getLatestInsuranceRateSettings,
  DEFAULT_INSURANCE_RATE_SETTINGS,
  type InsuranceRateSettingsRow,
} from "@/lib/insuranceRateSettings";
import {
  getLatestMixedLoadingDiscountSettings,
  DEFAULT_MIXED_LOADING_DISCOUNT_SETTINGS,
  type MixedLoadingDiscountSettingsRow,
} from "@/lib/mixedLoadingDiscountSettings";
import { VEHICLE_TYPES_ALL } from "@/lib/constants";
import {
  PUBLISHED_START_PRICE_TONS,
  START_PRICE_DISTANCE_LABEL,
} from "@/lib/startPrices";

const RATE_TABS = [
  { key: "base", label: "기본운임" },
  { key: "surcharge", label: "가산기준" },
  { key: "insurance", label: "산재보험료 요율" },
] as const;
type RateTabKey = (typeof RATE_TABS)[number]["key"];

type Tier = {
  id: string;
  distance_label: string;
  vehicle_type: string;
  base_fare: number;
  distance_from_km: number;
};

type Surcharge = {
  id: string;
  category: string;
  option_name: string;
  rate_pct: number;
  flat_amount: number;
};

type ExtraFee = {
  id: string;
  vehicle_type: string;
  free_waiting_minutes: number;
  waiting_fee_per_unit: number | null;
  waypoint_fee: number | null;
};

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

// 클릭하면 바로 그 자리에서 숫자를 고칠 수 있는 셀
function EditableNumber({
  value,
  onSave,
  suffix = "원",
  readOnly = false,
}: {
  value: number | null;
  onSave: (v: number) => void;
  suffix?: string;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(String(value ?? ""));
  const step = suffix === "원" ? 1000 : 1;

  if (readOnly) {
    return <span>{value ? value.toLocaleString("ko-KR") + suffix : "-"}</span>;
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step={step}
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const num = Number(temp) || 0;
          if (num !== value) onSave(num);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setTemp(String(value ?? ""));
            setEditing(false);
          }
        }}
        style={{
          width: 90,
          padding: "3px 6px",
          fontSize: 12.5,
          border: "1px solid var(--accent)",
          borderRadius: 4,
        }}
      />
    );
  }

  return (
    <span
      onClick={() => {
        setTemp(String(value ?? ""));
        setEditing(true);
      }}
      style={{ cursor: "pointer" }}
      title="클릭해서 수정"
    >
      {value ? value.toLocaleString("ko-KR") + suffix : "-"}
    </span>
  );
}

// 산재보험료 요율 탭 — 예전엔 /admin/settings/insurance-rate 독립 경로였으나,
// 운임기준표 화면이 "이 사업의 모든 요율/기준값을 모아두는 화면"이라는 성격에
// 맞춰 이 탭 안으로 이동함(3차 세션 보정)
function InsuranceRateTab({ isAdmin }: { isAdmin: boolean }) {
  const [row, setRow] = useState<InsuranceRateSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [expenseDeductionRate, setExpenseDeductionRate] = useState(
    String(DEFAULT_INSURANCE_RATE_SETTINGS.expense_deduction_rate)
  );
  const [insuranceRateTotal, setInsuranceRateTotal] = useState(
    String(DEFAULT_INSURANCE_RATE_SETTINGS.insurance_rate_total)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  if (loading) {
    return <div className="empty-state">불러오는 중...</div>;
  }

  return (
    <>
      <p className="page-desc" style={{ marginBottom: 16 }}>
        배차 상세의 "차주 운임 상세 계산"에서 산재보험료를 계산할 때 쓰이는 필요경비공제율/
        산재보험료율입니다. 고용노동부가 매년 재고시하는 값이라 필요할 때마다 관리자가 직접
        수정할 수 있게 되어 있습니다. 저장 즉시 이후의 모든 계산에 반영되며, 이미 저장된 과거
        배차 건의 값은 바뀌지 않습니다.
      </p>

      {error && <div className="error-box">오류: {error}</div>}
      {actionError && <div className="error-box">{actionError}</div>}

      {row ? (
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
    </>
  );
}

// 표준 혼적 할인율(%) — 가산기준 탭 안의 소섹션. 혼적 할인 중 율(%) 방식에만
// 쓰는 회사 자체 기본값으로, 견적에서 "혼적가능"+"할인유형: 율"을 선택하면
// 이 값이 입력창 기본값으로 채워짐(담당자가 건별 수정 가능). 금액(정액)
// 방식은 표준값 없이 계속 수동 입력만 지원(4차 세션 결정사항).
function MixedLoadingDiscountCard({ isAdmin }: { isAdmin: boolean }) {
  const [row, setRow] = useState<MixedLoadingDiscountSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(
    String(DEFAULT_MIXED_LOADING_DISCOUNT_SETTINGS.standard_discount_percent)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const data = await getLatestMixedLoadingDiscountSettings();
    if (!data) {
      setError("설정값을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }
    setRow(data);
    setDiscountPercent(String(data.standard_discount_percent));
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
      const res = await fetch("/api/admin/mixed-loading-discount-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, standard_discount_percent: Number(discountPercent) }),
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

  if (loading) return <div className="empty-state">불러오는 중...</div>;

  return (
    <div className="card" style={{ padding: 16, marginBottom: 24, maxWidth: 380 }}>
      <h3 style={{ fontSize: 13.5, marginTop: 0, marginBottom: 10 }}>표준 혼적 할인율</h3>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0, marginBottom: 12 }}>
        견적에서 "혼적가능" + 할인유형을 "율(%)"로 선택하면 이 값이 기본값으로 채워집니다
        (건별로 수정 가능). 금액(정액) 할인은 표준값 없이 항상 직접 입력합니다.
      </p>
      {error && <div className="error-box">오류: {error}</div>}
      {actionError && <div className="error-box">{actionError}</div>}
      {row && (
        <>
          <form onSubmit={handleSave} onKeyDown={handleFormKeyDown} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div className="field" style={{ marginBottom: 0, maxWidth: 140 }}>
              <label>표준 할인율(%)</label>
              <input
                type="number"
                step={0.1}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            {isAdmin && (
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
            )}
          </form>
          {saved && (
            <span style={{ display: "block", marginTop: 8, fontSize: 12.5, color: "var(--accent)" }}>
              저장되었습니다.
            </span>
          )}
          {!isAdmin && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
              조회만 가능합니다. 수정은 관리자만 할 수 있습니다.
            </p>
          )}
          <ProcessedByFooter updatedBy={row.updated_by} updatedAt={row.updated_at} />
        </>
      )}
    </div>
  );
}

export default function RatesPage() {
  const [activeTab, setActiveTab] = useState<RateTabKey>("base");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingScale, setPendingScale] = useState<{
    vehicleType: string;
    ratio: number;
    excludeId: string;
  } | null>(null);

  // 🔴 게시되는 칸(「10km 이내」 × 게시 차급)을 고칠 때만 뜨는 확인 창.
  // 64차가 기준가를 DB 실시간 연동으로 바꿔서, 이 칸은 **저장하는 순간 랜딩과 /vehicles
  // 에 그대로 게시된다.** 이 화면은 클릭이 곧 저장이고 되돌리기가 없어서 오타 하나가
  // 그대로 공개된다 — 45차 (6)이 「자동 연동을 하려면 저장 전 확인 단계를 같이 넣으라」고
  // 적어둔 것이 이것이다.
  const [pendingPublish, setPendingPublish] = useState<{
    id: string;
    vehicleType: string;
    oldValue: number;
    newValue: number;
  } | null>(null);

  async function load() {
    setLoading(true);
    const [t, s, e] = await Promise.all([
      supabase
        .from("rate_distance_tiers")
        .select("id,distance_label,vehicle_type,base_fare,distance_from_km")
        .order("distance_from_km"),
      supabase
        .from("rate_surcharges")
        .select("id,category,option_name,rate_pct,flat_amount")
        .order("category"),
      supabase.from("rate_vehicle_extra_fees").select("*"),
    ]);
    if (t.error) setError(t.error.message);
    setTiers((t.data as Tier[]) || []);
    setSurcharges((s.data as Surcharge[]) || []);
    setExtraFees((e.data as ExtraFee[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
  }, []);

  async function postRates(payload: Record<string, any>): Promise<string | null> {
    const res = await fetch("/api/admin/rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error || "저장에 실패했습니다.";
    }
    return null;
  }

  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  /** 이 칸이 공개 화면에 그대로 게시되는가 —
   *  🔴 판단 기준을 여기에 다시 적지 말 것. `lib/startPrices.ts` 가 유일 정의처이고,
   *     게시 차급이 늘면 이 확인 창도 저절로 따라온다. */
  function isPublishedCell(id: string) {
    const tier = tiers.find((t) => t.id === id);
    if (!tier) return false;
    return (
      tier.distance_label === START_PRICE_DISTANCE_LABEL &&
      (PUBLISHED_START_PRICE_TONS as readonly string[]).includes(tier.vehicle_type)
    );
  }

  async function updateTierFare(id: string, base_fare: number) {
    // 🔴 게시되는 칸은 곧바로 저장하지 않고 확인을 한 번 받는다.
    //    🔴 **전 구간에 걸지 말 것** — 담당자가 매번 눌러야 해서 실무가 막힌다.
    //    취소하면 `tiers` 를 안 건드렸으니 화면에 옛 값이 그대로 남는다(별도 복원 불필요).
    if (isPublishedCell(id)) {
      const tier = tiers.find((t) => t.id === id);
      if (tier && (tier.base_fare ?? 0) !== base_fare) {
        setPendingPublish({
          id,
          vehicleType: tier.vehicle_type,
          oldValue: tier.base_fare ?? 0,
          newValue: base_fare,
        });
        return;
      }
    }
    await commitTierFare(id, base_fare);
  }

  async function commitTierFare(id: string, base_fare: number) {
    const oldTier = tiers.find((t) => t.id === id);
    const oldValue = oldTier?.base_fare ?? 0;

    const errMsg = await postRates({ action: "update_tier", id, base_fare });
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, base_fare } : t))
    );
    flashSaved();

    // 비율이 바뀌었다면, 다른 구간에도 같은 비율로 적용할지 물어봅니다.
    if (oldTier && oldValue > 0 && base_fare !== oldValue) {
      const ratio = base_fare / oldValue;
      setPendingScale({
        vehicleType: oldTier.vehicle_type,
        ratio,
        excludeId: id,
      });
    }
  }

  async function applyScale(scope: "vehicle" | "all") {
    if (!pendingScale) return;
    const { vehicleType, ratio, excludeId } = pendingScale;
    const targets = tiers.filter((t) => {
      if (t.id === excludeId) return false;
      if (scope === "vehicle") return t.vehicle_type === vehicleType;
      return true;
    });

    const updates = targets.map((t) => ({
      id: t.id,
      base_fare: Math.round((t.base_fare * ratio) / 100) * 100,
    }));

    const errMsg = await postRates({ action: "update_tier_scale", updates });
    if (errMsg) {
      setError(errMsg);
      setPendingScale(null);
      return;
    }

    setTiers((prev) =>
      prev.map((t) => {
        const found = updates.find((u) => u.id === t.id);
        return found ? { ...t, base_fare: found.base_fare } : t;
      })
    );
    setPendingScale(null);
    flashSaved();
  }

  async function updateSurcharge(
    id: string,
    field: "rate_pct" | "flat_amount",
    value: number
  ) {
    const dbValue = field === "rate_pct" ? value / 100 : value;
    const errMsg = await postRates({ action: "update_surcharge", id, field, value: dbValue });
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setSurcharges((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: dbValue } : s))
    );
    flashSaved();
  }

  async function updateExtraFee(
    id: string,
    field: "waiting_fee_per_unit" | "waypoint_fee" | "free_waiting_minutes",
    value: number
  ) {
    const errMsg = await postRates({ action: "update_extra_fee", id, field, value });
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setExtraFees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
    flashSaved();
  }

  const labelOrder: string[] = [];
  const matrix: Record<string, Record<string, Tier>> = {};
  for (const t of tiers) {
    if (!matrix[t.distance_label]) {
      matrix[t.distance_label] = {};
      labelOrder.push(t.distance_label);
    }
    matrix[t.distance_label][t.vehicle_type] = t;
  }

  // "긴급여부"(폐지)와 "특별할인"(16차에 첫거래지원 할인을 걷어냄)은 항목 자체가 없어졌다.
  // 기존 데이터는 남겨두되(참조가 있을 수 있어 완전삭제는 안 함, 원칙 32번과 같은 취지)
  // 화면에서만 숨긴다.
  const HIDDEN_CATEGORIES = ["긴급여부", "특별할인"];
  const categories = Array.from(new Set(surcharges.map((s) => s.category))).filter(
    (c) => !HIDDEN_CATEGORIES.includes(c)
  );

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">운임기준표</h1>
          <p className="page-desc">
            {isAdmin
              ? "숫자를 클릭하면 바로 수정할 수 있습니다. (부가세 별도)"
              : "조회 전용 화면입니다. 수정은 관리자만 가능합니다. (부가세 별도)"}
          </p>
        </div>
        {savedFlash && (
          <span
            style={{
              fontSize: 12.5,
              color: "var(--accent)",
              fontWeight: 600,
            }}
          >
            ✓ 저장됨
          </span>
        )}
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {RATE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? "btn" : "btn btn-ghost"}
            style={{ fontSize: 12.5, padding: "7px 12px" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 🔴 게시되는 칸(「10km 이내」 × 게시 차급) 저장 전 확인.
          바뀌기 전 값 → 바뀐 값을 나란히 보여준다 — 오타는 「자릿수가 다르다」로
          알아채는 것이라 두 값이 같이 보여야 한다. */}
      {pendingPublish && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          <div
            className="card"
            style={{ padding: 24, maxWidth: 420, background: "var(--surface)" }}
          >
            <h3 style={{ fontSize: 15, marginTop: 0, marginBottom: 8 }}>
              이 값이 랜딩과 차량안내에 바로 게시됩니다
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 14,
                lineHeight: 1.7,
              }}
            >
              {START_PRICE_DISTANCE_LABEL} 기준가는 공개 화면이 실시간으로 읽어 갑니다.
              저장하면 되돌릴 수 없으니 금액을 한 번 더 확인해 주세요.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: "var(--radius)",
                background: "var(--bg)",
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontSize: 13.5 }}>
                {pendingPublish.vehicleType} · {START_PRICE_DISTANCE_LABEL}
              </strong>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {pendingPublish.oldValue.toLocaleString("ko-KR")}원
              </span>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>→</span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                {pendingPublish.newValue.toLocaleString("ko-KR")}원
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={() => {
                  const next = pendingPublish;
                  setPendingPublish(null);
                  if (next) void commitTierFare(next.id, next.newValue);
                }}
              >
                게시하기
              </button>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setPendingPublish(null)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingScale && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            className="card"
            style={{ padding: 24, maxWidth: 380, background: "var(--surface)" }}
          >
            <h3 style={{ fontSize: 15, marginTop: 0, marginBottom: 8 }}>
              다른 구간에도 같은 비율을 적용할까요?
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
              방금 변경한 비율은{" "}
              <strong>
                {pendingScale.ratio > 1 ? "+" : ""}
                {((pendingScale.ratio - 1) * 100).toFixed(1)}%
              </strong>
              입니다. 100원 단위로 반올림해서 적용됩니다.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                className="btn"
                onClick={() => applyScale("vehicle")}
                style={{ width: "100%" }}
              >
                "{pendingScale.vehicleType}" 전체 거리구간에 적용
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => applyScale("all")}
                style={{ width: "100%" }}
              >
                전체 테이블(모든 톤수)에 적용
              </button>
              <button
                className="btn-ghost"
                onClick={() => setPendingScale(null)}
                style={{
                  width: "100%",
                  padding: "9px 16px",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  fontSize: 13.5,
                }}
              >
                아니오, 이 칸만 적용
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "base" &&
        (tiers.length === 0 ? (
          <div className="error-box">
            아직 등록된 운임기준이 없습니다. Supabase에 CSV 임포트가 필요합니다.
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 24, overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>거리구간</th>
                  {VEHICLE_TYPES_ALL.map((v) => (
                    <th key={v}>{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {labelOrder.map((label) => (
                  <tr key={label}>
                    <td style={{ fontWeight: 600 }}>{label}</td>
                    {VEHICLE_TYPES_ALL.map((v) => {
                      const cell = matrix[label]?.[v];
                      return (
                        <td key={v}>
                          {cell ? (
                            <EditableNumber
                              value={cell.base_fare}
                              onSave={(val) => updateTierFare(cell.id, val)}
                              readOnly={!isAdmin}
                            />
                          ) : (
                            "-"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {activeTab === "surcharge" && (
        <>
          <MixedLoadingDiscountCard isAdmin={isAdmin} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {categories.map((cat) => (
              <div key={cat} className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 13.5, marginTop: 0, marginBottom: 10 }}>
                  {cat}
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th style={{ padding: "4px" }}>옵션</th>
                      <th style={{ padding: "4px" }}>요율%</th>
                      <th style={{ padding: "4px" }}>고정가산</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surcharges
                      .filter((s) => s.category === cat)
                      .map((s) => (
                        <tr key={s.id}>
                          <td style={{ padding: "6px 4px" }}>
                            {s.option_name}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            <EditableNumber
                              value={Math.round(s.rate_pct * 100)}
                              onSave={(v) => updateSurcharge(s.id, "rate_pct", v)}
                              suffix="%"
                              readOnly={!isAdmin}
                            />
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            <EditableNumber
                              value={s.flat_amount}
                              onSave={(v) =>
                                updateSurcharge(s.id, "flat_amount", v)
                              }
                              readOnly={!isAdmin}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>톤수</th>
                  <th>무료 대기시간(분)</th>
                  <th>초과 시 (30분당)</th>
                  <th>경유지 1곳당</th>
                </tr>
              </thead>
              <tbody>
                {extraFees.map((e) => (
                  <tr key={e.id}>
                    <td>{e.vehicle_type}</td>
                    <td>
                      <EditableNumber
                        value={e.free_waiting_minutes}
                        onSave={(v) =>
                          updateExtraFee(e.id, "free_waiting_minutes", v)
                        }
                        suffix="분"
                        readOnly={!isAdmin}
                      />
                    </td>
                    <td>
                      <EditableNumber
                        value={e.waiting_fee_per_unit}
                        onSave={(v) =>
                          updateExtraFee(e.id, "waiting_fee_per_unit", v)
                        }
                        readOnly={!isAdmin}
                      />
                    </td>
                    <td>
                      <EditableNumber
                        value={e.waypoint_fee}
                        onSave={(v) => updateExtraFee(e.id, "waypoint_fee", v)}
                        readOnly={!isAdmin}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "insurance" && <InsuranceRateTab isAdmin={isAdmin} />}
    </main>
  );
}
