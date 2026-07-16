"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { VEHICLE_TYPES, BODY_TYPES } from "@/lib/constants";
import DateTimePicker from "@/components/DateTimePicker";

const REQUEST_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  대기중: { bg: "#fff1e2", text: "#d9730d" },
  승인됨: { bg: "#e6f7ec", text: "#1b9c57" },
  반려: { bg: "var(--danger-soft)", text: "var(--danger)" },
};

type SavedLocation = { id: string; address: string | null; location_type: string | null };

export default function PortalRequestPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saveOrigin, setSaveOrigin] = useState(false);
  const [saveDestination, setSaveDestination] = useState(false);

  const [form, setForm] = useState({
    origin: "",
    destination: "",
    vehicle_type: VEHICLE_TYPES[0],
    body_type: BODY_TYPES[0],
    item: "",
    requested_pickup_at: "",
    requested_dropoff_at: "",
    notes: "",
  });

  async function loadRequests(cid: string) {
    const { data } = await supabase
      .from("portal_order_requests")
      .select(
        "id,origin,destination,vehicle_type,body_type,item,requested_pickup_at,requested_dropoff_at,status,staff_note,created_at"
      )
      .eq("company_id", cid)
      .order("created_at", { ascending: false })
      .limit(30);
    setRequests(data || []);
  }

  async function loadSavedLocations(cid: string) {
    const { data } = await supabase
      .from("customer_locations")
      .select("id,address,location_type")
      .eq("company_id", cid);
    setSavedLocations(data || []);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const { data: account } = await supabase
        .from("customer_accounts")
        .select("id,company_id")
        .eq("auth_user_id", session.user.id)
        .single();
      if (account) {
        setCompanyId(account.company_id);
        setAccountId(account.id);

        // 회사 기본 주소를 출발지 기본값으로 채워줌 (수정 가능)
        const { data: company } = await supabase
          .from("companies")
          .select("address")
          .eq("id", account.company_id)
          .single();
        if (company?.address) {
          setForm((prev) => ({ ...prev, origin: company.address }));
        }

        await Promise.all([loadRequests(account.company_id), loadSavedLocations(account.company_id)]);
      }
      setLoading(false);
    }
    init();

    // 승인/반려 상태가 바뀌면 새로고침 없이 바로 반영
    const channel = supabase
      .channel("portal_requests_customer")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "portal_order_requests" },
        () => {
          setCompanyId((cid) => {
            if (cid) loadRequests(cid);
            return cid;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.origin.trim() || !form.destination.trim()) {
      setError("출발지와 도착지를 입력해주세요.");
      return;
    }
    if (!companyId) {
      setError("계정 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: insertError } = await supabase.from("portal_order_requests").insert({
      company_id: companyId,
      requested_by: accountId,
      origin: form.origin,
      destination: form.destination,
      vehicle_type: form.vehicle_type,
      body_type: form.body_type,
      item: form.item || null,
      requested_pickup_at: form.requested_pickup_at || null,
      requested_dropoff_at: form.requested_dropoff_at || null,
      notes: form.notes || null,
      status: "대기중",
    });

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    // 체크한 주소를 배송지 목록에 저장
    const toSave: any[] = [];
    if (saveOrigin && form.origin.trim())
      toSave.push({ company_id: companyId, address: form.origin, location_type: "상차지" });
    if (saveDestination && form.destination.trim())
      toSave.push({ company_id: companyId, address: form.destination, location_type: "하차지" });
    if (toSave.length > 0) {
      await supabase.from("customer_locations").insert(toSave);
      await loadSavedLocations(companyId);
    }

    setSaving(false);
    setSuccess(true);
    setSaveOrigin(false);
    setSaveDestination(false);
    setForm((prev) => ({
      ...prev,
      destination: "",
      item: "",
      requested_pickup_at: "",
      requested_dropoff_at: "",
      notes: "",
    }));
    loadRequests(companyId);
  }

  async function handleDeleteRequest(id: string) {
    if (!window.confirm("이 요청을 삭제하시겠습니까?")) return;
    const { error: deleteError } = await supabase.from("portal_order_requests").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (companyId) loadRequests(companyId);
  }

  const pickupBadges = savedLocations.filter((l) => l.location_type === "상차지");
  const dropoffBadges = savedLocations.filter((l) => l.location_type === "하차지");

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">발주 요청</h1>
          <p className="page-desc">
            운송이 필요한 구간을 요청해주시면, 담당자가 확인 후 운임을 확정해 정식
            운송오더로 접수해드립니다.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ padding: 0 }}>
            <div className="field">
              <label>출발지 *</label>
              <input value={form.origin} onChange={(e) => setField("origin", e.target.value)} />
              {pickupBadges.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                  {pickupBadges.map((l) => (
                    <span
                      key={l.id}
                      className="badge"
                      style={{ cursor: "pointer" }}
                      onClick={() => setField("origin", l.address || "")}
                    >
                      {l.address}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="field">
              <label>도착지 *</label>
              <input value={form.destination} onChange={(e) => setField("destination", e.target.value)} />
              {dropoffBadges.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                  {dropoffBadges.map((l) => (
                    <span
                      key={l.id}
                      className="badge"
                      style={{ cursor: "pointer" }}
                      onClick={() => setField("destination", l.address || "")}
                    >
                      {l.address}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <input
                  type="checkbox"
                  checked={saveOrigin}
                  onChange={(e) => setSaveOrigin(e.target.checked)}
                  style={{ margin: 0 }}
                />
                이 출발지를 배송지 목록에 저장
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <input
                  type="checkbox"
                  checked={saveDestination}
                  onChange={(e) => setSaveDestination(e.target.checked)}
                  style={{ margin: 0 }}
                />
                이 도착지를 배송지 목록에 저장
              </label>
            </div>

            <div className="field">
              <label>희망 톤수</label>
              <select value={form.vehicle_type} onChange={(e) => setField("vehicle_type", e.target.value)}>
                {VEHICLE_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>희망 차종</label>
              <select value={form.body_type} onChange={(e) => setField("body_type", e.target.value)}>
                {BODY_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <DateTimePicker
                label="희망 상차 일시"
                value={form.requested_pickup_at}
                onChange={(v) => setField("requested_pickup_at", v)}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <DateTimePicker
                label="희망 하차 일시"
                value={form.requested_dropoff_at}
                onChange={(v) => setField("requested_dropoff_at", v)}
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>품목</label>
              <input value={form.item} onChange={(e) => setField("item", e.target.value)} />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>요청 메모</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="상하차 조건, 특이사항 등"
              />
            </div>
          </div>
          {error && <div className="error-box">{error}</div>}
          {success && (
            <div
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 14,
              }}
            >
              요청이 접수되었습니다. 담당자 확인 후 연락드리겠습니다.
            </div>
          )}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "요청 중..." : "요청 보내기"}
          </button>
        </form>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <div
          style={{
            padding: "16px 20px",
            fontSize: 14,
            fontWeight: 700,
            borderBottom: "1px solid var(--border)",
          }}
        >
          내 요청 내역
        </div>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">아직 보낸 요청이 없습니다.</div>
        ) : (
          <table style={{ minWidth: 780 }}>
            <thead>
              <tr>
                <th>구간</th>
                <th>차량</th>
                <th>희망 상차일</th>
                <th>상태</th>
                <th>담당자 메모</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.origin} → {r.destination}
                  </td>
                  <td className="cell-nowrap">
                    {[r.vehicle_type, r.body_type].filter(Boolean).join(" ") || "-"}
                  </td>
                  <td className="cell-nowrap">
                    <span className="num">
                      {r.requested_pickup_at
                        ? new Date(r.requested_pickup_at).toLocaleString("ko-KR", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </span>
                  </td>
                  <td className="cell-nowrap">
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: (REQUEST_STATUS_COLORS[r.status] || {}).bg,
                        color: (REQUEST_STATUS_COLORS[r.status] || {}).text,
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>{r.staff_note || "-"}</td>
                  <td className="cell-nowrap">
                    {r.status === "대기중" && (
                      <button
                        className="btn-danger"
                        style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                        onClick={() => handleDeleteRequest(r.id)}
                      >
                        삭제
                      </button>
                    )}
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
