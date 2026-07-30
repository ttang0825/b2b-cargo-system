"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import MixableBadge from "@/components/MixableBadge";
import { getSettlementTypeLabel } from "@/lib/constants";
import { useListSearchSort, sortIndicator } from "@/lib/useListSearchSort";

function won(n: number | null) {
  if (!n) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function wonVatIncluded(n: number | null) {
  if (!n) return null;
  return Math.round(n * 1.1).toLocaleString("ko-KR") + "원";
}

// admin 정산관리 목록(SettlementBadgeLabel)과 동일한 줄바꿈 처리 — "/"가
// 있는 라벨("일반오더/주선사정산")만 "/" 뒤에서 한 번 줄바꿈
function SettlementBadgeLabel({ value }: { value: string | null | undefined }) {
  const label = getSettlementTypeLabel(value);
  const slashIdx = label.indexOf("/");
  if (slashIdx === -1) return <>{label}</>;
  return (
    <>
      {label.slice(0, slashIdx + 1)}
      <br />
      {label.slice(slashIdx + 1)}
    </>
  );
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR");
}

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    search,
    setSearch,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    toggleSort,
    result: visibleInvoices,
  } = useListSearchSort(
    invoices,
    (i) => [i.orders?.order_no, i.billing_period, i.status],
    {
      created_at: (i) => i.created_at,
      billing_period: (i) => i.billing_period,
      customer_charge_total: (i) => i.customer_charge_total,
    },
    "created_at",
    "desc"
  );

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("invoices")
        .select(
          "id,billing_period,customer_charge_total,tax_invoice_issued,tax_invoice_date,payment_received,payment_received_date,status,settlement_type,created_at,orders(order_no,loading_type)"
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
            <Link href="/customer/stats" style={{ textDecoration: "underline" }}>
              월별 통계
            </Link>{" "}
            페이지를 이용해주세요.
          </p>
        </div>
      </div>

      {invoices.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <input
            type="text"
            placeholder="오더번호·정산월·상태 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180, fontSize: 13, padding: "8px 12px" }}
          />
          <select
            className="mobile-only"
            value={`${sortKey}:${sortDir}`}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(":");
              setSortKey(key);
              setSortDir(dir as "asc" | "desc");
            }}
            style={{ fontSize: 13, padding: "8px 12px" }}
          >
            <option value="created_at:desc">최신 등록순</option>
            <option value="billing_period:desc">정산월 최신순</option>
            <option value="billing_period:asc">정산월 오래된순</option>
            <option value="customer_charge_total:desc">청구금액 높은순</option>
            <option value="customer_charge_total:asc">청구금액 낮은순</option>
          </select>
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">정산 내역이 없습니다.</div>
        ) : visibleInvoices.length === 0 ? (
          <div className="empty-state">검색 결과가 없습니다.</div>
        ) : (
          <>
            <table className="desktop-only" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>오더번호</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("billing_period")}>
                    정산월{sortIndicator(sortKey, "billing_period", sortDir)}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("customer_charge_total")}>
                    청구금액{sortIndicator(sortKey, "customer_charge_total", sortDir)}
                  </th>
                  <th>세금계산서</th>
                  <th>발행일</th>
                  <th>입금</th>
                  <th>입금일</th>
                  <th>상태</th>
                  <th>정산방식</th>
                </tr>
              </thead>
              <tbody>
                {visibleInvoices.map((i) => (
                  <tr key={i.id}>
                    <td className="cell-nowrap">
                      <span className="num">{i.orders?.order_no || "-"}</span>
                      {i.orders?.loading_type === "mixable" && (
                        <div style={{ marginTop: 4 }}>
                          <MixableBadge />
                        </div>
                      )}
                    </td>
                    <td className="cell-nowrap">
                      <span className="num">{i.billing_period || "-"}</span>
                    </td>
                    <td className="cell-nowrap">
                      <span className="num">{won(i.customer_charge_total)}</span>
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                        부가세 별도
                        {wonVatIncluded(i.customer_charge_total) && (
                          <> (부가세 포함 {wonVatIncluded(i.customer_charge_total)})</>
                        )}
                      </div>
                    </td>
                    <td className="cell-nowrap">{i.tax_invoice_issued ? "발행완료" : "미발행"}</td>
                    <td className="cell-nowrap">
                      <span className="num">{formatDate(i.tax_invoice_date)}</span>
                    </td>
                    <td className="cell-nowrap">{i.payment_received ? "완료" : "대기"}</td>
                    <td className="cell-nowrap">
                      <span className="num">{formatDate(i.payment_received_date)}</span>
                    </td>
                    <td className="cell-nowrap">{i.status}</td>
                    <td>
                      <span
                        className="badge"
                        style={{ display: "inline-block", textAlign: "center", lineHeight: 1.5 }}
                      >
                        <SettlementBadgeLabel value={i.settlement_type} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-only">
              {visibleInvoices.map((i) => (
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
                  {i.orders?.loading_type === "mixable" && (
                    <div style={{ marginBottom: 6 }}>
                      <MixableBadge />
                    </div>
                  )}
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">정산월</span>
                    <span className="num">{i.billing_period || "-"}</span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">청구금액</span>
                    <span className="num">
                      {won(i.customer_charge_total)}
                      {wonVatIncluded(i.customer_charge_total) && (
                        <span style={{ fontSize: 10.5, color: "var(--text-muted)", marginLeft: 4 }}>
                          (부가세 별도, 포함 {wonVatIncluded(i.customer_charge_total)})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">세금계산서</span>
                    <span>
                      {i.tax_invoice_issued ? `발행완료 (${formatDate(i.tax_invoice_date)})` : "미발행"}
                    </span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">입금</span>
                    <span>{i.payment_received ? `완료 (${formatDate(i.payment_received_date)})` : "대기"}</span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">정산방식</span>
                    <span>{getSettlementTypeLabel(i.settlement_type)}</span>
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
