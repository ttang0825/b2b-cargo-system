"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const VEHICLE_TYPES = ["1톤", "1.4톤", "2.5톤", "3.5톤", "5톤", "5톤 플러스/축"];

function Field({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div style={{ marginBottom: 10, minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: 13.5, overflowWrap: "anywhere" }}>
        {String(value)}
      </div>
    </div>
  );
}

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [driver, setDriver] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    operating_regions: "",
    preferred_routes: "",
    is_business: false,
    bank_account: "",
    cold_chain_available: false,
    lift_available: false,
    forklift_available: false,
    rating: "",
    claim_history: "",
    notes: "",
    vehicle_number: "",
    vehicle_type: "1톤",
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("drivers")
      .select("*, vehicles(id,vehicle_number,vehicle_type)")
      .eq("id", id)
      .single();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDriver(data);
    const v = data.vehicles?.[0] || null;
    setVehicle(v);
    setEditForm({
      name: data.name || "",
      phone: data.phone || "",
      operating_regions: data.operating_regions || "",
      preferred_routes: data.preferred_routes || "",
      is_business: data.is_business || false,
      bank_account: data.bank_account || "",
      cold_chain_available: data.cold_chain_available || false,
      lift_available: data.lift_available || false,
      forklift_available: data.forklift_available || false,
      rating: data.rating || "",
      claim_history: data.claim_history || "",
      notes: data.notes || "",
      vehicle_number: v?.vehicle_number || "",
      vehicle_type: v?.vehicle_type || "1톤",
    });
    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("drivers")
      .update({
        name: editForm.name,
        phone: editForm.phone || null,
        operating_regions: editForm.operating_regions || null,
        preferred_routes: editForm.preferred_routes || null,
        is_business: editForm.is_business,
        bank_account: editForm.bank_account || null,
        cold_chain_available: editForm.cold_chain_available,
        lift_available: editForm.lift_available,
        forklift_available: editForm.forklift_available,
        rating: editForm.rating ? Number(editForm.rating) : null,
        claim_history: editForm.claim_history || null,
        notes: editForm.notes || null,
      })
      .eq("id", id);

    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    if (vehicle) {
      await supabase
        .from("vehicles")
        .update({
          vehicle_number: editForm.vehicle_number || null,
          vehicle_type: editForm.vehicle_type,
          cold_chain: editForm.cold_chain_available,
          lift: editForm.lift_available,
        })
        .eq("id", vehicle.id);
    } else if (editForm.vehicle_number.trim()) {
      await supabase.from("vehicles").insert({
        driver_id: id,
        vehicle_number: editForm.vehicle_number,
        vehicle_type: editForm.vehicle_type,
        cold_chain: editForm.cold_chain_available,
        lift: editForm.lift_available,
      });
    }

    setSaving(false);
    setEditing(false);
    load();
  }

  async function handleDelete() {
    if (!driver) return;
    setDeleting(true);
    setError(null);
    const dispatchRes = await supabase
      .from("dispatches")
      .select("id", { count: "exact", head: true })
      .eq("driver_id", id);
    if ((dispatchRes.count || 0) > 0) {
      setDeleting(false);
      alert(
        `이 차주는 배차 기록이 ${dispatchRes.count}건 있어 삭제할 수 없습니다.`
      );
      return;
    }
    const confirmed = window.confirm(
      `차주 "${driver.name}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`
    );
    if (!confirmed) {
      setDeleting(false);
      return;
    }
    if (vehicle) {
      await supabase.from("vehicles").delete().eq("id", vehicle.id);
    }
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    setDeleting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/admin/drivers");
  }

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  if (error || !driver) {
    return (
      <main className="container">
        <div className="error-box">차주 정보를 불러오지 못했습니다. {error}</div>
        <Link href="/admin/drivers" className="btn btn-ghost">
          ← 목록으로
        </Link>
      </main>
    );
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/admin/drivers"
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          ← 차주 목록으로
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{driver.name}</h1>
          <p className="page-desc">
            {vehicle
              ? `${vehicle.vehicle_number || "번호 미등록"} · ${
                  vehicle.vehicle_type || ""
                }`
              : "차량 미등록"}
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
                onClick={() => {
                  setEditing(false);
                  load();
                }}
              >
                취소
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        {editing ? (
          <div className="form-grid" style={{ padding: 0 }}>
            <div className="field">
              <label>차주명</label>
              <input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>연락처</label>
              <input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>차량번호</label>
              <input
                value={editForm.vehicle_number}
                onChange={(e) =>
                  setEditForm({ ...editForm, vehicle_number: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>차량 톤수</label>
              <select
                value={editForm.vehicle_type}
                onChange={(e) =>
                  setEditForm({ ...editForm, vehicle_type: e.target.value })
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
                value={editForm.operating_regions}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    operating_regions: e.target.value,
                  })
                }
              />
            </div>
            <div className="field">
              <label>선호 노선</label>
              <input
                value={editForm.preferred_routes}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    preferred_routes: e.target.value,
                  })
                }
              />
            </div>
            <div className="field">
              <label>정산 계좌</label>
              <input
                value={editForm.bank_account}
                onChange={(e) =>
                  setEditForm({ ...editForm, bank_account: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>평점 (0~5)</label>
              <input
                type="number"
                step={0.1}
                min={0}
                max={5}
                value={editForm.rating}
                onChange={(e) =>
                  setEditForm({ ...editForm, rating: e.target.value })
                }
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>클레임 이력</label>
              <textarea
                rows={2}
                value={editForm.claim_history}
                onChange={(e) =>
                  setEditForm({ ...editForm, claim_history: e.target.value })
                }
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>메모</label>
              <textarea
                rows={2}
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
            <Field label="연락처" value={driver.phone} />
            <Field label="차량번호" value={vehicle?.vehicle_number} />
            <Field label="차량톤수" value={vehicle?.vehicle_type} />
            <Field label="운행 가능지역" value={driver.operating_regions} />
            <Field label="선호 노선" value={driver.preferred_routes} />
            <Field label="정산 계좌" value={driver.bank_account} />
            <Field
              label="사업자 여부"
              value={driver.is_business ? "사업자" : "개인"}
            />
            <Field label="평점" value={driver.rating} />
            <Field label="클레임 이력" value={driver.claim_history} />
          </div>
        )}

        {editing ? (
          <div
            style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 13 }}
          >
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
                  checked={(editForm as any)[key]}
                  onChange={(e) =>
                    setEditForm({ ...editForm, [key]: e.target.checked })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {driver.cold_chain_available && <span className="badge">냉장/냉동</span>}
            {driver.lift_available && <span className="badge">리프트</span>}
            {driver.forklift_available && <span className="badge">지게차</span>}
          </div>
        )}

        {driver.notes && !editing && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              메모
            </div>
            <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>
              {driver.notes}
            </div>
          </div>
        )}
      </div>

      <div
        className="card"
        style={{ padding: 20, marginBottom: 20, opacity: 0.6 }}
      >
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 6 }}>
          배차 이력
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>
          배차 관리 화면 제작 후, 이 차주가 수행한 운송 건들이 이 자리에
          표시됩니다.
        </p>
      </div>
    </main>
  );
}
