"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";

function won(n: number | null) {
  if (!n) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    load();

    const channel = supabase
      .channel("customer_invoices_list")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">정산·세금계산서 확인</h1>
          <p className="page-desc">
            청구 내역과 세금계산서 발행 여부를 확인하세요. 엑셀로 내려받으시려면{" "}
            <a href="/customer/stats" style={{ textDecoration: "underline" }}>
              월별 통계
            </a>{" "}
            페이지를 이용해주세요.
          </p>
        </div>
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
