"use client";

import { useEffect, useMemo, useState } from "react";
import DateRangeFilter, { DatePreset, getDateRange } from "@/components/DateRangeFilter";
import { formatDate } from "@/components/ApplicationDetailModal";
import PublicQuoteDetailModal, { STATUS_COLORS } from "@/components/PublicQuoteDetailModal";

export default function AdminPublicQuotesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("신규");
  const [period, setPeriod] = useState<DatePreset>("all");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

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

  const periodFiltered = useMemo(() => {
    const { from } = getDateRange(period);
    if (!from) return items;
    return items.filter((i) => new Date(i.created_at) >= new Date(from));
  }, [items, period]);

  const filtered = periodFiltered.filter((i) => filter === "전체" || i.status === filter);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">공개 견적문의</h1>
          <p className="page-desc">
            랜딩페이지(비회원)를 통해 접수된 문의입니다. 행을 클릭하면 상세 정보와 답변 작성을
            할 수 있습니다.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["신규", "연락완료", "종료", "전체"].map((s) => (
            <button
              key={s}
              className={filter === s ? "btn" : "btn btn-ghost"}
              style={{ fontSize: 12.5, padding: "7px 12px" }}
              onClick={() => setFilter(s)}
            >
              {s} ({s === "전체" ? periodFiltered.length : periodFiltered.filter((i) => i.status === s).length})
            </button>
          ))}
        </div>
        <DateRangeFilter value={period} onChange={setPeriod} />
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">해당하는 문의가 없습니다.</div>
        ) : (
          <>
            <table className="desktop-only">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>접수일</th>
                  <th>문의자</th>
                  <th>연락처</th>
                  <th>구간</th>
                  <th style={{ width: 80 }}>상태</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => setSelectedItem(r)} style={{ cursor: "pointer" }}>
                    <td className="cell-nowrap">
                      <span className="num">{r.created_at ? formatDate(r.created_at) : "-"}</span>
                    </td>
                    <td className="cell-nowrap" style={{ fontWeight: 700 }}>{r.name}</td>
                    <td className="cell-nowrap">
                      <span className="num">{r.phone}</span>
                    </td>
                    <td style={{ whiteSpace: "normal" }}>
                      <div>{r.origin || "-"}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>→ {r.destination || "-"}</div>
                    </td>
                    <td className="cell-nowrap">
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background: (STATUS_COLORS[r.status] || {}).bg,
                          color: (STATUS_COLORS[r.status] || {}).text,
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="cell-nowrap">
                      <button
                        className="btn-ghost"
                        style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11.5, minWidth: 78, cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(r);
                        }}
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-only">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="mobile-row-card"
                  onClick={() => setSelectedItem(r)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="mobile-row-top">
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: (STATUS_COLORS[r.status] || {}).bg,
                        color: (STATUS_COLORS[r.status] || {}).text,
                      }}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">연락처</span>
                    <span className="num">{r.phone}</span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">구간</span>
                    <span>{r.origin || "-"} → {r.destination || "-"}</span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">접수일</span>
                    <span className="num">{r.created_at ? formatDate(r.created_at) : "-"}</span>
                  </div>
                  <button
                    className="btn-ghost"
                    style={{ marginTop: 8, padding: "6px 14px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(r);
                    }}
                  >
                    상세보기
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedItem && (
        <PublicQuoteDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onChanged={loadItems}
        />
      )}
    </main>
  );
}
