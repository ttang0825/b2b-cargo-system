"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const VEHICLE_TYPES = ["1톤", "1.4톤", "2.5톤", "3.5톤", "5톤", "5톤 플러스/축"];

type DriverRow = {
  id: string;
  name: string;
  phone: string | null;
  operating_regions: string | null;
  cold_chain_available: boolean;
  lift_available: boolean;
  forklift_available: boolean;
  rating: number | null;
  created_at: string;
  vehicles: { vehicle_number: string | null; vehicle_type: string | null }[];
};

const SORT_OPTIONS = [
  { key: "created_at", label: "등록일" },
  { key: "name", label: "차주명" },
  { key: "rating", label: "평점" },
];

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    operating_regions: "",
    preferred_routes: "",
    is_business: false,
    bank_account: "",
    vehicle_number: "",
    vehicle_type: "1톤",
    cold_chain_available: false,
    lift_available: false,
    forklift_available: false,
    notes: "",
  });

  async function loadDrivers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("drivers")
      .select(
        "id,name,phone,operating_regions,cold_chain_available,lift_available,forklift_available,rating,created_at,vehicles(vehicle_number,vehicle_type)"
      )
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setDrivers(data as any as DriverRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadDrivers();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("차주명은 필수입니다.");
      return;
    }
    setSaving(true);
    setError(null);

    const { data: newDriver, error } = await supabase
      .from("drivers")
      .insert({
        name: form.name,
        phone: form.phone || null,
        operating_regions: form.operating_regions || null,
        preferred_routes: form.preferred_routes || null,
        is_business: form.is_business,
        bank_account: form.bank_account || null,
        cold_chain_available: form.cold_chain_available,
        lift_available: form.lift_available,
        forklift_available: form.forklift_available,
        notes: form.notes || null,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    if (newDriver && form.vehicle_number.trim()) {
      await supabase.from("vehicles").insert({
        driver_id: newDriver.id,
        vehicle_number: form.vehicle_number,
        vehicle_type: form.vehicle_type,
        cold_chain: form.cold_chain_available,
        lift: form.lift_available,
      });
    }

    setSaving(false);
    setShowForm(false);
    setForm({
      name: "",
      phone: "",
      operating_regions: "",
      preferred_routes: "",
      is_business: false,
      bank_account: "",
      vehicle_number: "",
      vehicle_type: "1톤",
      cold_chain_available: false,
      lift_available: false,
      forklift_available: false,
      notes: "",
    });
    loadDrivers();
  }

  const filtered = useMemo(() => {
    return drivers
      .filter((d) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        const vehicleNo = d.vehicles?.[0]?.vehicle_number || "";
        return (
          d.name.toLowerCase().includes(q) ||
          (d.phone || "").includes(q) ||
          (d.operating_regions || "").toLowerCase().includes(q) ||
          vehicleNo.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let av: string | number = "";
        let bv: string | number = "";
        if (sortKey === "name") {
          av = a.name;
          bv = b.name;
        } else if (sortKey === "rating") {
          av = a.rating || 0;
          bv = b.rating || 0;
        } else {
          av = a.created_at;
          bv = b.created_at;
        }
        let cmp: number;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = String(av).localeCompare(String(bv), "ko");
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [drivers, search, sortKey, sortDir]);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">차주(기사) 관리</h1>
          <p className="page-desc">
            배차에 활용할 차주풀입니다. 차량 정보도 함께 등록합니다.
          </p>
        </div>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "닫기" : "+ 신규 차주 등록"}
        </button>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ padding: 0 }}>
              <div className="field">
                <label>차주명 *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>연락처</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="010-0000-0000"
                />
              </div>
              <div className="field">
                <label>차량번호</label>
                <input
                  value={form.vehicle_number}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_number: e.target.value })
                  }
                  placeholder="예: 12가3456"
                />
              </div>
              <div className="field">
                <label>차량 톤수</label>
                <select
                  value={form.vehicle_type}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_type: e.target.value })
                  }
                >
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>운행 가능지역</label>
                <input
                  value={form.operating_regions}
                  onChange={(e) =>
                    setForm({ ...form, operating_regions: e.target.value })
                  }
                  placeholder="예: 수도권 전역"
                />
              </div>
              <div className="field">
                <label>선호 노선</label>
                <input
                  value={form.preferred_routes}
                  onChange={(e) =>
                    setForm({ ...form, preferred_routes: e.target.value })
                  }
                  placeholder="예: 서울-경기"
                />
              </div>
              <div className="field">
                <label>정산 계좌</label>
                <input
                  value={form.bank_account}
                  onChange={(e) =>
                    setForm({ ...form, bank_account: e.target.value })
                  }
                  placeholder="은행명 계좌번호"
                />
              </div>
              <div className="field">
                <label>사업자 여부</label>
                <select
                  value={form.is_business ? "true" : "false"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      is_business: e.target.value === "true",
                    })
                  }
                >
                  <option value="false">개인</option>
                  <option value="true">사업자</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, margin: "14px 0", fontSize: 13 }}>
              {[
                ["cold_chain_available", "냉장/냉동 가능"],
                ["lift_available", "리프트 가능"],
                ["forklift_available", "지게차 가능"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                >
                  <input
                    type="checkbox"
                    checked={(form as any)[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.checked })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label>메모</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
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

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 320 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="차주명, 연락처, 지역, 차량번호로 검색"
            style={{
              width: "100%",
              padding: "9px 30px 9px 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: 13.5,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              ×
            </button>
          )}
        </div>
        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>정렬</span>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          style={{ fontSize: 12.5, padding: "7px 8px" }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }}
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        >
          {sortDir === "asc" ? "오름차순 ↑" : "내림차순 ↓"}
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">등록된 차주가 없습니다.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>차주명</th>
                <th>연락처</th>
                <th>차량번호</th>
                <th>차량톤수</th>
                <th>운행가능지역</th>
                <th>특수조건</th>
                <th>평점</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => router.push(`/admin/drivers/${d.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{d.name}</td>
                  <td>{d.phone || "-"}</td>
                  <td>{d.vehicles?.[0]?.vehicle_number || "-"}</td>
                  <td>{d.vehicles?.[0]?.vehicle_type || "-"}</td>
                  <td>{d.operating_regions || "-"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {d.cold_chain_available && (
                        <span className="badge">냉장</span>
                      )}
                      {d.lift_available && <span className="badge">리프트</span>}
                      {d.forklift_available && (
                        <span className="badge">지게차</span>
                      )}
                    </div>
                  </td>
                  <td>{d.rating ? d.rating.toFixed(1) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
