"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { getDispatchStatusColor } from "@/lib/dispatchStatusColors";
import { getExportPeriodFrom, exportRowsToExcel, ExportPeriod } from "@/lib/exportExcel";

const PERIOD_LABELS: Record<ExportPeriod, string> = {
  week: "이번 주",
  month: "이번 달",
  year: "올해",
  all: "전체",
};

export default function CustomerDispatchesPage() {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>("month");

  async function load() {
    const { data } = await supabase
      .from("dispatches")
      .select(
        "id,dispatch_status,created_at,orders(order_no,origin,destination,requested_pickup_at)"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    setDispatches(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("customer_dispatches_list")
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatches" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleExport() {
    setExporting(true);
    const from = getExportPeriodFrom(exportPeriod);
    let query = supabase
      .from("dispatches")
      .select("dispatch_status,created_at,orders(order_no,origin,destination,requested_pickup_at)")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (from) query = query.gte("created_at", from);

    const { data } = await query;
    setExporting(false);

    const rows = (data || []).map((d: any) => ({
      오더번호: d.orders?.order_no || "",
      출발지: d.orders?.origin || "",
      도착지: d.orders?.destination || "",
      상차예정일시: d.orders?.requested_pickup_at
        ? new Date(d.orders.requested_pickup_at).toLocaleString("ko-KR")
        : "",
      배차상태: d.dispatch_status || "",
    }));

    if (rows.length === 0) {
      alert("선택하신 기간에 다운로드할 운송내역이 없습니다.");
      return;
    }
    exportRowsToExcel(`운송내역_${PERIOD_LABELS[exportPeriod]}.xlsx`, "운송내역", rows);
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">배차·운송 조회</h1>
          <p className="page-desc">진행 중인 운송의 실시간 상태를 확인하세요.</p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>엑셀 다운로드 기간</span>
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
        <button
          className="btn-ghost"
          style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? "내려받는 중..." : "엑셀 다운로드"}
        </button>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : dispatches.length === 0 ? (
          <div className="empty-state">진행 중인 운송이 없습니다.</div>
        ) : (
          <>
            <table className="desktop-only" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>오더번호</th>
                  <th>구간</th>
                  <th>상차 예정</th>
                  <th>배차상태</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d) => (
                  <tr key={d.id}>
                    <td className="cell-nowrap">
                      <span className="num">{d.orders?.order_no || "-"}</span>
                    </td>
                    <td>
                      {d.orders?.origin || "-"} → {d.orders?.destination || "-"}
                    </td>
                    <td className="cell-nowrap">
                      <span className="num">
                        {d.orders?.requested_pickup_at
                          ? new Date(d.orders.requested_pickup_at).toLocaleString("ko-KR", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </span>
                    </td>
                    <td className="cell-nowrap">
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background: getDispatchStatusColor(d.dispatch_status).bg,
                          color: getDispatchStatusColor(d.dispatch_status).text,
                        }}
                      >
                        {d.dispatch_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-only">
              {dispatches.map((d) => (
                <div key={d.id} className="mobile-row-card">
                  <div className="mobile-row-top">
                    <span className="num" style={{ fontSize: 13, fontWeight: 700 }}>
                      {d.orders?.order_no || "-"}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: getDispatchStatusColor(d.dispatch_status).bg,
                        color: getDispatchStatusColor(d.dispatch_status).text,
                      }}
                    >
                      {d.dispatch_status}
                    </span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">구간</span>
                    <span>{d.orders?.origin || "-"} → {d.orders?.destination || "-"}</span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">상차 예정</span>
                    <span className="num">
                      {d.orders?.requested_pickup_at
                        ? new Date(d.orders.requested_pickup_at).toLocaleString("ko-KR", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </span>
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
