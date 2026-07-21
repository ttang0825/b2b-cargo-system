"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { getExportPeriodFrom, exportMultiSheetExcel, buildExportFilename, ExportPeriod } from "@/lib/exportExcel";

const PERIOD_LABELS: Record<ExportPeriod, string> = {
  week: "이번 주",
  month: "이번 달",
  year: "올해",
  all: "전체",
};

function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

// 파일명에 쓸, 상황에 맞는 날짜 표기 (이번달→"2026년 7월", 이번주→"2026년 7월 3째주" 등)
function getFileDateLabel(period: ExportPeriod) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (period === "all") return "전체기간";
  if (period === "year") return `${year}년`;
  if (period === "month") return `${year}년 ${month}월`;
  if (period === "week") {
    const firstWeekday = new Date(year, now.getMonth(), 1).getDay();
    const weekOfMonth = Math.ceil((now.getDate() + firstWeekday) / 7);
    return `${year}년 ${month}월 ${weekOfMonth}째주`;
  }
  return "";
}

export default function PortalStatsPage() {
  const [companyName, setCompanyName] = useState("");
  const [rows, setRows] = useState<{ period: string; count: number; total: number }[]>([]);
  const [pending, setPending] = useState({ count: 0, total: 0 });
  const [topRoutes, setTopRoutes] = useState<{ route: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>("month");

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data: account } = await supabase
          .from("customer_accounts")
          .select("companies(name)")
          .eq("auth_user_id", session.user.id)
          .single();
        setCompanyName((account?.companies as any)?.name || "");
      }

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
          return;
        }
        const key = r.billing_period || "미지정";
        if (!map[key]) map[key] = { period: key, count: 0, total: 0 };
        map[key].count += 1;
        map[key].total += r.customer_charge_total || 0;
      });

      setRows(Object.values(map));
      setPending({ count: pendingCount, total: pendingTotal });

      // 자주 이용하는 구간 TOP 3
      const { data: orderRows } = await supabase
        .from("orders")
        .select("origin,destination")
        .limit(500);
      const routeCount: Record<string, number> = {};
      (orderRows || []).forEach((o: any) => {
        if (!o.origin || !o.destination) return;
        const key = `${o.origin} → ${o.destination}`;
        routeCount[key] = (routeCount[key] || 0) + 1;
      });
      const sortedRoutes = Object.entries(routeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([route, count]) => ({ route, count }));
      setTopRoutes(sortedRoutes);

      setLoading(false);
    }
    load();
  }, []);

  async function handleExport() {
    setExporting(true);
    const from = getExportPeriodFrom(exportPeriod);

    let dispatchQuery = supabase
      .from("dispatches")
      .select("dispatch_status,created_at,orders(order_no,origin,destination,requested_pickup_at)")
      .order("created_at", { ascending: false })
      .limit(2000);
    let invoiceQuery = supabase
      .from("invoices")
      .select(
        "billing_period,customer_charge_total,tax_invoice_issued,tax_invoice_date,payment_received,payment_received_date,status,created_at,orders(order_no)"
      )
      .order("created_at", { ascending: false })
      .limit(2000);
    if (from) {
      dispatchQuery = dispatchQuery.gte("created_at", from);
      invoiceQuery = invoiceQuery.gte("created_at", from);
    }

    const [{ data: dispatchData }, { data: invoiceData }] = await Promise.all([
      dispatchQuery,
      invoiceQuery,
    ]);
    setExporting(false);

    const dispatchRows = (dispatchData || []).map((d: any) => ({
      오더번호: d.orders?.order_no || "",
      출발지: d.orders?.origin || "",
      도착지: d.orders?.destination || "",
      상차예정일시: d.orders?.requested_pickup_at
        ? new Date(d.orders.requested_pickup_at).toLocaleString("ko-KR")
        : "",
      배차상태: d.dispatch_status || "",
    }));

    const invoiceRows = (invoiceData || []).map((i: any) => ({
      오더번호: i.orders?.order_no || "",
      정산월: i.billing_period || "",
      청구금액: i.customer_charge_total || 0,
      세금계산서: i.tax_invoice_issued ? "발행완료" : "미발행",
      세금계산서발행일: i.tax_invoice_date ? new Date(i.tax_invoice_date).toLocaleDateString("ko-KR") : "",
      입금여부: i.payment_received ? "완료" : "대기",
      입금일: i.payment_received_date ? new Date(i.payment_received_date).toLocaleDateString("ko-KR") : "",
      상태: i.status || "",
    }));

    if (dispatchRows.length === 0 && invoiceRows.length === 0) {
      alert("선택하신 기간에 다운로드할 내역이 없습니다.");
      return;
    }

    const filename = buildExportFilename(companyName, "운송정산내역", getFileDateLabel(exportPeriod));

    exportMultiSheetExcel(filename, [
      { name: "운송내역", rows: dispatchRows.length > 0 ? dispatchRows : [{ 안내: "해당 기간 운송내역 없음" }] },
      { name: "정산내역", rows: invoiceRows.length > 0 ? invoiceRows : [{ 안내: "해당 기간 정산내역 없음" }] },
    ]);
  }

  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const totalAll = rows.reduce((sum, r) => sum + r.total, 0);
  const countAll = rows.reduce((sum, r) => sum + r.count, 0);
  const avgUnitPrice = countAll > 0 ? totalAll / countAll : 0;

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">월별 운송 통계</h1>
          <p className="page-desc">화주 입금이 확인된 정산 건만 실적으로 집계합니다.</p>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: 16,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontWeight: 600 }}>
          운송내역 + 정산내역 통합 다운로드
        </span>
        <select
          value={exportPeriod}
          onChange={(e) => setExportPeriod(e.target.value as ExportPeriod)}
          style={{ fontSize: 12.5, padding: "7px 10px" }}
        >
          {(Object.keys(PERIOD_LABELS) as ExportPeriod[]).map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABELS[p]}
            </option>
          ))}
        </select>
        <button className="btn" style={{ fontSize: 12.5, padding: "8px 16px" }} onClick={handleExport} disabled={exporting}>
          {exporting ? "내려받는 중..." : "엑셀 다운로드"}
        </button>
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
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>평균 건당 운임</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{won(avgUnitPrice)}</div>
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
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>월별 추이</div>
              {rows.map((r, idx) => {
                const prev = idx > 0 ? rows[idx - 1] : null;
                const changePct = prev && prev.total > 0 ? Math.round(((r.total - prev.total) / prev.total) * 100) : null;
                return (
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
                    <div className="num" style={{ width: 110, textAlign: "right", fontSize: 13 }}>
                      {won(r.total)}
                    </div>
                    <div style={{ width: 40, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                      {r.count}건
                    </div>
                    <div style={{ width: 50, textAlign: "right", fontSize: 11.5 }}>
                      {changePct !== null && (
                        <span style={{ color: changePct >= 0 ? "#1b9c57" : "#e5484d", fontWeight: 700 }}>
                          {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
                증감률은 바로 이전 달 대비입니다.
              </p>
            </div>
          )}

          {topRoutes.length > 0 && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>자주 이용하는 구간 TOP {topRoutes.length}</div>
              {topRoutes.map((r, idx) => (
                <div
                  key={r.route}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: idx < topRoutes.length - 1 ? "1px solid var(--border)" : "none",
                    fontSize: 13,
                  }}
                >
                  <span>
                    <span className="num" style={{ color: "var(--accent)", fontWeight: 800, marginRight: 8 }}>
                      {idx + 1}
                    </span>
                    {r.route}
                  </span>
                  <span className="num" style={{ color: "var(--text-muted)" }}>{r.count}회</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
