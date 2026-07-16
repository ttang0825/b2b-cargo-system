"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { VEHICLE_TYPES } from "@/lib/constants";
import DateTimePicker from "@/components/DateTimePicker";

declare global {
  interface Window {
    daum: any;
  }
}

const REQUEST_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  대기중: { bg: "#fff1e2", text: "#d9730d" },
  승인됨: { bg: "#e6f7ec", text: "#1b9c57" },
  반려: { bg: "var(--danger-soft)", text: "var(--danger)" },
};

const SINGLE_SELECT_CATEGORIES = ["차량형태", "물품특성", "운송시간", "긴급여부", "왕복/편도"];

type SavedLocation = { id: string; address: string | null; location_type: string | null };
type Surcharge = { category: string; option_name: string };

// 저장된 배송지 주소 뱃지 - 길어도 칸을 넘어가지 않고 줄바꿈되도록
function AddressBadge({ address, onClick }: { address: string; onClick: () => void }) {
  return (
    <span
      className="badge"
      onClick={onClick}
      style={{
        cursor: "pointer",
        whiteSpace: "normal",
        wordBreak: "break-word",
        textAlign: "left",
        maxWidth: "100%",
      }}
    >
      {address}
    </span>
  );
}

export default function PortalRequestPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saveOrigin, setSaveOrigin] = useState(false);
  const [saveDestination, setSaveDestination] = useState(false);
  const [postcodeReady, setPostcodeReady] = useState(false);

  const [form, setForm] = useState({
    origin: "",
    originDetail: "",
    destination: "",
    destinationDetail: "",
    vehicle_type: VEHICLE_TYPES[0],
    차량형태: "",
    상차조건: "",
    하차조건: "",
    물품특성: "",
    운송시간: "",
    긴급여부: "",
    "왕복/편도": "",
    waitingMinutes: "",
    waypointCount: "",
    item: "",
    requested_pickup_at: "",
    requested_dropoff_at: "",
    notes: "",
  });

  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) {
      setPostcodeReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => setPostcodeReady(true);
    document.body.appendChild(script);
  }, []);

  function openAddressSearch(target: "origin" | "destination") {
    if (!postcodeReady || !window.daum) return;
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        const addr = data.roadAddress || data.jibunAddress;
        if (target === "origin") {
          setForm((prev) => ({ ...prev, origin: addr, originDetail: "" }));
        } else {
          setForm((prev) => ({ ...prev, destination: addr, destinationDetail: "" }));
        }
      },
    }).open();
  }

  async function loadRequests(cid: string) {
    const { data } = await supabase
      .from("portal_order_requests")
      .select(
        "id,origin,destination,vehicle_type,body_type,item,notes,requested_pickup_at,requested_dropoff_at,status,staff_note,created_at"
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

  async function loadSurcharges() {
    const { data } = await supabase.from("rate_surcharges").select("category,option_name");
    const list = (data as Surcharge[]) || [];
    setSurcharges(list);
    setForm((prev) => {
      const next = { ...prev };
      for (const cat of [...SINGLE_SELECT_CATEGORIES, "상하차방식"]) {
        const first = list.find((s) => s.category === cat)?.option_name;
        if (!first) continue;
        if (cat === "상하차방식") {
          if (!next.상차조건) next.상차조건 = first;
          if (!next.하차조건) next.하차조건 = first;
        } else {
          if (!(next as any)[cat]) (next as any)[cat] = first;
        }
      }
      return next;
    });
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

        const { data: company } = await supabase
          .from("companies")
          .select("address")
          .eq("id", account.company_id)
          .single();
        if (company?.address) {
          setForm((prev) => ({ ...prev, origin: company.address }));
        }

        await Promise.all([
          loadRequests(account.company_id),
          loadSavedLocations(account.company_id),
          loadSurcharges(),
        ]);
      }
      setLoading(false);
    }
    init();

    const channel = supabase
      .channel("portal_requests_customer")
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_order_requests" }, () => {
        setCompanyId((cid) => {
          if (cid) loadRequests(cid);
          return cid;
        });
      })
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

    const fullOrigin = [form.origin, form.originDetail].filter((v) => v.trim()).join(" ");
    const fullDestination = [form.destination, form.destinationDetail].filter((v) => v.trim()).join(" ");

    const { error: insertError } = await supabase.from("portal_order_requests").insert({
      company_id: companyId,
      requested_by: accountId,
      origin: fullOrigin,
      destination: fullDestination,
      vehicle_type: form.vehicle_type,
      body_type: form.차량형태 || null,
      load_condition: form.상차조건 || null,
      unload_condition: form.하차조건 || null,
      item_condition: form.물품특성 || null,
      transport_time: form.운송시간 || null,
      urgency: form.긴급여부 || null,
      trip_type: form["왕복/편도"] || null,
      waiting_minutes: form.waitingMinutes ? Number(form.waitingMinutes) : null,
      waypoint_count: form.waypointCount ? Number(form.waypointCount) : null,
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

    const toSave: any[] = [];
    if (saveOrigin && fullOrigin) toSave.push({ company_id: companyId, address: fullOrigin, location_type: "상차지" });
    if (saveDestination && fullDestination)
      toSave.push({ company_id: companyId, address: fullDestination, location_type: "하차지" });
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
      destinationDetail: "",
      item: "",
      requested_pickup_at: "",
      requested_dropoff_at: "",
      notes: "",
      waitingMinutes: "",
      waypointCount: "",
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
            운송이 필요한 구간을 요청해주시면, 담당자가 확인 후 운임을 확정해 정식 운송오더로
            접수해드립니다.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <form onSubmit={handleSubmit}>
          {/* 출발지 - 전체 너비, 저장 체크박스는 바로 아래에 */}
          <div className="field" style={{ marginBottom: 16 }}>
            <label>출발지 *</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={form.origin}
                onChange={(e) => setField("origin", e.target.value)}
                placeholder="도로명주소 검색 또는 직접 입력"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "0 10px", borderRadius: 6, fontSize: 12, whiteSpace: "nowrap", cursor: "pointer" }}
                onClick={() => openAddressSearch("origin")}
              >
                주소검색
              </button>
            </div>
            <input
              value={form.originDetail}
              onChange={(e) => setField("originDetail", e.target.value)}
              placeholder="상세주소 (동/층/호수, 창고 위치 등)"
              style={{ marginTop: 6 }}
            />
            {pickupBadges.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                {pickupBadges.map((l) => (
                  <AddressBadge
                    key={l.id}
                    address={l.address || ""}
                    onClick={() => setForm((prev) => ({ ...prev, origin: l.address || "", originDetail: "" }))}
                  />
                ))}
              </div>
            )}
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
                fontSize: 12,
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={saveOrigin}
                onChange={(e) => setSaveOrigin(e.target.checked)}
                style={{ margin: 0, width: "auto", flexShrink: 0 }}
              />
              이 출발지를 배송지 목록에 저장
            </label>
          </div>

          {/* 도착지 - 전체 너비, 저장 체크박스는 바로 아래에 */}
          <div className="field" style={{ marginBottom: 16 }}>
            <label>도착지 *</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={form.destination}
                onChange={(e) => setField("destination", e.target.value)}
                placeholder="도로명주소 검색 또는 직접 입력"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "0 10px", borderRadius: 6, fontSize: 12, whiteSpace: "nowrap", cursor: "pointer" }}
                onClick={() => openAddressSearch("destination")}
              >
                주소검색
              </button>
            </div>
            <input
              value={form.destinationDetail}
              onChange={(e) => setField("destinationDetail", e.target.value)}
              placeholder="상세주소 (동/층/호수, 하차장 위치 등)"
              style={{ marginTop: 6 }}
            />
            {dropoffBadges.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                {dropoffBadges.map((l) => (
                  <AddressBadge
                    key={l.id}
                    address={l.address || ""}
                    onClick={() => setForm((prev) => ({ ...prev, destination: l.address || "", destinationDetail: "" }))}
                  />
                ))}
              </div>
            )}
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
                fontSize: 12,
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={saveDestination}
                onChange={(e) => setSaveDestination(e.target.checked)}
                style={{ margin: 0, width: "auto", flexShrink: 0 }}
              />
              이 도착지를 배송지 목록에 저장
            </label>
          </div>

          <div className="form-grid" style={{ padding: 0 }}>
            <div className="field">
              <label>희망 톤수</label>
              <select value={form.vehicle_type} onChange={(e) => setField("vehicle_type", e.target.value)}>
                {VEHICLE_TYPES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>상차조건</label>
              <select value={form.상차조건} onChange={(e) => setField("상차조건", e.target.value)}>
                {surcharges.filter((s) => s.category === "상하차방식").map((o) => (
                  <option key={o.option_name} value={o.option_name}>{o.option_name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>하차조건</label>
              <select value={form.하차조건} onChange={(e) => setField("하차조건", e.target.value)}>
                {surcharges.filter((s) => s.category === "상하차방식").map((o) => (
                  <option key={o.option_name} value={o.option_name}>{o.option_name}</option>
                ))}
              </select>
            </div>

            {SINGLE_SELECT_CATEGORIES.map((cat) => (
              <div className="field" key={cat}>
                <label>{cat}</label>
                <select value={(form as any)[cat]} onChange={(e) => setField(cat as any, e.target.value)}>
                  {surcharges.filter((s) => s.category === cat).map((o) => (
                    <option key={o.option_name} value={o.option_name}>{o.option_name}</option>
                  ))}
                </select>
              </div>
            ))}

            <div className="field">
              <label>대기시간(분)</label>
              <input
                type="number"
                value={form.waitingMinutes}
                onChange={(e) => setField("waitingMinutes", e.target.value)}
                placeholder="무료 30분 초과분만 가산"
              />
            </div>
            <div className="field">
              <label>경유지 수</label>
              <input type="number" value={form.waypointCount} onChange={(e) => setField("waypointCount", e.target.value)} />
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
              <label>특이사항</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="상하차 조건 관련 요청, 기타 참고사항" />
            </div>
          </div>
          {error && <div className="error-box">{error}</div>}
          {success && (
            <div style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              요청이 접수되었습니다. 담당자 확인 후 연락드리겠습니다.
            </div>
          )}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "요청 중..." : "요청 보내기"}
          </button>
        </form>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <div style={{ padding: "16px 20px", fontSize: 14, fontWeight: 700, borderBottom: "1px solid var(--border)" }}>
          내 요청 내역
        </div>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">아직 보낸 요청이 없습니다.</div>
        ) : (
          <table style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th>구간</th>
                <th>차량</th>
                <th>희망 상차일</th>
                <th>상태</th>
                <th>특이사항</th>
                <th>반려 사유</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.origin} → {r.destination}</td>
                  <td className="cell-nowrap">{[r.vehicle_type, r.body_type].filter(Boolean).join(" ") || "-"}</td>
                  <td className="cell-nowrap">
                    <span className="num">
                      {r.requested_pickup_at
                        ? new Date(r.requested_pickup_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                        : "-"}
                    </span>
                  </td>
                  <td className="cell-nowrap">
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: (REQUEST_STATUS_COLORS[r.status] || {}).bg, color: (REQUEST_STATUS_COLORS[r.status] || {}).text }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: 160 }}>{r.notes || "-"}</td>
                  <td style={{ maxWidth: 160 }}>{r.staff_note || "-"}</td>
                  <td className="cell-nowrap">
                    {r.status === "대기중" && (
                      <button className="btn-danger" style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }} onClick={() => handleDeleteRequest(r.id)}>
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
