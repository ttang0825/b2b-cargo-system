"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPhoneNumber } from "@/lib/constants";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  신규: { bg: "#fff1e2", text: "#d9730d" },
  연락완료: { bg: "#e6f7ec", text: "#1b9c57" },
  종료: { bg: "#f2f4f6", text: "#8b95a1" },
};

export default function QuoteStatusPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      setError("연락처를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public-quote-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "조회에 실패했습니다.");
        setLoading(false);
        return;
      }
      setResults(data.data || []);
      setSearched(true);
    } catch {
      setError("조회 중 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  return (
    <div className="portal-theme">
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="container" style={{ padding: "18px 24px" }}>
          <Link href="/" className="brand" style={{ fontSize: 17, textDecoration: "none" }}>
            EGG 운송
          </Link>
        </div>
      </header>

      <main className="container" style={{ maxWidth: 640, paddingTop: 40 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">내 문의 조회</h1>
            <p className="page-desc">문의하실 때 입력하신 연락처로 진행 상황을 확인하실 수 있습니다.</p>
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              placeholder="문의하실 때 입력한 연락처"
              style={{ flex: 1 }}
            />
            <button className="btn" type="submit" disabled={loading} style={{ flexShrink: 0 }}>
              {loading ? "조회 중..." : "조회"}
            </button>
          </form>
          {error && <div className="error-box" style={{ marginTop: 14, marginBottom: 0 }}>{error}</div>}
        </div>

        {searched && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {results.length === 0 ? (
              <div className="card">
                <div className="empty-state">이 연락처로 등록된 문의를 찾을 수 없습니다.</div>
              </div>
            ) : (
              results.map((r) => (
                <div key={r.id} className="card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      {r.origin} → {r.destination}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        background: (STATUS_COLORS[r.status] || {}).bg,
                        color: (STATUS_COLORS[r.status] || {}).text,
                      }}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 4 }}>
                    접수일: <span className="num">{new Date(r.created_at).toLocaleDateString("ko-KR")}</span>
                    {r.vehicle_type && <> · 희망차량: {r.vehicle_type}</>}
                  </div>
                  {r.notes && <div style={{ fontSize: 13, marginTop: 8 }}>{r.notes}</div>}
                  {r.staff_note && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 12,
                        background: "var(--accent-soft)",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
                        담당자 안내
                      </div>
                      {r.staff_note}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--text-muted)", margin: "24px 0 60px" }}>
          <Link href="/quote" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            새 견적 문의하기
          </Link>
        </p>
      </main>
    </div>
  );
}
