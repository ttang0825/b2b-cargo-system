"use client";

import { useEffect, useState } from "react";

function formatDateTime(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SupportAccessLogsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/support-access-logs");
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
    load();
  }, []);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">지원접속 이력</h1>
          <p className="page-desc">
            관리자만 접근할 수 있는 화면입니다. 직원이 화주포털 계정으로 고객지원용
            접속을 한 기록입니다.
          </p>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">지원접속 기록이 없습니다.</div>
        ) : (
          <>
            <table className="desktop-only">
              <thead>
                <tr>
                  <th>접속일시</th>
                  <th>처리 직원</th>
                  <th>화주</th>
                  <th>계정 이메일</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-nowrap">
                      <span className="num">{formatDateTime(item.accessed_at)}</span>
                    </td>
                    <td className="cell-nowrap">{item.staff_name || "-"}</td>
                    <td className="cell-nowrap">{item.company_name || "-"}</td>
                    <td className="cell-nowrap">{item.customer_email || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-only">
              {items.map((item) => (
                <div key={item.id} className="mobile-row-card">
                  <div className="mobile-row-top">
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{item.company_name || "-"}</span>
                    <span className="num" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      {formatDateTime(item.accessed_at)}
                    </span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">처리 직원</span>
                    <span>{item.staff_name || "-"}</span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">계정 이메일</span>
                    <span>{item.customer_email || "-"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
