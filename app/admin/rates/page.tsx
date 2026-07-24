"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentStaffRole } from "@/lib/currentStaff";

const VEHICLES = ["1톤", "1.4톤", "2.5톤", "3.5톤", "5톤", "5톤 플러스/축"];

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

export default function RatesPage() {
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

  async function updateTierFare(id: string, base_fare: number) {
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

  const categories = Array.from(new Set(surcharges.map((s) => s.category)));

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

      {tiers.length === 0 ? (
        <div className="error-box">
          아직 등록된 운임기준이 없습니다. Supabase에 CSV 임포트가 필요합니다.
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 24, overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>거리구간</th>
                  {VEHICLES.map((v) => (
                    <th key={v}>{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {labelOrder.map((label) => (
                  <tr key={label}>
                    <td style={{ fontWeight: 600 }}>{label}</td>
                    {VEHICLES.map((v) => {
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
    </main>
  );
}
