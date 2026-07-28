"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentStaffRole } from "@/lib/currentStaff";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";

type NetworkRow = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR");
}

export default function ExternalNetworksPage() {
  const [items, setItems] = useState<NetworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("external_networks")
      .select("id,name,is_active,sort_order,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/external-networks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "추가에 실패했습니다.");
        setAdding(false);
        return;
      }
      setNewName("");
      load();
    } catch {
      setActionError("추가 중 오류가 발생했습니다.");
    }
    setAdding(false);
  }

  function startEdit(item: NetworkRow) {
    setEditingId(item.id);
    setEditName(item.name);
    setActionError(null);
  }

  async function handleSaveName(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/external-networks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_name", id, name: editName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "이름 수정에 실패했습니다.");
        setSaving(false);
        return;
      }
      setEditingId(null);
      load();
    } catch {
      setActionError("이름 수정 중 오류가 발생했습니다.");
    }
    setSaving(false);
  }

  async function handleToggleActive(item: NetworkRow) {
    const next = !item.is_active;
    const confirmed = window.confirm(
      next
        ? `"${item.name}"을(를) 다시 사용중으로 되돌리시겠습니까?`
        : `"${item.name}"을(를) 사용중지 처리하시겠습니까? 목록에서 숨겨지지만 과거 배차 기록엔 영향이 없습니다.`
    );
    if (!confirmed) return;
    setTogglingId(item.id);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/external-networks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_active", id: item.id, is_active: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "상태 변경에 실패했습니다.");
        setTogglingId(null);
        return;
      }
      load();
    } catch {
      setActionError("상태 변경 중 오류가 발생했습니다.");
    }
    setTogglingId(null);
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">외부 정보망 관리</h1>
          <p className="page-desc">
            전국24시콜·원콜·화물맨 같은 외부 화물정보망 목록입니다. 배차 등록 시 배정방식으로
            선택할 수 있습니다.
          </p>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}
      {actionError && <div className="error-box">{actionError}</div>}

      {isAdmin && (
        <div className="card" style={{ padding: 20, marginBottom: 20, maxWidth: 480 }}>
          <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>새 정보망 추가</h3>
          <form onSubmit={handleAdd} onKeyDown={handleFormKeyDown} style={{ display: "flex", gap: 8 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="예: 전국24시콜"
              style={{ flex: 1 }}
            />
            <button className="btn" type="submit" disabled={adding}>
              {adding ? "추가 중..." : "추가"}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">등록된 외부 정보망이 없습니다.</div>
        ) : (
          <table className="desktop-only">
            <thead>
              <tr>
                <th>이름</th>
                <th>상태</th>
                <th>등록일</th>
                {isAdmin && <th>관리</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {editingId === item.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveName(item.id);
                          }
                        }}
                        style={{ maxWidth: 200 }}
                        autoFocus
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{ opacity: item.is_active ? 1 : 0.6 }}>
                      {item.is_active ? "사용중" : "사용중지"}
                    </span>
                  </td>
                  <td>
                    <span className="num" style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {formatDate(item.created_at)}
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {editingId === item.id ? (
                          <>
                            <button className="btn" style={{ padding: "5px 10px", fontSize: 12.5 }} onClick={() => handleSaveName(item.id)} disabled={saving}>
                              저장
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: "5px 10px", fontSize: 12.5 }}
                              onClick={() => setEditingId(null)}
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 12.5 }} onClick={() => startEdit(item)}>
                              이름수정
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: "5px 10px", fontSize: 12.5 }}
                              onClick={() => handleToggleActive(item)}
                              disabled={togglingId === item.id}
                            >
                              {item.is_active ? "사용중지" : "재사용"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && items.length > 0 && (
          <div className="mobile-only">
            {items.map((item) => (
              <div key={item.id} className="mobile-row-card">
                <div className="mobile-row-top">
                  {editingId === item.id ? (
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ flex: 1 }} autoFocus />
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</span>
                  )}
                  <span className="badge" style={{ opacity: item.is_active ? 1 : 0.6 }}>
                    {item.is_active ? "사용중" : "사용중지"}
                  </span>
                </div>
                <div className="mobile-row-line">
                  <span className="mobile-row-label">등록일</span>
                  <span className="num">{formatDate(item.created_at)}</span>
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {editingId === item.id ? (
                      <>
                        <button className="btn" style={{ padding: "5px 10px", fontSize: 12.5 }} onClick={() => handleSaveName(item.id)} disabled={saving}>
                          저장
                        </button>
                        <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 12.5 }} onClick={() => setEditingId(null)}>
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 12.5 }} onClick={() => startEdit(item)}>
                          이름수정
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "5px 10px", fontSize: 12.5 }}
                          onClick={() => handleToggleActive(item)}
                          disabled={togglingId === item.id}
                        >
                          {item.is_active ? "사용중지" : "재사용"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
