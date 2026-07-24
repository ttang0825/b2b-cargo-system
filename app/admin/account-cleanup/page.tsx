"use client";

import { useState } from "react";

type LookupResult = {
  found: boolean;
  auth_user_id?: string;
  email?: string;
  created_at?: string;
  linkedCompanyName?: string | null;
  isOrphan?: boolean;
};

export default function AccountCleanupPage() {
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSearching(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/lookup-auth-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "조회에 실패했습니다.");
        return;
      }
      setResult(data);
    } catch {
      setError("조회 중 오류가 발생했습니다.");
    }
    setSearching(false);
  }

  async function handleDelete() {
    if (!result?.auth_user_id) return;
    if (
      !window.confirm(
        `"${result.email}" 계정을 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
      )
    )
      return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/delete-portal-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth_user_id: result.auth_user_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "삭제에 실패했습니다.");
        setDeleting(false);
        return;
      }
      setResult(null);
      setEmail("");
    } catch {
      setError("삭제 중 오류가 발생했습니다.");
    }
    setDeleting(false);
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">포털 계정 정리</h1>
          <p className="page-desc">
            이메일로 로그인(Auth) 계정을 직접 검색해서 확인·삭제합니다. 주로 예전에 업체를
            삭제하면서 미처 지워지지 않고 남은 계정(고아 계정) 때문에 같은 이메일로 재가입이
            막힐 때 사용합니다.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 20, maxWidth: 520 }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="확인할 이메일 입력"
            style={{ flex: 1 }}
          />
          <button className="btn" type="submit" disabled={searching}>
            {searching ? "검색 중..." : "검색"}
          </button>
        </form>

        {error && (
          <div className="error-box" style={{ marginTop: 14 }}>
            {error}
          </div>
        )}

        {result && !result.found && (
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--text-muted)" }}>
            이 이메일로 등록된 계정이 없습니다.
          </div>
        )}

        {result && result.found && (
          <div className="card" style={{ marginTop: 14, padding: 16, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13.5, marginBottom: 6 }}>
              이메일: <span className="num">{result.email}</span>
            </div>
            <div style={{ fontSize: 13.5, marginBottom: 6 }}>
              가입일:{" "}
              <span className="num">
                {result.created_at ? new Date(result.created_at).toLocaleString("ko-KR") : "-"}
              </span>
            </div>
            <div style={{ fontSize: 13.5, marginBottom: 12 }}>
              연결된 업체:{" "}
              {result.linkedCompanyName ? (
                result.linkedCompanyName
              ) : (
                <span style={{ color: "var(--danger)", fontWeight: 600 }}>
                  없음 (고아 계정 — 삭제해도 안전합니다)
                </span>
              )}
            </div>
            <button
              className="btn-danger"
              style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "삭제 중..." : "이 계정 완전 삭제"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
