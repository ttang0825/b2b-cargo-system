"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const VEHICLES = ["1톤", "1.4톤", "2.5톤", "3.5톤", "5톤", "5톤 플러스/축"];

type Tier = {
  distance_label: string;
  vehicle_type: string;
  base_fare: number;
  notes: string | null;
};

type Surcharge = {
  category: string;
  option_name: string;
  rate_pct: number;
  flat_amount: number;
};

type ExtraFee = {
  vehicle_type: string;
  free_waiting_minutes: number;
  waiting_fee_per_unit: number | null;
  waypoint_fee: number | null;
};

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

export default function RatesPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [t, s, e] = await Promise.all([
        supabase
          .from("rate_distance_tiers")
          .select("distance_label,vehicle_type,base_fare,notes,distance_from_km")
          .order("distance_from_km"),
        supabase
          .from("rate_surcharges")
          .select("category,option_name,rate_pct,flat_amount")
          .order("category"),
        supabase.from("rate_vehicle_extra_fees").select("*"),
      ]);
      if (t.error) setError(t.error.message);
      setTiers((t.data as Tier[]) || []);
      setSurcharges((s.data as Surcharge[]) || []);
      setExtraFees((e.data as ExtraFee[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const labelOrder: string[] = [];
  const matrix: Record<string, Record<string, number>> = {};
  for (const t of tiers) {
    if (!matrix[t.distance_label]) {
      matrix[t.distance_label] = {};
      labelOrder.push(t.distance_label);
    }
    matrix[t.distance_label][t.vehicle_type] = t.base_fare;
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
            거리구간 × 차량톤수별 기본운임과 가산기준입니다. 견적 화면에서
            이 기준으로 자동 계산됩니다. (부가세 별도)
          </p>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

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
                    {VEHICLES.map((v) => (
                      <td key={v}>{won(matrix[label]?.[v] ?? null)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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
                  <tbody>
                    {surcharges
                      .filter((s) => s.category === cat)
                      .map((s) => (
                        <tr key={s.option_name}>
                          <td style={{ padding: "6px 4px" }}>
                            {s.option_name}
                          </td>
                          <td style={{ padding: "6px 4px", textAlign: "right" }}>
                            {s.rate_pct
                              ? `${(s.rate_pct * 100).toFixed(0)}%`
                              : ""}
                            {s.rate_pct && s.flat_amount ? " + " : ""}
                            {s.flat_amount ? won(s.flat_amount) : ""}
                            {!s.rate_pct && !s.flat_amount ? "-" : ""}
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
                  <th>무료 대기시간</th>
                  <th>초과 시 (30분당)</th>
                  <th>경유지 1곳당</th>
                </tr>
              </thead>
              <tbody>
                {extraFees.map((e) => (
                  <tr key={e.vehicle_type}>
                    <td>{e.vehicle_type}</td>
                    <td>{e.free_waiting_minutes}분</td>
                    <td>{won(e.waiting_fee_per_unit)}</td>
                    <td>{won(e.waypoint_fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 16 }}>
            값 수정이 필요하면 Supabase Table Editor에서 rate_distance_tiers /
            rate_surcharges / rate_vehicle_extra_fees 테이블을 직접
            수정하시면 됩니다. (편집 화면은 다음 단계에서 추가 예정)
          </p>
        </>
      )}
    </main>
  );
}
