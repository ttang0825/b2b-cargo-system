"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { REGIONS, formatPhoneNumber } from "@/lib/constants";
import MultiSelectTags from "@/components/MultiSelectTags";

const VEHICLE_TYPES = ["1톤", "1.4톤", "2.5톤", "3.5톤", "5톤", "5톤 플러스/축"];
const BODY_TYPES = [
  "카고",
  "탑차",
  "윙바디",
  "냉장탑",
  "냉동탑",
  "리프트",
  "크레인",
  "렉카",
  "트레일러",
  "사다리차",
  "기타/협의",
];

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

type VehicleForm = {
  id: string | null; // null이면 아직 저장 안 된 신규 차량
  vehicle_number: string;
  vehicle_type: string;
  body_type: string;
};

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [driver, setDriver] = useState<any>(null);
  const [vehicles, setVehicles] = useState<VehicleForm[]>([]);
  const [deletedVehicleIds, setDeletedVehicleIds] = useState<string[]>([]);
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
    biz_reg_no: "",
    bank_account: "",
    cold_chain_available: false,
    lift_available: false,
    forklift_available: false,
    license_verified: false,
    insurance_verified: false,
    insurance_expiry: "",
    rating: "",
    claim_history: "",
    notes: "",
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("drivers")
      .select("*, vehicles(id,vehicle_number,vehicle_type,body_type)")
      .eq("id", id)
      .single();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDriver(data);
    setVehicles(
      (data.vehicles || []).map((v: any) => ({
        id: v.id,
        vehicle_number: v.vehicle_number || "",
        vehicle_type: v.vehicle_type || "1톤",
        body_type: v.body_type || "카고",
      }))
    );
    setDeletedVehicleIds([]);
    setEditForm({
      name: data.name || "",
      phone: data.phone || "",
      operating_regions: data.operating_regions || "",
      preferred_routes: data.preferred_routes || "",
      is_business: data.is_business || false,
      biz_reg_no: data.biz_reg_no || "",
      bank_account: data.bank_account || "",
      cold_chain_available: data.cold_chain_available || false,
      lift_available: data.lift_available || false,
      forklift_available: data.forklift_available || false,
      license_verified: data.license_verified || false,
      insurance_verified: data.insurance_verified || false,
      insurance_expiry: data.insurance_expiry || "",
      rating: data.rating ?? "",
      claim_history: data.claim_history || "",
      notes: data.notes || "",
    });
    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function addVehicleRow() {
    setVehicles((prev) => [
      ...prev,
      { id: null, vehicle_number: "", vehicle_type: "1톤", body_type: "카고" },
    ]);
  }

  function updateVehicleRow(index: number, patch: Partial<VehicleForm>) {
    setVehicles((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v))
    );
  }

  function removeVehicleRow(index: number) {
    const v = vehicles[index];
    if (v.id) setDeletedVehicleIds((prev) => [...prev, v.id!]);
    setVehicles((prev) => prev.filter((_, i) => i !== index));
  }

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
        biz_reg_no: editForm.is_business ? editForm.biz_reg_no || null : null,
        bank_account: editForm.bank_account || null,
        cold_chain_available: editForm.cold_chain_available,
        lift_available: editForm.lift_available,
        forklift_available: editForm.forklift_available,
        license_verified: editForm.license_verified,
        insurance_verified: editForm.insurance_verified,
        insurance_expiry: editForm.insurance_expiry || null,
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

    // 차량 목록 저장: 삭제 → 기존 수정 → 신규 추가 순서로 처리
    if (deletedVehicleIds.length > 0) {
      await supabase.from("vehicles").delete().in("id", deletedVehicleIds);
    }
    for (const v of vehicles) {
      if (!v.vehicle_number.trim()) continue;
      if (v.id) {
        await supabase
          .from("vehicles")
          .update({
            vehicle_number: v.vehicle_number,
            vehicle_type: v.vehicle_type,
            body_type: v.body_type,
            cold_chain: editForm.cold_chain_available,
            lift: editForm.lift_available,
          })
          .eq("id", v.id);
      } else {
        await supabase.from("vehicles").insert({
          driver_id: id,
          vehicle_number: v.vehicle_number,
          vehicle_type: v.vehicle_type,
          body_type: v.body_type,
          cold_chain: editForm.cold_chain_available,
          lift: editForm.lift_available,
        });
      }
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
    await supabase.from("vehicles").delete().eq("driver_id", id);
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
            차량 {vehicles.length}대 등록 · 누적 운송{" "}
            {driver.completed_trip_count || 0}건
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
                  setEditForm({
                    ...editForm,
                    phone: formatPhoneNumber(e.target.value),
                  })
                }
                placeholder="숫자만 입력하면 자동으로 - 표시"
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>운행 가능지역 (중복 선택 가능)</label>
              <MultiSelectTags
                options={REGIONS}
                value={editForm.operating_regions}
                onChange={(v) =>
                  setEditForm({ ...editForm, operating_regions: v })
                }
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>선호 노선 (중복 선택 가능)</label>
              <MultiSelectTags
                options={REGIONS}
                value={editForm.preferred_routes}
                onChange={(v) =>
                  setEditForm({ ...editForm, preferred_routes: v })
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
              <label>사업자 여부</label>
              <select
                value={editForm.is_business ? "true" : "false"}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    is_business: e.target.value === "true",
                  })
                }
              >
                <option value="false">개인</option>
                <option value="true">사업자</option>
              </select>
            </div>
            {editForm.is_business && (
              <div className="field">
                <label>사업자등록번호</label>
                <input
                  value={editForm.biz_reg_no}
                  onChange={(e) =>
                    setEditForm({ ...editForm, biz_reg_no: e.target.value })
                  }
                  placeholder="000-00-00000"
                />
              </div>
            )}
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
            <div className="field">
              <label>보험 만기일</label>
              <input
                type="date"
                value={editForm.insurance_expiry}
                onChange={(e) =>
                  setEditForm({ ...editForm, insurance_expiry: e.target.value })
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
            <Field label="운행 가능지역" value={driver.operating_regions} />
            <Field label="선호 노선" value={driver.preferred_routes} />
            <Field label="정산 계좌" value={driver.bank_account} />
            <Field
              label="사업자 여부"
              value={driver.is_business ? "사업자" : "개인"}
            />
            <Field label="사업자등록번호" value={driver.biz_reg_no} />
            <Field label="평점" value={driver.rating} />
            <Field label="보험 만기일" value={driver.insurance_expiry} />
            <Field label="누적 운송건수" value={driver.completed_trip_count || 0} />
            <Field label="클레임 이력" value={driver.claim_history} />
          </div>
        )}

        {editing ? (
          <div
            style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 13, flexWrap: "wrap" }}
          >
            {[
              ["cold_chain_available", "냉장/냉동 가능"],
              ["lift_available", "리프트 가능"],
              ["forklift_available", "지게차 가능"],
              ["license_verified", "화물운송자격증 보유"],
              ["insurance_verified", "적재물배상보험 가입"],
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
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {driver.cold_chain_available && <span className="badge">냉장/냉동</span>}
            {driver.lift_available && <span className="badge">리프트</span>}
            {driver.forklift_available && <span className="badge">지게차</span>}
            {driver.license_verified && <span className="badge">자격증 보유</span>}
            {driver.insurance_verified && <span className="badge">보험 가입</span>}
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

        {/* 보유 차량: 보기 모드에서는 조회만, 수정은 "정보 수정"에서 함께 처리 */}
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            보유 차량
          </div>

          {!editing ? (
            vehicles.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                등록된 차량이 없습니다.
              </p>
            ) : (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {vehicles.map((v, i) => (
                  <span key={v.id || i} className="badge">
                    {v.vehicle_number || "번호 미등록"} · {v.vehicle_type} ·{" "}
                    {v.body_type}
                  </span>
                ))}
              </div>
            )
          ) : (
            <>
              {vehicles.map((v, i) => (
                <div
                  key={v.id || `new-${i}`}
                  style={{
                    display: "flex",
                    gap: 6,
                    marginBottom: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <input
                    value={v.vehicle_number}
                    onChange={(e) =>
                      updateVehicleRow(i, { vehicle_number: e.target.value })
                    }
                    placeholder="차량번호"
                    style={{ width: 120, fontSize: 12.5, padding: "5px 8px" }}
                  />
                  <select
                    value={v.vehicle_type}
                    onChange={(e) =>
                      updateVehicleRow(i, { vehicle_type: e.target.value })
                    }
                    style={{ fontSize: 12.5 }}
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    value={v.body_type}
                    onChange={(e) =>
                      updateVehicleRow(i, { body_type: e.target.value })
                    }
                    style={{ fontSize: 12.5 }}
                  >
                    {BODY_TYPES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-danger"
                    style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, cursor: "pointer" }}
                    onClick={() => removeVehicleRow(i)}
                  >
                    삭제
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12.5, borderRadius: 6, cursor: "pointer" }}
                onClick={addVehicleRow}
              >
                + 차량 추가
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className="card"
        style={{ padding: 20, marginBottom: 20, opacity: 0.6 }}
      >
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 6 }}>
          배차 이력
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>
          이 차주가 수행한 운송 건 상세 목록은 다음 단계에서 이 자리에
          표시됩니다. (누적 운송건수는 위에서 자동 집계되고 있습니다.)
        </p>
      </div>
    </main>
  );
}
