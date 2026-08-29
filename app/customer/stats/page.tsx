"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { exportMultiSheetExcel, buildExportFilename } from "@/lib/exportExcel";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legalInfo";
import Pv2DatePicker from "@/components/pv2/Pv2DatePicker";
import Pv2Select from "@/components/pv2/Pv2Select";

/**
 * 🔴 조회 하한은 서비스 시행일이 속한 달이다 — 그 전에는 이 시스템으로 처리한
 *    운송 자체가 없어서 빈 달만 늘어난다. 날짜를 하드코딩하지 말 것
 *    (`lib/legalInfo.ts` 의 `LEGAL_EFFECTIVE_DATE` 가 정본이다).
 */
const MIN_MONTH = LEGAL_EFFECTIVE_DATE.slice(0, 7);
const MIN_DATE = `${MIN_MONTH}-01`;

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

function shortMonth(month: string, showYear: boolean) {
  const [y, m] = month.split("-");
  return `${showYear ? `'${y.slice(2)} ` : ""}${Number(m)}월`;
}

function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function manwon(n: number) {
  return `${Math.round(n / 10000).toLocaleString("ko-KR")}만`;
}

function addMonths(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const abs = y * 12 + (m - 1) + delta;
  return `${Math.floor(abs / 12)}-${String((abs % 12) + 1).padStart(2, "0")}`;
}

function monthsBetween(from: string, to: string) {
  const out: string[] = [];
  let cur = from;
  // 넉넉한 상한 — 무한 루프 방지
  for (let i = 0; i < 240 && cur <= to; i += 1) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

/** 도착지 문자열에서 시·도만 뽑는다. 「경기 성남시 …」 → 「경기」 */
function regionOf(address: string | null | undefined) {
  if (!address) return null;
  const first = address.trim().split(/\s+/)[0];
  if (!first) return null;
  return first.replace(/(특별시|광역시|특별자치시|특별자치도)$/, "");
}

/** 하차지 이름 — 시·군·구까지만(전체 주소는 카드에서 줄이 넘친다) */
function dropSpotOf(address: string | null | undefined) {
  if (!address) return null;
  const parts = address.trim().split(/\s+/);
  if (parts.length === 0) return null;
  return parts.slice(0, Math.min(3, parts.length)).join(" ");
}

const PRESETS = [
  { key: "this", label: "이번 달" },
  { key: "last", label: "지난달" },
  { key: "m3", label: "최근 3개월" },
  { key: "m6", label: "최근 6개월" },
  { key: "m12", label: "최근 12개월" },
  { key: "all", label: "전체" },
] as const;
type PresetKey = (typeof PRESETS)[number]["key"];

export default function PortalStatsPage() {
  const [companyName, setCompanyName] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const [fromDate, setFromDate] = useState(`${addMonths(thisMonth, -5) < MIN_MONTH ? MIN_MONTH : addMonths(thisMonth, -5)}-01`);
  const [toDate, setToDate] = useState(`${thisMonth}-28`);
  const [preset, setPreset] = useState<PresetKey | null>("m6");

  function applyPreset(key: PresetKey) {
    setPreset(key);
    const end = `${thisMonth}-28`;
    if (key === "this") {
      setFromDate(`${thisMonth}-01`);
      setToDate(end);
      return;
    }
    if (key === "last") {
      const prev = addMonths(thisMonth, -1);
      setFromDate(`${prev}-01`);
      setToDate(`${prev}-28`);
      return;
    }
    if (key === "all") {
      setFromDate(MIN_DATE);
      setToDate(end);
      return;
    }
    const back = key === "m3" ? 2 : key === "m6" ? 5 : 11;
    const start = addMonths(thisMonth, -back);
    setFromDate(`${start < MIN_MONTH ? MIN_MONTH : start}-01`);
    setToDate(end);
  }

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

      // 🔴 집계 기준은 그대로다 — 입금이 확인된 정산 건만 실적으로 센다.
      //    지역·하차지 집계를 위해 오더 구간을 함께 읽는다.
      const { data, error } = await supabase
        .from("invoices")
        .select(
          "billing_period,customer_charge_total,payment_received,orders(origin,destination)"
        )
        .order("billing_period", { ascending: true })
        .limit(2000);
      if (error) setPageError(error.message);
      else setPageError(null);
      setInvoices(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const fromMonth = fromDate.slice(0, 7);
  const toMonth = toDate.slice(0, 7);

  const stats = useMemo(() => {
    const paid = invoices.filter(
      (i) =>
        i.payment_received &&
        i.billing_period &&
        i.billing_period >= fromMonth &&
        i.billing_period <= toMonth
    );

    const months = monthsBetween(fromMonth < MIN_MONTH ? MIN_MONTH : fromMonth, toMonth);
    const byMonth: Record<string, { total: number; count: number }> = {};
    months.forEach((m) => {
      byMonth[m] = { total: 0, count: 0 };
    });
    const byRegion: Record<string, number> = {};
    const byDrop: Record<string, { total: number; count: number }> = {};

    paid.forEach((i) => {
      const amount = i.customer_charge_total || 0;
      if (byMonth[i.billing_period]) {
        byMonth[i.billing_period].total += amount;
        byMonth[i.billing_period].count += 1;
      }
      const region = regionOf(i.orders?.destination);
      if (region) byRegion[region] = (byRegion[region] || 0) + amount;
      const spot = dropSpotOf(i.orders?.destination);
      if (spot) {
        if (!byDrop[spot]) byDrop[spot] = { total: 0, count: 0 };
        byDrop[spot].total += amount;
        byDrop[spot].count += 1;
      }
    });

    const monthRows = months.map((m) => ({ month: m, ...byMonth[m] }));
    const total = monthRows.reduce((s, r) => s + r.total, 0);
    const count = monthRows.reduce((s, r) => s + r.count, 0);
    const max = Math.max(1, ...monthRows.map((r) => r.total));
    const nonZero = monthRows.filter((r) => r.total > 0);
    const avgMonth = nonZero.length ? nonZero.reduce((s, r) => s + r.total, 0) / nonZero.length : 0;

    const regionTotal = Object.values(byRegion).reduce((s, v) => s + v, 0) || 1;
    const regions = Object.entries(byRegion)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, amount], i) => ({
        label,
        amount,
        share: Math.round((amount / regionTotal) * 100),
        barBg: i === 0 ? "#1A1A1A" : "#FFD833",
      }));

    const dropTotal = Object.values(byDrop).reduce((s, v) => s + v.total, 0) || 1;
    const drops = Object.entries(byDrop)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 4)
      .map(([name, v], i) => ({
        name,
        count: v.count,
        amount: v.total,
        share: Math.round((v.total / dropTotal) * 100),
        barBg: i === 0 ? "#1A1A1A" : "#FFD833",
        rankBg: i === 0 ? "#1A1A1A" : "#F4F3EF",
        rankColor: i === 0 ? "#FFD833" : "#6B6759",
      }));

    return { monthRows, total, count, max, avgMonth, regions, drops, empty: total === 0 };
  }, [invoices, fromMonth, toMonth]);

  const showYear = useMemo(
    () => new Set(stats.monthRows.map((r) => r.month.slice(0, 4))).size > 1,
    [stats.monthRows]
  );

  async function handleExport() {
    setExporting(true);
    const fromIso = `${fromMonth}-01`;
    const [dispatchRes, invoiceRes] = await Promise.all([
      supabase
        .from("dispatches")
        .select("dispatch_status,created_at,orders(order_no,origin,destination,requested_pickup_at)")
        .gte("created_at", fromIso)
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("invoices")
        .select(
          "billing_period,customer_charge_total,tax_invoice_issued,tax_invoice_date,payment_received,payment_received_date,status,created_at,orders(order_no)"
        )
        .gte("billing_period", fromMonth)
        .lte("billing_period", toMonth)
        .order("billing_period", { ascending: false })
        .limit(2000),
    ]);
    setExporting(false);

    const dispatchRows = (dispatchRes.data || []).map((d: any) => ({
      오더번호: d.orders?.order_no || "",
      출발지: d.orders?.origin || "",
      도착지: d.orders?.destination || "",
      상차예정일시: d.orders?.requested_pickup_at
        ? new Date(d.orders.requested_pickup_at).toLocaleString("ko-KR")
        : "",
      배차상태: d.dispatch_status || "",
    }));

    const invoiceRows = (invoiceRes.data || []).map((i: any) => ({
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

    const filename = buildExportFilename(
      companyName,
      "운송정산내역",
      fromMonth === toMonth ? monthLabel(fromMonth) : `${monthLabel(fromMonth)}~${monthLabel(toMonth)}`
    );

    exportMultiSheetExcel(filename, [
      { name: "운송내역", rows: dispatchRows.length > 0 ? dispatchRows : [{ 안내: "해당 기간 운송내역 없음" }] },
      { name: "정산내역", rows: invoiceRows.length > 0 ? invoiceRows : [{ 안내: "해당 기간 정산내역 없음" }] },
    ]);
  }

  const monthOptions = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    let cur = MIN_MONTH;
    for (let i = 0; i < 240 && cur <= thisMonth; i += 1) {
      out.push({ value: `${cur}-01`, label: monthLabel(cur) });
      cur = addMonths(cur, 1);
    }
    return out.reverse();
  }, [thisMonth]);

  const gridRatios = [1, 0.75, 0.5, 0.25];

  return (
    <main className="container">
      <div className="pv2-shead">
        <div>
          <h1 className="pv2-page-title">월별 통계</h1>
          <p className="pv2-page-desc">
            입금이 확인된 정산 건만 실적으로 집계합니다. {monthLabel(MIN_MONTH)} 이후의 이력을 볼 수 있습니다.
          </p>
        </div>
        {/* 🔴 「PDF 전체 다운로드」를 만들지 말 것(사용자 확정 12번) — 엑셀 하나뿐이다. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="pv2-sbtn" onClick={handleExport} disabled={exporting}>
            {exporting ? "내려받는 중..." : "엑셀 다운로드"}
          </button>
        </div>
      </div>

      <div className="pv2-srange">
        <span className="pv2-srange-label">조회 기간</span>
        {/* 🔴 달력은 26차 `Pv2DatePicker` 를 그대로 쓴다 — 새로 만들지 말 것(원칙 57번) */}
        <div className="pv2-sonly-desktop">
          <Pv2DatePicker
            value={fromDate}
            onChange={(v) => {
              setFromDate(v);
              setPreset(null);
            }}
            min={MIN_DATE}
            max={toDate}
            ariaLabel="조회 시작일"
            wrapStyle={{ width: "auto" }}
          />
          <span className="pv2-srange-tilde">~</span>
          <Pv2DatePicker
            value={toDate}
            onChange={(v) => {
              setToDate(v);
              setPreset(null);
            }}
            min={fromDate}
            ariaLabel="조회 종료일"
            wrapStyle={{ width: "auto" }}
          />
        </div>
        {/* 🔴 모바일은 달력이 아니라 드롭다운이다(시안) */}
        <div className="pv2-sonly-mobile">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Pv2Select
              value={`${fromMonth}-01`}
              onChange={(v) => {
                setFromDate(v);
                setPreset(null);
              }}
              options={monthOptions}
              ariaLabel="조회 시작월"
              wrapStyle={{ flex: "none", width: 128 }}
            />
            <span className="pv2-srange-tilde">~</span>
            <Pv2Select
              value={`${toMonth}-01`}
              onChange={(v) => {
                setToDate(v);
                setPreset(null);
              }}
              options={monthOptions}
              ariaLabel="조회 종료월"
              wrapStyle={{ flex: "none", width: 128 }}
            />
          </div>
        </div>
        <div className="pv2-spresets">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`pv2-spreset${preset === p.key ? " pv2-spreset-on" : ""}`}
              onClick={() => applyPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {pageError && (
        <div className="pv2-alert pv2-alert-error" style={{ marginBottom: 14 }}>
          {pageError}
        </div>
      )}

      {loading ? (
        <div className="pv2-empty">불러오는 중...</div>
      ) : (
        <>
          <div className="pv2-isum">
            <div className="pv2-isum-card">
              <div className="pv2-isum-label">운송비 합계</div>
              <div className="pv2-isum-value">
                {Math.round(stats.total).toLocaleString("ko-KR")}
                <span className="pv2-isum-unit"> 원</span>
              </div>
            </div>
            <div className="pv2-isum-card">
              <div className="pv2-isum-label">운송 건수</div>
              <div className="pv2-isum-value">
                {stats.count.toLocaleString("ko-KR")}
                <span className="pv2-isum-unit"> 건</span>
              </div>
            </div>
            <div className="pv2-isum-card">
              <div className="pv2-isum-label">평균 건당 운임</div>
              <div className="pv2-isum-value">
                {Math.round(stats.count ? stats.total / stats.count : 0).toLocaleString("ko-KR")}
                <span className="pv2-isum-unit"> 원</span>
              </div>
            </div>
          </div>

          <div className="pv2-scard">
            <div className="pv2-scard-head">
              <span className="pv2-scard-title">월별 운송비</span>
              <span className="pv2-scard-sub">
                {fromMonth === toMonth
                  ? monthLabel(fromMonth)
                  : `${monthLabel(fromMonth)} ~ ${monthLabel(toMonth)}`}
              </span>
            </div>
            {stats.empty ? (
              <div className="pv2-empty">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/portal/wecarry-eng-cropped.svg"
                  alt=""
                  className="pv2-empty-logo"
                  style={{ width: 106 }}
                />
                <div className="pv2-empty-title">이 기간에는 집계된 실적이 없습니다</div>
                <div className="pv2-empty-desc">
                  입금이 확인된 정산 건이 생기면 월별 그래프가 표시됩니다.
                </div>
              </div>
            ) : (
              <div className="pv2-sgraph">
                <div className="pv2-syaxis">
                  {gridRatios.map((r) => (
                    <span key={r} style={{ bottom: `${r * 100}%` }}>
                      {manwon(stats.max * r)}
                    </span>
                  ))}
                  <span style={{ bottom: 0 }}>0</span>
                </div>
                <div className="pv2-splotwrap">
                  <div className="pv2-splot">
                    {gridRatios.map((r) => (
                      <span key={r} className="pv2-sgrid" style={{ bottom: `${r * 100}%` }} />
                    ))}
                    {stats.avgMonth > 0 && (
                      <>
                        <span
                          className="pv2-savg"
                          style={{ bottom: `${Math.round((stats.avgMonth / stats.max) * 100)}%` }}
                        />
                        <span
                          className="pv2-savg-label"
                          style={{ bottom: `${Math.round((stats.avgMonth / stats.max) * 100)}%` }}
                        >
                          평균 {manwon(stats.avgMonth)}
                        </span>
                      </>
                    )}
                    <div className="pv2-sbars">
                      {stats.monthRows.map((r) => {
                        const isMax = r.total === stats.max && r.total > 0;
                        return (
                          <div key={r.month} className="pv2-sbarcol">
                            <span
                              className="pv2-sbarval"
                              style={{
                                color: r.total === 0 ? "#BAB9B6" : "#1A1A1A",
                                fontWeight: isMax ? 800 : 600,
                              }}
                            >
                              {r.total === 0 ? "—" : manwon(r.total)}
                            </span>
                            <div
                              className="pv2-sbar"
                              style={{
                                height: r.total === 0 ? 2 : `${Math.max(Math.round((r.total / stats.max) * 100), 3)}%`,
                                background: r.total === 0 ? "#EBEAE7" : isMax ? "#1A1A1A" : "#FFD833",
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="pv2-sxaxis">
                    {stats.monthRows.map((r) => (
                      <div key={r.month} className="pv2-sxcol">
                        <span className="pv2-sxmonth">{shortMonth(r.month, showYear)}</span>
                        <span className="pv2-sxcount">{r.count}건</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pv2-sgrid2">
            <div className="pv2-scard" style={{ marginBottom: 0 }}>
              <div className="pv2-scard-head" style={{ marginBottom: 18 }}>
                <span className="pv2-scard-title">지역별 운송비</span>
                <span className="pv2-scard-sub">도착지 기준</span>
              </div>
              {stats.regions.length === 0 ? (
                <div className="pv2-sempty-line">집계된 지역이 없습니다</div>
              ) : (
                stats.regions.map((r) => (
                  <div key={r.label} className="pv2-srow">
                    <div className="pv2-srow-top">
                      <span className="pv2-srow-name">{r.label}</span>
                      <span className="pv2-srow-share">{r.share}%</span>
                      <span className="pv2-srow-amt num">{won(r.amount)}</span>
                    </div>
                    <div className="pv2-sbartrack">
                      <div className="pv2-sbarfill" style={{ width: `${r.share}%`, background: r.barBg }} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pv2-scard" style={{ marginBottom: 0 }}>
              <div className="pv2-scard-head" style={{ marginBottom: 18 }}>
                <span className="pv2-scard-title">하차지별 운송현황</span>
                <span className="pv2-scard-sub">운송비 상위 4곳</span>
              </div>
              {stats.drops.length === 0 ? (
                <div className="pv2-sempty-line">집계된 하차지가 없습니다</div>
              ) : (
                stats.drops.map((d, i) => (
                  <div key={d.name} className="pv2-srow">
                    <div className="pv2-srow-top" style={{ gap: 10 }}>
                      <span
                        className="pv2-srank"
                        style={{ background: d.rankBg, color: d.rankColor }}
                      >
                        {i + 1}
                      </span>
                      <span className="pv2-sdropname">{d.name}</span>
                      <span className="pv2-srow-share">
                        {d.count}건 · {d.share}%
                      </span>
                      <span className="pv2-srow-amt num">{won(d.amount)}</span>
                    </div>
                    <div className="pv2-sbartrack pv2-sdropbar">
                      <div className="pv2-sbarfill" style={{ width: `${d.share}%`, background: d.barBg }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
