"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPhoneNumber } from "@/lib/constants";

const QUOTE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  신규: { bg: "#fff1e2", text: "#d9730d" },
  연락완료: { bg: "#e6f7ec", text: "#1b9c57" },
  종료: { bg: "#f2f4f6", text: "#8b95a1" },
};
const APPLY_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  검토중: { bg: "#fff1e2", text: "#d9730d" },
  승인됨: { bg: "#e6f7ec", text: "#1b9c57" },
  거절: { bg: "#fdecec", text: "#e5484d" },
  보류: { bg: "#f2f4f6", text: "#8b95a1" },
};

export default function StatusPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      setError("연락처를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/status-lookup", {
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
      setQuotes(data.quotes || []);
      setApplications(data.applications || []);
      setSearched(true);
    } catch {
      setError("조회 중 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  const hasNothing = searched && quotes.length === 0 && applications.length === 0;

  return (
    <div className="portal-theme">
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="container" style={{ padding: "18px 24px" }}>
          <Link href="/" className="brand" style={{ fontSize: 17, textDecoration: "none" }}>
            WeCarry 운송
          </Link>
        </div>
      </header>

      <main className="container" style={{ maxWidth: 640, paddingTop: 40 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">문의·신청 현황 조회</h1>
            <p className="page-desc">
              견적문의 또는 화주 등록신청 시 입력하신 연락처로 진행 상황을 한 번에 확인하실 수
              있습니다.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              placeholder="문의·신청 시 입력한 연락처"
              style={{ flex: 1 }}
              autoFocus
            />
            <button className="btn" type="submit" disabled={loading} style={{ flexShrink: 0 }}>
              {loading ? "조회 중..." : "조회"}
            </button>
          </form>
          {error && <div className="error-box" style={{ marginTop: 14, marginBottom: 0 }}>{error}</div>}
        </div>

        {searched && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {hasNothing && (
              <div className="card">
                <div className="empty-state">이 연락처로 등록된 문의·신청 내역을 찾을 수 없습니다.</div>
              </div>
            )}

            {applications.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>화주 등록 신청</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {applications.map((r) => (
                    <div key={r.id} className="card" style={{ padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{r.company_name}</span>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: (APPLY_STATUS_COLORS[r.status] || {}).bg,
                            color: (APPLY_STATUS_COLORS[r.status] || {}).text,
                          }}
                        >
                          {r.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                        신청일: <span className="num">{new Date(r.created_at).toLocaleDateString("ko-KR")}</span>
                      </div>
                      {r.staff_note && (
                        <div style={{ marginTop: 10, padding: 12, background: "var(--accent-soft)", borderRadius: 8, fontSize: 13 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>담당자 안내</div>
                          {r.staff_note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {quotes.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>견적 문의</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {quotes.map((r) => (
                    <div key={r.id} className="card" style={{ padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                            background: (QUOTE_STATUS_COLORS[r.status] || {}).bg,
                            color: (QUOTE_STATUS_COLORS[r.status] || {}).text,
                          }}
                        >
                          {r.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                        접수일: <span className="num">{new Date(r.created_at).toLocaleDateString("ko-KR")}</span>
                      </div>
                      {r.staff_note && (
                        <div style={{ marginTop: 10, padding: 12, background: "var(--accent-soft)", borderRadius: 8, fontSize: 13 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>담당자 안내</div>
                          {r.staff_note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--text-muted)", margin: "24px 0 60px" }}>
          <Link href="/quote" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            새 견적 문의
          </Link>
          {"  ·  "}
          <Link href="/apply" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            화주 등록 신청
          </Link>
        </p>
      </main>
    </div>
  );
}
