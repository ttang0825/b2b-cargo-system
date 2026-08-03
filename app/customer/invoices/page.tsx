"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import MixableBadge from "@/components/MixableBadge";
import { getSettlementDisplayLabel, getPaymentConditionLabel } from "@/lib/settlementLabels";
import { PORTAL_INVOICE_FIELDS, PORTAL_DISPATCH_EXTRA_CHARGE_FIELDS } from "@/lib/portalInvoiceFields";
import { getDispatchExtraChargeCategoryLabel } from "@/lib/dispatchExtraCharges";
import { useListSearchSort, sortIndicator } from "@/lib/useListSearchSort";
import DateRangeFilter, { DatePreset, getDateRange } from "@/components/DateRangeFilter";
import { calcInclusiveAmount } from "@/lib/vat";

function won(n: number | null) {
  if (!n) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function wonVatIncluded(n: number | null) {
  if (!n) return null;
  return calcInclusiveAmount(n).toLocaleString("ko-KR") + "원";
}

// admin 정산관리 목록(SettlementBadgeLabel)과 동일한 줄바꿈 처리 — "/"가
// 있는 라벨("선착불 / 수수료 월정산")만 "/" 뒤에서 한 번 줄바꿈. 주선수수료
// 금액/지급자·정보망 정산방식은 애초에 조회하지 않으므로(PORTAL_INVOICE_FIELDS,
// 작업지시서 4-6) 여기 표시될 수 없음
function SettlementBadgeLabel({
  collectionMethod,
  billingCycle,
  directCollectionPoint,
}: {
  collectionMethod: string | null | undefined;
  billingCycle: string | null | undefined;
  directCollectionPoint: string | null | undefined;
}) {
  const label = getSettlementDisplayLabel(collectionMethod, billingCycle);
  const condition = getPaymentConditionLabel(directCollectionPoint);
  const slashIdx = label.indexOf("/");
  const labelNode =
    slashIdx === -1 ? (
      <>{label}</>
    ) : (
      <>
        {label.slice(0, slashIdx + 1)}
        <br />
        {label.slice(slashIdx + 1)}
      </>
    );
  return (
    <>
      {labelNode}
      {condition && (
        <>
          <br />
          {condition}
        </>
      )}
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
  const [period, setPeriod] = useState<DatePreset>("all");
  // 로드맵③ addendum(2-5 변경) — 현장 추가비 항목별 내역(화주 청구액만,
  // driver_payout_amount는 DB 권한 자체가 없어 애초에 안 내려옴).
  // admin 목록과 동일하게, 한 오더에 invoice가 2개(정정청구 포함) 이상일
  // 수 있어 "가장 최근 invoice"에만 아직 안 얼려진(트레일링) 추가비를 붙임
  const [extraChargesByInvoiceId, setExtraChargesByInvoiceId] = useState<Record<string, any[]>>({});
  const [correctionInvoiceIds, setCorrectionInvoiceIds] = useState<Set<string>>(new Set());
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(new Set());

  const periodFiltered = useMemo(() => {
    const { from } = getDateRange(period);
    if (!from) return invoices;
    return invoices.filter((i) => i.created_at && i.created_at >= from);
  }, [invoices, period]);

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
    periodFiltered,
    (i) => [i.orders?.order_no, i.billing_period, i.status],
    {
      created_at: (i) => i.created_at,
      billing_period: (i) => i.billing_period,
      customer_charge_total: (i) => i.customer_charge_total,
      status: (i) => i.status,
      settlement_type: (i) => getSettlementDisplayLabel(i.collection_method, i.billing_cycle),
    },
    "created_at",
    "desc"
  );

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("invoices")
        .select(PORTAL_INVOICE_FIELDS)
        .order("created_at", { ascending: false })
        .limit(100);
      const rows = data || [];
      setInvoices(rows);
      await loadExtraCharges(rows);
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

  // 로드맵③ addendum(2-5 변경) — 현장 추가비를 표시 시점에 조회. admin
  // 목록(app/admin/invoices/page.tsx)의 loadExtraChargeInfo와 동일한 로직을
  // 화주포털 안전 필드(PORTAL_DISPATCH_EXTRA_CHARGE_FIELDS)로 재구현
  async function loadExtraCharges(invoiceRows: any[]) {
    const orderIds = Array.from(new Set(invoiceRows.map((i) => i.order_id).filter(Boolean)));
    if (orderIds.length === 0) {
      setExtraChargesByInvoiceId({});
      setCorrectionInvoiceIds(new Set());
      return;
    }
    const { data: dispatchRows } = await supabase
      .from("dispatches")
      .select("id,order_id")
      .in("order_id", orderIds);
    const dispatchIdByOrderId: Record<string, string> = {};
    (dispatchRows || []).forEach((d: any) => {
      if (d.order_id) dispatchIdByOrderId[d.order_id] = d.id;
    });
    const dispatchIds = Object.values(dispatchIdByOrderId);
    if (dispatchIds.length === 0) {
      setExtraChargesByInvoiceId({});
      setCorrectionInvoiceIds(new Set());
      return;
    }

    const { data: extraRows } = await supabase
      .from("dispatch_extra_charges")
      .select(PORTAL_DISPATCH_EXTRA_CHARGE_FIELDS)
      .in("dispatch_id", dispatchIds);
    // RLS가 이미 status='active'만 내려주지만(취소 이력은 화주포털에서
    // 제외, 확정 결정사항), 프론트에서도 한 번 더 걸러 안전하게 처리
    const activeExtras = (extraRows || []).filter((e: any) => e.status === "active");

    const correctionIds = new Set<string>();
    activeExtras.forEach((e: any) => {
      if (e.correction_invoice_id) correctionIds.add(e.correction_invoice_id);
    });
    setCorrectionInvoiceIds(correctionIds);

    const orderIdByDispatchId: Record<string, string> = {};
    Object.entries(dispatchIdByOrderId).forEach(([orderId, dispatchId]) => {
      orderIdByDispatchId[dispatchId] = orderId;
    });

    const latestByOrderId: Record<string, any> = {};
    invoiceRows.forEach((r) => {
      if (!r.order_id) return;
      const cur = latestByOrderId[r.order_id];
      if (!cur || new Date(r.created_at) > new Date(cur.created_at)) latestByOrderId[r.order_id] = r;
    });

    const info: Record<string, any[]> = {};
    activeExtras.forEach((e: any) => {
      if (e.correction_invoice_id) return; // 이미 별도 정정청구 invoice로 반영됨
      const orderId = orderIdByDispatchId[e.dispatch_id];
      if (!orderId) return;
      const invoice = latestByOrderId[orderId];
      if (!invoice) return;
      if (new Date(e.created_at) <= new Date(invoice.created_at)) return; // 이미 최초 스냅샷에 포함됨
      if (!info[invoice.id]) info[invoice.id] = [];
      info[invoice.id].push(e);
    });
    setExtraChargesByInvoiceId(info);
  }

  function toggleExpanded(invoiceId: string) {
    setExpandedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  }

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
        <div style={{ marginBottom: 10 }}>
          <DateRangeFilter value={period} onChange={setPeriod} />
        </div>
      )}

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
            <option value="status:asc">상태순</option>
            <option value="settlement_type:asc">정산방식순</option>
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
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("status")}>
                    상태{sortIndicator(sortKey, "status", sortDir)}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("settlement_type")}>
                    정산방식{sortIndicator(sortKey, "settlement_type", sortDir)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleInvoices.map((i) => {
                  const extras = extraChargesByInvoiceId[i.id] || [];
                  const extraTotal = extras.reduce((s, e) => s + (e.customer_charge_amount || 0), 0);
                  const expanded = expandedInvoiceIds.has(i.id);
                  return (
                    <Fragment key={i.id}>
                      <tr>
                        <td className="cell-nowrap">
                          <span className="num">{i.orders?.order_no || "-"}</span>
                          {i.orders?.loading_type === "mixable" && (
                            <div style={{ marginTop: 4 }}>
                              <MixableBadge />
                            </div>
                          )}
                          {correctionInvoiceIds.has(i.id) && (
                            <div style={{ marginTop: 4 }}>
                              <span className="badge" style={{ fontSize: 11 }}>
                                현장추가비 정정청구
                              </span>
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
                          {extras.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(i.id)}
                              className="btn btn-ghost"
                              style={{ fontSize: 10.5, padding: "2px 6px", marginTop: 4 }}
                            >
                              현장 추가비 +{extras.length}건 ({won(extraTotal)}) {expanded ? "▲" : "▼"}
                            </button>
                          )}
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
                            <SettlementBadgeLabel
                            collectionMethod={i.collection_method}
                            billingCycle={i.billing_cycle}
                            directCollectionPoint={i.direct_collection_point}
                          />
                          </span>
                        </td>
                      </tr>
                      {expanded && extras.length > 0 && (
                        <tr>
                          <td colSpan={9} style={{ background: "var(--bg)" }}>
                            <table style={{ margin: 0 }}>
                              <thead>
                                <tr>
                                  <th>항목</th>
                                  <th>금액</th>
                                  <th>메모</th>
                                  <th>등록일</th>
                                </tr>
                              </thead>
                              <tbody>
                                {extras.map((e) => (
                                  <tr key={e.id}>
                                    <td>{getDispatchExtraChargeCategoryLabel(e.category)}</td>
                                    <td>{won(e.customer_charge_amount)}</td>
                                    <td>{e.note || "-"}</td>
                                    <td>{formatDate(e.created_at)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            <div className="mobile-only">
              {visibleInvoices.map((i) => {
                const extras = extraChargesByInvoiceId[i.id] || [];
                const extraTotal = extras.reduce((s, e) => s + (e.customer_charge_amount || 0), 0);
                const expanded = expandedInvoiceIds.has(i.id);
                return (
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
                  {correctionInvoiceIds.has(i.id) && (
                    <div style={{ marginBottom: 6 }}>
                      <span className="badge" style={{ fontSize: 11 }}>
                        현장추가비 정정청구
                      </span>
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
                    <span>
                      {getSettlementDisplayLabel(i.collection_method, i.billing_cycle)}
                      {getPaymentConditionLabel(i.direct_collection_point) && (
                        <> · {getPaymentConditionLabel(i.direct_collection_point)}</>
                      )}
                    </span>
                  </div>
                  {extras.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(i.id)}
                        className="btn btn-ghost"
                        style={{ fontSize: 11.5, padding: "4px 8px" }}
                      >
                        현장 추가비 +{extras.length}건 ({won(extraTotal)}) {expanded ? "▲" : "▼"}
                      </button>
                      {expanded && (
                        <div style={{ marginTop: 6 }}>
                          {extras.map((e) => (
                            <div key={e.id} className="mobile-row-line">
                              <span className="mobile-row-label">
                                {getDispatchExtraChargeCategoryLabel(e.category)}
                              </span>
                              <span className="num">{won(e.customer_charge_amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
