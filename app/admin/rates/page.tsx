"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Rate = {
  id: string;
  vehicle_type: string;
  base_fare: number;
  per_km_rate: number;
  waiting_fee_per_unit: number;
  night_surcharge_pct: number;
  weekend_surcharge_pct: number;
  cold_surcharge_pct: number;
  forklift_fee: number;
  manual_load_fee: number;
  notes: string | null;
};

const EMPTY_FORM = {
  vehicle_type: "",
  base_fare: "",
  per_km_rate: "",
  waiting_fee_per_unit: "",
  night_surcharge_pct: "",
  weekend_surcharge_pct: "",
  cold_surcharge_pct: "",
  forklift_fee: "",
  manual_load_fee: "",
  notes: "",
};

function won(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

export default function RatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadRates() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("rates")
      .select("*")
      .order("vehicle_type", { ascending: true });
    if (error) setError(error.message);
    else setRates(data as Rate[]);
    setLoading(false);
  }

  useEffect(() => {
    loadRates();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicle_type.trim() || !form.base_fare) {
      setError("차량종류와 기본운임은 필수입니다.");
      return;
    }
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("rates").insert({
      vehicle_type: form.vehicle_type,
      base_fare: Number(form.base_fare) || 0,
      per_km_rate: Number(form.per_km_rate) || 0,
      waiting_fee_per_unit: Number(form.waiting_fee_per_unit) || 0,
      night_surcharge_pct: Number(form.night_surcharge_pct) || 0,
      weekend_surcharge_pct: Number(form.weekend_surcharge_pct) || 0,
      cold_surcharge_pct: Number(form.cold_surcharge_pct) || 0,
      forklift_fee: Number(form.forklift_fee) || 0,
      manual_load_fee: Number(form.manual_load_fee) || 0,
      notes: form.notes || null,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    loadRates();
  }

  async function handleDelete(id: string, vehicleType: string) {
    const confirmed = window.confirm(
      `"${vehicleType}" 운임기준을 삭제하시겠습니까?`
    );
    if (!confirmed) return;
    const { error } = await supabase.from("rates").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    loadRates();
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">운임기준표</h1>
          <p className="page-desc">
            차량 종류별 기본운임과 할증 기준을 등록합니다. 여기 등록된
            기준으로 견적 화면에서 자동 계산됩니다.
          </p>
        </div>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "닫기" : "+ 운임기준 추가"}
        </button>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>차량종류 *</label>
                <input
                  value={form.vehicle_type}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_type: e.target.value })
                  }
                  placeholder="예: 1톤 탑차"
                />
              </div>
              <div className="field">
                <label>기본운임(원) *</label>
                <input
                  type="number"
                  value={form.base_fare}
                  onChange={(e) =>
                    setForm({ ...form, base_fare: e.target.value })
                  }
                  placeholder="80000"
                />
              </div>
              <div className="field">
                <label>km당 추가운임(원)</label>
                <input
                  type="number"
                  value={form.per_km_rate}
                  onChange={(e) =>
                    setForm({ ...form, per_km_rate: e.target.value })
                  }
                  placeholder="1000"
                />
              </div>
              <div className="field">
                <label>대기료(단위당, 원)</label>
                <input
                  type="number"
                  value={form.waiting_fee_per_unit}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      waiting_fee_per_unit: e.target.value,
                    })
                  }
                  placeholder="10000 (30분당 등)"
                />
              </div>
              <div className="field">
                <label>야간할증(%)</label>
                <input
                  type="number"
                  value={form.night_surcharge_pct}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      night_surcharge_pct: e.target.value,
                    })
                  }
                  placeholder="20"
                />
              </div>
              <div className="field">
                <label>주말할증(%)</label>
                <input
                  type="number"
                  value={form.weekend_surcharge_pct}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      weekend_surcharge_pct: e.target.value,
                    })
                  }
                  placeholder="15"
                />
              </div>
              <div className="field">
                <label>냉장/냉동할증(%)</label>
                <input
                  type="number"
                  value={form.cold_surcharge_pct}
                  onChange={(e) =>
                    setForm({ ...form, cold_surcharge_pct: e.target.value })
                  }
                  placeholder="10"
                />
              </div>
              <div className="field">
                <label>지게차 상하차비(원)</label>
                <input
                  type="number"
                  value={form.forklift_fee}
                  onChange={(e) =>
                    setForm({ ...form, forklift_fee: e.target.value })
                  }
                  placeholder="20000"
                />
              </div>
              <div className="field">
                <label>수작업 상하차비(원)</label>
                <input
                  type="number"
                  value={form.manual_load_fee}
                  onChange={(e) =>
                    setForm({ ...form, manual_load_fee: e.target.value })
                  }
                  placeholder="30000"
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>비고</label>
                <input
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
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
        ) : rates.length === 0 ? (
          <div className="empty-state">
            등록된 운임기준이 없습니다. 먼저 차량별 운임기준을 추가해주세요.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>차량종류</th>
                <th>기본운임</th>
                <th>km당</th>
                <th>대기료</th>
                <th>야간%</th>
                <th>주말%</th>
                <th>냉장%</th>
                <th>지게차비</th>
                <th>수작업비</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id}>
                  <td>{r.vehicle_type}</td>
                  <td>{won(r.base_fare)}</td>
                  <td>{won(r.per_km_rate)}</td>
                  <td>{won(r.waiting_fee_per_unit)}</td>
                  <td>{r.night_surcharge_pct || 0}%</td>
                  <td>{r.weekend_surcharge_pct || 0}%</td>
                  <td>{r.cold_surcharge_pct || 0}%</td>
                  <td>{won(r.forklift_fee)}</td>
                  <td>{won(r.manual_load_fee)}</td>
                  <td>
                    <button
                      className="btn-danger"
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                      onClick={() => handleDelete(r.id, r.vehicle_type)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
