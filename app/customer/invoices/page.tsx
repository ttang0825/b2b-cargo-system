"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import MixableBadge from "@/components/MixableBadge";
import {
  getCustomerCollectionMethodLabel,
  getCustomerBillingCycleLabel,
  getPaymentConditionLabel,
  CUSTOMER_COLLECTION_AXIS_LABEL,
  CUSTOMER_BILLING_AXIS_LABEL,
} from "@/lib/settlementLabels";
import { PORTAL_INVOICE_FIELDS, PORTAL_DISPATCH_EXTRA_CHARGE_FIELDS } from "@/lib/portalInvoiceFields";
import { getDispatchExtraChargeCategoryLabel } from "@/lib/dispatchExtraCharges";
import { useListSearchSort, sortIndicator } from "@/lib/useListSearchSort";
import { DatePreset, getDateRange } from "@/components/DateRangeFilter";
import { calcInclusiveAmount } from "@/lib/vat";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";
import Pv2Select from "@/components/pv2/Pv2Select";

const PERIOD_CHIPS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "week", label: "이번주" },
  { value: "month", label: "이번달" },
  { value: "all", label: "전체" },
];

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "최신 등록순" },
  { value: "billing_period:desc", label: "정산월 최신순" },
  { value: "billing_period:asc", label: "정산월 오래된순" },
  { value: "customer_charge_total:desc", label: "청구금액 높은순" },
  { value: "customer_charge_total:asc", label: "청구금액 낮은순" },
  { value: "status:asc", label: "상태순" },
  { value: "settlement_type:asc", label: "정산방식순" },
];

/** 🔴 배지 색 4종 — 시안 실측값(`IC`). 새 색을 만들지 말 것. */
const TAX_BADGE = {
  issued: { label: "발행완료", color: "#1D57C6", bg: "#E8EFFC" },
  pending: { label: "발행예정", color: "#6B6759", bg: "#F4F3EF" },
};
const PAY_BADGE = {
  done: { label: "입금완료", color: "#1A1A1A", bg: "#EBEAE7" },
  waiting: { label: "입금대기", color: "#7A5F00", bg: "#FFF9D6" },
};
/**
 * ⚠️ 배지 색은 **청구 축**에 건다 — 시안이 `월별` 에만 옐로를 준 것과 같다.
 *    「운임 수금방식」 줄은 배지가 아니라 평문이다(축이 둘이라 배지를 둘 다
 *    칠하면 어느 쪽이 강조인지 읽히지 않는다).
 */
const CYCLE_BADGE_COLOR: Record<string, { color: string; bg: string }> = {
  monthly: { color: "#7A5F00", bg: "#FFF9D6" },
  per_order: { color: "#6B6759", bg: "#F4F3EF" },
};

/** 🔴 라벨은 공용 함수에서 온다 — 여기에 「월정산」을 다시 적으면 두 곳이 갈린다. */
function cycleBadge(billingCycle: string | null | undefined) {
  const label = getCustomerBillingCycleLabel(billingCycle);
  const color = CYCLE_BADGE_COLOR[billingCycle || ""] || CYCLE_BADGE_COLOR.per_order;
  return { label, ...color };
}

function won(n: number | null) {
  if (!n) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function wonNum(n: number | null) {
  return Math.round(n || 0).toLocaleString("ko-KR");
}

function wonVatIncluded(n: number | null) {
  if (!n) return null;
  return calcInclusiveAmount(n).toLocaleString("ko-KR") + "원";
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR");
}

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
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
      settlement_type: (i) => getCustomerCollectionMethodLabel(i.collection_method),
    },
    "created_at",
    "desc"
  );

  /**
   * 요약 카드 3개. 🔴 「이번 달」은 `billing_period`(YYYY-MM) 기준이다 —
   * `created_at` 으로 세면 지난달 정산월 건이 이번 달에 등록됐다는 이유로
   * 이번 달 청구금액에 섞인다.
   */
  const summary = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    let monthTotal = 0;
    let unpaidTotal = 0;
    let unpaidCount = 0;
    let taxCount = 0;
    let latestTaxDate: string | null = null;
    invoices.forEach((i) => {
      if (i.billing_period === thisMonth) monthTotal += i.customer_charge_total || 0;
      if (!i.payment_received) {
        unpaidTotal += i.customer_charge_total || 0;
        unpaidCount += 1;
      }
      if (i.tax_invoice_issued) {
        taxCount += 1;
        if (i.tax_invoice_date && (!latestTaxDate || i.tax_invoice_date > latestTaxDate)) {
          latestTaxDate = i.tax_invoice_date;
        }
      }
    });
    return { monthTotal, unpaidTotal, unpaidCount, taxCount, latestTaxDate };
  }, [invoices]);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("invoices")
        .select(PORTAL_INVOICE_FIELDS)
        .order("created_at", { ascending: false })
        .limit(100);
      // 조회 실패를 삼키면 "빈 목록"으로 보여 원인을 짚을 수 없다(원칙 55번)
      if (error) setPageError(error.message);
      else setPageError(null);
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
      <div className="pv2-page-head-tight">
        <h1 className="pv2-page-title">정산·결제내역</h1>
        <p className="pv2-page-desc">청구 내역과 세금계산서 발행·입금 상태를 확인하세요.</p>
      </div>

      <div className="pv2-isum">
        <div className="pv2-isum-card">
          <div className="pv2-isum-label">이번 달 청구금액</div>
          <div className="pv2-isum-value">
            {wonNum(summary.monthTotal)}
            <span className="pv2-isum-unit"> 원</span>
          </div>
          <div className="pv2-isum-sub">
            부가세 별도 · 포함 {wonNum(calcInclusiveAmount(summary.monthTotal))}원
          </div>
        </div>
        <div className="pv2-isum-card">
          <div className="pv2-isum-label">미결제 잔액</div>
          {/* 🔴 미결제 잔액만 값 색이 다르다(시안 `#B4423A`) */}
          <div className="pv2-isum-value" style={{ color: "#B4423A" }}>
            {wonNum(summary.unpaidTotal)}
            <span className="pv2-isum-unit" style={{ color: "#B4423A" }}>
              {" "}
              원
            </span>
          </div>
          <div className="pv2-isum-sub">{summary.unpaidCount}건 입금 대기 중</div>
        </div>
        <div className="pv2-isum-card">
          <div className="pv2-isum-label">세금계산서</div>
          <div className="pv2-isum-value">
            {summary.taxCount}
            <span className="pv2-isum-unit"> 건 발행</span>
          </div>
          <div className="pv2-isum-sub">
            {summary.latestTaxDate ? `최근 발행일 ${formatDate(summary.latestTaxDate)}` : "발행 이력 없음"}
          </div>
        </div>
      </div>

      {/* 🔴 전화번호를 하드코딩하지 말 것 — `lib/contactInfo.ts` 상수다.
          번호가 바뀌면 이 띠·랜딩·푸터가 한 번에 따라온다. */}
      <div className="pv2-inotice">
        <span className="pv2-inotice-badge">월별 정산 안내</span>
        <div className="pv2-inotice-body">
          지금은 <b>건별 정산</b>입니다. 정기 물량 화주님께는 한 달치를 한 번에 처리하는{" "}
          <b>월별(합산) 정산</b>을 안내드립니다. 담당자 또는 <b>{COMPANY_SUPPORT_PHONE}</b>으로 연락
          주세요.
        </div>
      </div>

      <div className="pv2-filter-row">
        <div className="pv2-chipgroup">
          {PERIOD_CHIPS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`pv2-fchip${period === c.value ? " pv2-fchip-on" : ""}`}
              onClick={() => setPeriod(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input
          className="pv2-search"
          type="text"
          placeholder="오더번호 · 정산월 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="정산 검색"
        />
        {/* 🔴 네이티브 select 를 쓰지 않는다(원칙 57번) */}
        <Pv2Select
          wrapStyle={{ flex: "none", width: "auto", minWidth: 168 }}
          value={`${sortKey}:${sortDir}`}
          onChange={(v) => {
            const [key, dir] = v.split(":");
            setSortKey(key);
            setSortDir(dir as "asc" | "desc");
          }}
          ariaLabel="정렬 기준"
          options={SORT_OPTIONS}
        />
      </div>

      {pageError && (
        <div className="pv2-alert pv2-alert-error" style={{ marginBottom: 14 }}>
          {pageError}
        </div>
      )}

      {loading ? (
        <div className="pv2-empty">불러오는 중...</div>
      ) : visibleInvoices.length === 0 ? (
        <div className="pv2-card-empty">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/portal/wecarry-eng-cropped.svg"
            alt=""
            className="pv2-empty-logo"
            style={{ width: 106 }}
          />
          <div className="pv2-card-empty-title">
            {invoices.length === 0 ? "정산 내역이 없습니다" : "조건에 맞는 정산 내역이 없습니다"}
          </div>
          <div className="pv2-card-empty-desc">
            {invoices.length === 0
              ? "운송이 완료되면 청구·세금계산서·입금 내역이 이곳에 표시됩니다."
              : "기간이나 검색어를 바꿔보세요."}
          </div>
        </div>
      ) : (
        <>
          <div className="pv2-itable">
          <div className="pv2-itable-head">
            <span>오더번호</span>
            <button type="button" onClick={() => toggleSort("billing_period")}>
              정산월{sortIndicator(sortKey, "billing_period", sortDir)}
            </button>
            <button type="button" onClick={() => toggleSort("customer_charge_total")}>
              청구금액{sortIndicator(sortKey, "customer_charge_total", sortDir)}
            </button>
            <span>세금계산서</span>
            <span>입금</span>
            <button type="button" onClick={() => toggleSort("settlement_type")}>
              정산방식{sortIndicator(sortKey, "settlement_type", sortDir)}
            </button>
          </div>
          {visibleInvoices.map((i) => {
            const extras = extraChargesByInvoiceId[i.id] || [];
            const extraTotal = extras.reduce((s, e) => s + (e.customer_charge_amount || 0), 0);
            const expanded = expandedInvoiceIds.has(i.id);
            const tax = i.tax_invoice_issued ? TAX_BADGE.issued : TAX_BADGE.pending;
            const pay = i.payment_received ? PAY_BADGE.done : PAY_BADGE.waiting;
            const cycle = cycleBadge(i.billing_cycle);
            const method = getCustomerCollectionMethodLabel(i.collection_method);
            const condition = getPaymentConditionLabel(i.direct_collection_point);
            return (
              <Fragment key={i.id}>
                <div className="pv2-itable-row">
                  <div>
                    <div className="pv2-ino num">{i.orders?.order_no || "-"}</div>
                    <div className="pv2-ibadges" style={{ marginTop: 4 }}>
                      {i.orders?.loading_type === "mixable" && <MixableBadge />}
                      {correctionInvoiceIds.has(i.id) && (
                        <span className="badge" style={{ fontSize: 11 }}>
                          현장추가비 정정청구
                        </span>
                      )}
                      {/* 🔴 진행 상태는 시안 6열에 없지만 지우지 않았다(원칙 42번) —
                          「지연」·「거래중단」·「정산확정」은 세금계산서·입금 배지로는
                          표현되지 않는다. 열을 늘리지 않으려고 오더번호 칸에 뒀다. */}
                      {i.status && (
                        <span className="badge" style={{ fontSize: 11 }}>
                          {i.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pv2-imonth num">{i.billing_period || "-"}</div>
                  <div>
                    <div className="pv2-iamt num">{won(i.customer_charge_total)}</div>
                    <div className="pv2-isubtext">
                      부가세 별도
                      {wonVatIncluded(i.customer_charge_total) && (
                        <> · 포함 {wonVatIncluded(i.customer_charge_total)}</>
                      )}
                    </div>
                    {/* 🔴 현장 추가비 펼치기는 데스크탑·모바일 둘 다 유지한다 */}
                    {extras.length > 0 && (
                      <button type="button" className="pv2-iextra-btn" onClick={() => toggleExpanded(i.id)}>
                        현장 추가비 +{extras.length}건 ({won(extraTotal)}) {expanded ? "▲" : "▼"}
                      </button>
                    )}
                  </div>
                  <div>
                    <span className="pv2-ibadge" style={{ background: tax.bg, color: tax.color }}>
                      {tax.label}
                    </span>
                    <div className="pv2-idate num">
                      {i.tax_invoice_issued ? formatDate(i.tax_invoice_date) : "-"}
                    </div>
                  </div>
                  <div>
                    <span className="pv2-ibadge" style={{ background: pay.bg, color: pay.color }}>
                      {pay.label}
                    </span>
                    <div className="pv2-idate num">
                      {i.payment_received ? formatDate(i.payment_received_date) : "-"}
                    </div>
                  </div>
                  {/* 🔴 정산방식은 「운임 수금방식」 + 「청구」 두 줄이다(P1-1은 커밋⑥). */}
                  {/* 🔴 화주 말 두 줄이다(P1-1) — 윗줄 「운임 수금방식」, 아랫줄
                      「청구」. 배지는 청구 축에만 건다(시안이 `월별`에만 옐로를
                      준 것과 같다). 담당자 말 함수를 여기에 끌어오지 말 것. */}
                  <div className="pv2-isettle">
                    <span className="pv2-isubtext" style={{ marginTop: 0 }}>
                      {CUSTOMER_COLLECTION_AXIS_LABEL} {method || "-"}
                      {condition ? ` · ${condition}` : ""}
                    </span>
                    {cycle.label && (
                      <span className="pv2-ibadge" style={{ background: cycle.bg, color: cycle.color }}>
                        {CUSTOMER_BILLING_AXIS_LABEL} {cycle.label}
                      </span>
                    )}
                  </div>
                </div>
                {expanded && extras.length > 0 && (
                  <div className="pv2-iextra">
                    {extras.map((e) => (
                      <div key={e.id} className="pv2-iextra-line">
                        <b>{getDispatchExtraChargeCategoryLabel(e.category)}</b>
                        <span className="num">{won(e.customer_charge_amount)}</span>
                        <span>{e.note || ""}</span>
                        <span style={{ marginLeft: "auto" }} className="num">
                          {formatDate(e.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Fragment>
            );
          })}
          </div>

          {/* 🔴 모바일은 표가 아니라 카드다(시안) — 데스크탑 grid 와 **별개 JSX**
              이므로 열을 늘리거나 줄일 때 양쪽을 같이 고칠 것(원칙 13번). */}
          <div className="pv2-imlist">
            {visibleInvoices.map((i) => {
              const extras = extraChargesByInvoiceId[i.id] || [];
              const extraTotal = extras.reduce((s, e) => s + (e.customer_charge_amount || 0), 0);
              const expanded = expandedInvoiceIds.has(i.id);
              const tax = i.tax_invoice_issued ? TAX_BADGE.issued : TAX_BADGE.pending;
              const pay = i.payment_received ? PAY_BADGE.done : PAY_BADGE.waiting;
              const cycle = cycleBadge(i.billing_cycle);
              const method = getCustomerCollectionMethodLabel(i.collection_method);
              const condition = getPaymentConditionLabel(i.direct_collection_point);
              return (
                <div key={i.id} className="pv2-imcard">
                  <div className="pv2-imtop">
                    <span className="pv2-imno num">{i.orders?.order_no || "-"}</span>
                    <span className="pv2-immonth num">{i.billing_period || "-"}</span>
                    {i.orders?.loading_type === "mixable" && <MixableBadge />}
                    {correctionInvoiceIds.has(i.id) && (
                      <span className="badge" style={{ fontSize: 11 }}>
                        현장추가비 정정청구
                      </span>
                    )}
                    {i.status && (
                      <span className="badge" style={{ fontSize: 11 }}>
                        {i.status}
                      </span>
                    )}
                  </div>
                  <div className="pv2-imamt-line">
                    <span className="pv2-imamt num">{won(i.customer_charge_total)}</span>
                    <span className="pv2-imvat">
                      부가세 별도
                      {wonVatIncluded(i.customer_charge_total) && (
                        <> · 포함 {wonVatIncluded(i.customer_charge_total)}</>
                      )}
                    </span>
                  </div>
                  <div className="pv2-imbadges">
                    <span className="pv2-ibadge" style={{ background: tax.bg, color: tax.color }}>
                      {tax.label}
                      {i.tax_invoice_issued ? ` ${formatDate(i.tax_invoice_date)}` : ""}
                    </span>
                    <span className="pv2-ibadge" style={{ background: pay.bg, color: pay.color }}>
                      {pay.label}
                      {i.payment_received ? ` ${formatDate(i.payment_received_date)}` : ""}
                    </span>
                    {cycle.label && (
                      <span className="pv2-ibadge" style={{ background: cycle.bg, color: cycle.color }}>
                        {CUSTOMER_BILLING_AXIS_LABEL} {cycle.label}
                      </span>
                    )}
                  </div>
                  <div className="pv2-imvat">
                    {CUSTOMER_COLLECTION_AXIS_LABEL} {method || "-"}
                    {condition ? ` · ${condition}` : ""}
                  </div>
                  {/* 🔴 현장 추가비 펼치기는 모바일에도 유지한다 */}
                  {extras.length > 0 && (
                    <div>
                      <button type="button" className="pv2-iextra-btn" onClick={() => toggleExpanded(i.id)}>
                        현장 추가비 +{extras.length}건 ({won(extraTotal)}) {expanded ? "▲" : "▼"}
                      </button>
                      {expanded && (
                        <div style={{ marginTop: 6 }}>
                          {extras.map((e) => (
                            <div key={e.id} className="pv2-iextra-line">
                              <b>{getDispatchExtraChargeCategoryLabel(e.category)}</b>
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
    </main>
  );
}
