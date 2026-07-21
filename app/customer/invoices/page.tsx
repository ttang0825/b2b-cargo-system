"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { getExportPeriodFrom, exportRowsToExcel, ExportPeriod } from "@/lib/exportExcel";

const PERIOD_LABELS: Record<ExportPeriod, string> = {
  week: "이번 주",
  month: "이번 달",
  year: "올해",
  all: "전체",
};

function won(n: number | null) {
  if (!n) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>("month");

  async function load() {
    const { data } = await supabase
      .from("invoices")
      .select(
        "id,billing_period,customer_charge_total,tax_invoice_issued,payment_received,status,created_at,orders(order_no)"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    setInvoices(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("customer_invoices_list")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleExport() {
    setExporting(true);
    const from = getExportPeriodFrom(exportPeriod);
    let query = supabase
      .from("invoices")
      .select(
        "billing_period,customer_charge_total,tax_invoice_issued,payment_received,status,created_at,orders(order_no)"
      )
      .order("created_at", { ascending: false })
      .limit(2000);
    if (from) query = query.gte("created_at", from);

    const { data } = await query;
    setExporting(false);

    const rows = (data || []).map((i: any) => ({
      오더번호: i.orders?.order_no || "",
      정산월: i.billing_period || "",
      청구금액: i.customer_charge_total || 0,
      세금계산서: i.tax_invoice_issued ? "발행완료" : "미발행",
      입금여부: i.payment_received ? "완료" : "대기",
      상태: i.status || "",
    }));

    if (rows.length === 0) {
      alert("선택하신 기간에 다운로드할 정산내역이 없습니다.");
      return;
    }
    exportRowsToExcel(`정산내역_${PERIOD_LABELS[exportPeriod]}.xlsx`, "정산내역", rows);
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">정산·세금계산서 확인</h1>
          <p className="page-desc">
            청구 내역과 세금계산서 발행 여부를 확인하세요. 실제 세금계산서 서류는 별도
            안내드립니다.
          </p>
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
        ) : invoices.length === 0 ? (
          <div className="empty-state">정산 내역이 없습니다.</div>
        ) : (
          <>
            <table className="desktop-only" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>오더번호</th>
                  <th>정산월</th>
                  <th>청구금액</th>
                  <th>세금계산서</th>
                  <th>입금</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="cell-nowrap">
                      <span className="num">{i.orders?.order_no || "-"}</span>
                    </td>
                    <td className="cell-nowrap">
                      <span className="num">{i.billing_period || "-"}</span>
                    </td>
                    <td className="cell-nowrap">
                      <span className="num">{won(i.customer_charge_total)}</span>
                    </td>
                    <td className="cell-nowrap">{i.tax_invoice_issued ? "발행완료" : "미발행"}</td>
                    <td className="cell-nowrap">{i.payment_received ? "완료" : "대기"}</td>
                    <td className="cell-nowrap">{i.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-only">
              {invoices.map((i) => (
                <div key={i.id} className="mobile-row-card">
                  <div className="mobile-row-top">
                    <span className="num" style={{ fontSize: 13, fontWeight: 700 }}>
                      {i.orders?.order_no || "-"}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      {i.status}
                    </span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">정산월</span>
                    <span className="num">{i.billing_period || "-"}</span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">청구금액</span>
                    <span className="num">{won(i.customer_charge_total)}</span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">세금계산서</span>
                    <span>{i.tax_invoice_issued ? "발행완료" : "미발행"}</span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">입금</span>
                    <span>{i.payment_received ? "완료" : "대기"}</span>
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
