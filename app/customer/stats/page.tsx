"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";

function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function PortalStatsPage() {
  const [rows, setRows] = useState<{ period: string; count: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("invoices")
        .select("billing_period,customer_charge_total")
        .order("billing_period", { ascending: true });

      const map: Record<string, { period: string; count: number; total: number }> = {};
      (data || []).forEach((r: any) => {
        const key = r.billing_period || "미지정";
        if (!map[key]) map[key] = { period: key, count: 0, total: 0 };
        map[key].count += 1;
        map[key].total += r.customer_charge_total || 0;
      });
      setRows(Object.values(map));
      setLoading(false);
    }
    load();
  }, []);

  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const totalAll = rows.reduce((sum, r) => sum + r.total, 0);
  const countAll = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">월별 운송 통계</h1>
          <p className="page-desc">정산 등록된 건 기준입니다.</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">아직 통계로 보여드릴 정산 내역이 없습니다.</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>전체 누적 청구금액</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{won(totalAll)}</div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>전체 정산 건수</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{countAll}건</div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            {rows.map((r) => (
              <div key={r.period} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div className="num" style={{ width: 70, fontSize: 12.5, color: "var(--text-muted)" }}>
                  {r.period}
                </div>
                <div style={{ flex: 1, background: "var(--bg)", borderRadius: 8, overflow: "hidden", height: 26 }}>
                  <div
                    style={{
                      width: `${(r.total / maxTotal) * 100}%`,
                      background: "var(--accent)",
                      height: "100%",
                      borderRadius: 8,
                      minWidth: r.total > 0 ? 4 : 0,
                    }}
                  />
                </div>
                <div className="num" style={{ width: 120, textAlign: "right", fontSize: 13 }}>
                  {won(r.total)}
                </div>
                <div style={{ width: 46, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                  {r.count}건
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
