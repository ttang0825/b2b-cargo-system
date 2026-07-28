"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import AddressSearch from "@/components/AddressSearch";

type Location = {
  id: string;
  address: string | null;
  location_type: string | null;
  sido: string | null;
  sigungu: string | null;
};

export default function PortalLocationsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [newType, setNewType] = useState("상차지");
  const [newAddress, setNewAddress] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [newSido, setNewSido] = useState("");
  const [newSigungu, setNewSigungu] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadLocations(cid: string) {
    const { data } = await supabase
      .from("customer_locations")
      .select("id,address,location_type,sido,sigungu")
      .eq("company_id", cid);
    setLocations(data || []);
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
        .select("company_id")
        .eq("auth_user_id", session.user.id)
        .single();
      if (account) {
        setCompanyId(account.company_id);
        await loadLocations(account.company_id);
      }
      setLoading(false);
    }
    init();
  }, []);

  async function handleAdd() {
    if (!newAddress.trim() || !companyId) return;
    const fullAddress = [newAddress, newDetail].filter((v) => v.trim()).join(" ");
    const { error } = await supabase.from("customer_locations").insert({
      company_id: companyId,
      address: fullAddress,
      location_type: newType,
      sido: newSido || null,
      sigungu: newSigungu || null,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setNewAddress("");
    setNewDetail("");
    setNewSido("");
    setNewSigungu("");
    loadLocations(companyId);
  }

  async function handleUpdate(locId: string) {
    await supabase.from("customer_locations").update({ address: editingValue }).eq("id", locId);
    setEditingId(null);
    if (companyId) loadLocations(companyId);
  }

  async function handleDelete(locId: string) {
    if (!window.confirm("이 주소를 삭제하시겠습니까?")) return;
    await supabase.from("customer_locations").delete().eq("id", locId);
    if (companyId) loadLocations(companyId);
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">저장된 배송지</h1>
          <p className="page-desc">자주 쓰는 상차지·하차지를 등록해두면 발주 요청 시 빠르게 참고할 수 있습니다.</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : (
        <div className="card" style={{ padding: 20 }}>
          {["상차지", "하차지"].map((type) => {
            const list = locations.filter((l) => l.location_type === type);
            return (
              <div key={type} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 8, fontWeight: 700 }}>
                  {type}
                </div>
                {list.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>저장된 {type}가 없습니다.</p>
                ) : (
                  list.map((loc) => (
                    <div
                      key={loc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 0",
                        borderBottom: "1px solid var(--border)",
                        fontSize: 13,
                      }}
                    >
                      {editingId === loc.id ? (
                        <input
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleUpdate(loc.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          style={{ flex: 1, fontSize: 13, padding: "5px 8px" }}
                        />
                      ) : (
                        <span
                          style={{ flex: 1, cursor: "pointer" }}
                          onClick={() => {
                            setEditingId(loc.id);
                            setEditingValue(loc.address || "");
                          }}
                        >
                          {loc.address}
                        </span>
                      )}
                      <button
                        className="btn-danger"
                        style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                        onClick={() => handleDelete(loc.id)}
                      >
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>
            );
          })}

          <div style={{ marginTop: 12 }}>
            <select value={newType} onChange={(e) => setNewType(e.target.value)} style={{ width: 100, fontSize: 12.5, marginBottom: 6 }}>
              <option value="상차지">상차지</option>
              <option value="하차지">하차지</option>
            </select>
            <AddressSearch
              label="새 주소"
              className=""
              value={newAddress}
              detailValue={newDetail}
              placeholder="주소검색 또는 직접 입력"
              detailPlaceholder="상세주소 (선택)"
              onChange={(addr, sido, sigungu) => {
                setNewAddress(addr);
                setNewSido(sido);
                setNewSigungu(sigungu);
              }}
              onDetailChange={setNewDetail}
            />
            <button className="btn" type="button" style={{ padding: "6px 14px", fontSize: 12.5, marginTop: 6 }} onClick={handleAdd}>
              추가
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
