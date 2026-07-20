"use client";

import { useEffect, useState } from "react";

const STATUS_OPTIONS = ["신규", "연락완료", "종료"];
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  신규: { bg: "#fff1e2", text: "#d9730d" },
  연락완료: { bg: "#e6f7ec", text: "#1b9c57" },
  종료: { bg: "var(--bg)", text: "var(--text-muted)" },
};

export default function AdminPublicQuotesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("신규");

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/public-quote-requests");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "불러오기에 실패했습니다.");
        setLoading(false);
        return;
      }
      setItems(data.data || []);
    } catch {
      setError("불러오는 중 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleStatusChange(id: string, status: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    await fetch("/api/admin/public-quote-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "update", status }),
    });
  }

  async function handleWriteNote(id: string, currentNote: string | null) {
    const note = window.prompt("이 문의에 대한 답변/안내를 입력해주세요 (고객이 '내 문의 조회'에서 확인할 수 있습니다)", currentNote || "");
    if (note === null) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, staff_note: note } : i)));
    await fetch("/api/admin/public-quote-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "update", staff_note: note }),
    });
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`"${name}"님의 문의를 삭제하시겠습니까?`)) return;
    const res = await fetch("/api/admin/public-quote-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "delete" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "삭제에 실패했습니다.");
      return;
    }
    loadItems();
  }

  const filtered = items.filter((i) => filter === "전체" || i.status === filter);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">공개 견적문의</h1>
          <p className="page-desc">랜딩페이지(비회원)를 통해 접수된 문의입니다.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["신규", "연락완료", "종료", "전체"].map((s) => (
          <button
            key={s}
            className={filter === s ? "btn" : "btn btn-ghost"}
            style={{ fontSize: 12.5, padding: "7px 12px" }}
            onClick={() => setFilter(s)}
          >
            {s} ({s === "전체" ? items.length : items.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">해당하는 문의가 없습니다.</div>
        ) : (
          <table style={{ minWidth: 920 }}>
            <thead>
              <tr>
                <th>성함/업체명</th>
                <th>연락처</th>
                <th>구간</th>
                <th>차량</th>
                <th>문의내용</th>
                <th>접수일</th>
                <th>상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="cell-nowrap">{r.name}</td>
                  <td className="cell-nowrap">
                    <div className="num">{r.phone}</div>
                    {r.email && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.email}</div>}
                  </td>
                  <td>
                    <div>{r.origin || "-"} → {r.destination || "-"}</div>
                    {(r.origin_company || r.origin_contact) && (
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
                        출발: {[r.origin_company, r.origin_contact, r.origin_department].filter(Boolean).join(" / ")}
                      </div>
                    )}
                    {(r.destination_company || r.destination_contact) && (
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                        도착: {[r.destination_company, r.destination_contact, r.destination_department].filter(Boolean).join(" / ")}
                      </div>
                    )}
                  </td>
                  <td className="cell-nowrap">{r.vehicle_type || "-"}</td>
                  <td style={{ maxWidth: 200 }}>{r.notes || r.item || "-"}</td>
                  <td className="cell-nowrap">
                    <span className="num">{new Date(r.created_at).toLocaleDateString("ko-KR")}</span>
                  </td>
                  <td className="cell-nowrap">
                    <select
                      value={r.status}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "none",
                        fontWeight: 600,
                        background: (STATUS_COLORS[r.status] || {}).bg,
                        color: (STATUS_COLORS[r.status] || {}).text,
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="cell-nowrap">
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                        onClick={() => handleWriteNote(r.id, r.staff_note)}
                      >
                        {r.staff_note ? "답변 수정" : "답변 남기기"}
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                        onClick={() => handleDelete(r.id, r.name)}
                      >
                        삭제
                      </button>
                    </div>
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
