"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";

function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function PortalStatsPage() {
  const [rows, setRows] = useState<{ period: string; count: number; total: number }[]>([]);
  const [pending, setPending] = useState({ count: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("invoices")
        .select("billing_period,customer_charge_total,payment_received")
        .order("billing_period", { ascending: true });

      const map: Record<string, { period: string; count: number; total: number }> = {};
      let pendingCount = 0;
      let pendingTotal = 0;

      (data || []).forEach((r: any) => {
        if (!r.payment_received) {
          pendingCount += 1;
          pendingTotal += r.customer_charge_total || 0;
          return; // 입금 확인 전 금액은 월별 실적 집계에서 제외
        }
        const key = r.billing_period || "미지정";
        if (!map[key]) map[key] = { period: key, count: 0, total: 0 };
        map[key].count += 1;
        map[key].total += r.customer_charge_total || 0;
      });

      setRows(Object.values(map));
      setPending({ count: pendingCount, total: pendingTotal });
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
          <p className="page-desc">화주 입금이 확인된 정산 건만 실적으로 집계합니다.</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : rows.length === 0 && pending.count === 0 ? (
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
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>입금 확정 누적금액</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{won(totalAll)}</div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>입금 확정 건수</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{countAll}건</div>
            </div>
            {pending.count > 0 && (
              <div className="card" style={{ padding: 20, background: "var(--accent-soft)", border: "none" }}>
                <div style={{ fontSize: 12.5, color: "var(--accent)", fontWeight: 700 }}>정산대기 중</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>
                  {pending.count}건 · {won(pending.total)}
                </div>
              </div>
            )}
          </div>

          {rows.length > 0 && (
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
          )}
        </>
      )}
    </main>
  );
}
