"use client";

import { useEffect, useMemo, useState } from "react";
// 🔴 원칙 31번 — 앱 내부 경로는 반드시 next/link. <a href> 로 바꾸면 하드 리로드가 된다.
import Link from "next/link";
import { calcMargin } from "@/lib/marginCalc";
import { CLAIM_TYPES, getClaimTypeLabel } from "@/lib/claims";
import { DISPATCH_EXTRA_CHARGE_CATEGORIES, getDispatchExtraChargeCategoryLabel } from "@/lib/dispatchExtraCharges";

type InvoiceRow = {
  id: string;
  order_id: string | null;
  company_id: string | null;
  individual_customer_id: string | null;
  billing_period: string | null;
  customer_charge_total: number | null;
  driver_payout_total: number | null;
  status: string;
  created_at: string;
};

type OrderRow = {
  id: string;
  order_no: string;
  company_id: string | null;
  individual_customer_id: string | null;
  guest_name: string | null;
  created_by: string | null;
  created_at: string;
};

type ClaimRow = {
  claim_type: string;
  status: string;
  claim_amount: number | null;
  compensation_amount: number | null;
  created_at: string;
};

type ExtraChargeStat = { count: number; customerAmount: number; driverAmount: number };

type DashboardApiResponse = {
  invoices: InvoiceRow[];
  orders: OrderRow[];
  claims: ClaimRow[];
  companies: { id: string; name: string }[];
  individualCustomers: { id: string; name: string }[];
  staffAccounts: { id: string; name: string }[];
  extraChargeAttributionByInvoiceId: Record<string, ExtraChargeStat>;
  extraChargeByCategory: Record<string, ExtraChargeStat>;
  // 🔴 `null` 은 「0개」가 아니라 「조회 실패」다 — 빈 배열로 갈음하지 말 것(33차 B장).
  // 🔴 개수는 이 배열의 길이다 — 개수를 따로 받지 말 것(두 값이 조용히 어긋난다).
  recurringContractCompanies:
    | { id: string; name: string; endedOn: string | null }[]
    | null;
  recurringContractError: string | null;
};

function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 정기계약 명단 펼침(33차 B장 리뷰) — 기본은 접힘. 개수만 보고 지나가는 것이
  // 이 카드의 원래 쓰임이고, 명단은 "누구인지" 궁금할 때만 편다.
  const [recurringOpen, setRecurringOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/dashboard-stats");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "대시보드 데이터를 불러오지 못했습니다.");
        setLoading(false);
        return;
      }
      setData(json);
      setLoading(false);
    }
    load();
  }, []);

  // 🔴 35차 C-1 — 마진 정의를 `lib/marginCalc.ts` 하나로 옮겼다(사용자 확정 2026-09-11).
  //
  //    「위캐리가 버는 돈, 부가세 제외」 하나이고, 수금방식이 계산식을 정한다:
  //      주선사정산  마진 = 화주청구(공급가액) − 차주지급(공급가액)
  //      선착불      마진 = 주선수수료 ÷ 1.1   🔴 운임은 매출에도 원가에도 안 잡는다
  //
  //    ⚠️ 그전에는 수금방식과 무관하게 `화주청구 × 1.1 − 차주지급` 이었다 —
  //       선착불에서 **위캐리를 거치지도 않는 운임**을 매출로 세고 있었다.
  //    🔴 다른 두 마진(DB 생성 컬럼 `dispatches.margin` · `settlementCalc` 의 실질마진)을
  //       이 화면에 섞지 말 것(하지말것 5). 실질마진은 `driver_base_fare` 입력이 실측
  //       0건이라 켜면 숫자가 틀린다.
  const marginOf = (inv: any, extraCharge: number, extraPayout: number) =>
    calcMargin({
      collectionMethod: inv.collection_method,
      customerCharge: (inv.customer_charge_total || 0) + extraCharge,
      customerChargeVatIncluded: inv.customer_charge_vat_included,
      driverPayout: (inv.driver_payout_total || 0) + extraPayout,
      driverVatIncluded: inv.driver_vat_included,
      brokerageFee: inv.brokerage_fee,
    });

  // 오더별 취급고·원가·마진(현장 추가비 표시시점 합산 포함) — 담당자별/화주별 섹션이
  // 공통으로 재사용하는 중간 집계.
  // 🔴 `revenue` 는 **매출이 아니라 취급고**다 — 선착불 운임이 섞이므로 화면에
  //    「매출」이라고 적지 말 것.
  const revenueByOrderId = useMemo(() => {
    const map: Record<string, { revenue: number; cost: number; margin: number }> = {};
    if (!data) return map;
    data.invoices.forEach((inv) => {
      if (!inv.order_id) return;
      const attribution = data.extraChargeAttributionByInvoiceId[inv.id];
      const extraCharge = attribution?.customerAmount || 0;
      const extraPayout = attribution?.driverAmount || 0;
      const revenue = (inv.customer_charge_total || 0) + extraCharge;
      const cost = (inv.driver_payout_total || 0) + extraPayout;
      const margin = marginOf(inv, extraCharge, extraPayout);
      const cur = map[inv.order_id] || { revenue: 0, cost: 0, margin: 0 };
      cur.revenue += revenue;
      cur.cost += cost;
      cur.margin += margin;
      map[inv.order_id] = cur;
    });
    return map;
  }, [data]);

  // A. 전사 월별 매출·마진 추이 (billing_period 기준)
  const monthlyRows = useMemo(() => {
    const map: Record<string, { period: string; revenue: number; margin: number; count: number }> = {};
    if (!data) return [];
    data.invoices.forEach((inv) => {
      const attribution = data.extraChargeAttributionByInvoiceId[inv.id];
      const extraCharge = attribution?.customerAmount || 0;
      const extraPayout = attribution?.driverAmount || 0;
      const revenue = (inv.customer_charge_total || 0) + extraCharge;
      const margin = marginOf(inv, extraCharge, extraPayout);
      const key = inv.billing_period || "미지정";
      const cur = map[key] || { period: key, revenue: 0, margin: 0, count: 0 };
      cur.revenue += revenue;
      cur.margin += margin;
      cur.count += 1;
      map[key] = cur;
    });
    return Object.values(map).sort((a, b) => a.period.localeCompare(b.period));
  }, [data]);

  // B. 담당자별 영업 성과 (orders.created_by 기준 — 오더 처리 담당자 기준)
  const staffRows = useMemo(() => {
    if (!data) return [];
    const staffNameById: Record<string, string> = {};
    data.staffAccounts.forEach((s) => {
      staffNameById[s.id] = s.name;
    });
    const map: Record<string, { key: string; name: string; orderCount: number; revenue: number; margin: number }> =
      {};
    data.orders.forEach((o) => {
      const key = o.created_by || "__unassigned__";
      const name = o.created_by ? staffNameById[o.created_by] || "알 수 없음(탈퇴 계정)" : "담당자 미배정";
      const cur = map[key] || { key, name, orderCount: 0, revenue: 0, margin: 0 };
      cur.orderCount += 1;
      const rev = revenueByOrderId[o.id];
      if (rev) {
        cur.revenue += rev.revenue;
        cur.margin += rev.margin;
      }
      map[key] = cur;
    });
    return Object.values(map).sort((a, b) => b.margin - a.margin);
  }, [data, revenueByOrderId]);

  // C. 화주별 수익성 순위 (company/개인고객/게스트 순으로 식별, TOP 10)
  const customerRows = useMemo(() => {
    if (!data) return [];
    const companyNameById: Record<string, string> = {};
    data.companies.forEach((c) => {
      companyNameById[c.id] = c.name;
    });
    const individualNameById: Record<string, string> = {};
    data.individualCustomers.forEach((c) => {
      individualNameById[c.id] = c.name;
    });

    function keyOf(o: OrderRow) {
      if (o.company_id) return `company:${o.company_id}`;
      if (o.individual_customer_id) return `individual:${o.individual_customer_id}`;
      return `guest:${o.guest_name || "이름 미상"}`;
    }
    function nameOf(o: OrderRow) {
      if (o.company_id) return companyNameById[o.company_id] || "(알 수 없는 화주)";
      if (o.individual_customer_id) return individualNameById[o.individual_customer_id] || "(개인고객)";
      return o.guest_name || "게스트(이름 미상)";
    }

    const map: Record<string, { key: string; name: string; orderCount: number; revenue: number; margin: number }> =
      {};
    data.orders.forEach((o) => {
      const key = keyOf(o);
      const name = nameOf(o);
      const cur = map[key] || { key, name, orderCount: 0, revenue: 0, margin: 0 };
      cur.orderCount += 1;
      const rev = revenueByOrderId[o.id];
      if (rev) {
        cur.revenue += rev.revenue;
        cur.margin += rev.margin;
      }
      map[key] = cur;
    });
    return Object.values(map)
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);
  }, [data, revenueByOrderId]);

  // D. 클레임·현장추가비 통계
  const claimStats = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    let totalCount = 0;
    let compensationTotal = 0;
    let compensationCount = 0;
    let claimAmountRefTotal = 0;
    if (data) {
      data.claims.forEach((c) => {
        totalCount += 1;
        typeCounts[c.claim_type] = (typeCounts[c.claim_type] || 0) + 1;
        if (c.status === "처리완료" && c.compensation_amount != null) {
          compensationTotal += c.compensation_amount;
          compensationCount += 1;
        }
        if (c.claim_amount != null) claimAmountRefTotal += c.claim_amount;
      });
    }
    return { typeCounts, totalCount, compensationTotal, compensationCount, claimAmountRefTotal };
  }, [data]);

  const extraChargeCategoryRows = useMemo(() => {
    return DISPATCH_EXTRA_CHARGE_CATEGORIES.map((cat) => ({
      category: cat,
      label: getDispatchExtraChargeCategoryLabel(cat),
      ...(data?.extraChargeByCategory[cat] || { count: 0, customerAmount: 0, driverAmount: 0 }),
    }));
  }, [data]);

  // 🔴 `null`(조회 실패)과 `[]`(0개)를 구분해서 넘긴다 — 합치면 실패가 0개로 읽힌다.
  const recurringList = data?.recurringContractCompanies ?? null;

  // 🔴 35차 C-2 (사용자 13번) — **마진 금액이 주인공**이다. 막대 길이의 기준도
  //    취급고가 아니라 마진으로 바꿨다(그전에는 매출 기준이라, 마진이 작은 큰 건이
  //    가장 길게 그려져 「어느 달이 잘 벌었나」를 읽을 수 없었다).
  const maxMonthlyMargin = Math.max(1, ...monthlyRows.map((r) => Math.abs(r.margin)));
  const totalMargin = monthlyRows.reduce((sum, r) => sum + r.margin, 0);
  const totalVolume = monthlyRows.reduce((sum, r) => sum + r.revenue, 0);
  // 🔴 35차 C-2 — 정렬·막대 기준을 취급고에서 **마진**으로 바꿨다(사용자 13번)
  const maxStaffMargin = Math.max(1, ...staffRows.map((r) => Math.abs(r.margin)));
  const maxCustomerMargin = Math.max(1, ...customerRows.map((r) => Math.abs(r.margin)));

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">운영 대시보드</h1>
          <p className="page-desc">
            최근 12개월 데이터 기준(관리자 전용). 담당자별 영업 성과는 "오더 처리 담당자"(오더 등록·수정 담당자)
            기준이며, 견적 상담·정산 등록 담당자와 다를 수 있습니다.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : (
        <>
          {/* ── 마진 요약 (35차 C-2 · 사용자 13번) ──────────────────────────────────
              🔴 **어느 마진을 쓰는지 화면에 적는다**(완료조건 20) — 이 저장소에는
                 마진이라 불리는 값이 셋 있고, 어느 것인지 안 적으면 아무도 모른다.
              🔴 **취급고는 매출이 아니다** — 선착불 운임은 화주가 차주에게 직접 주는
                 돈이라 위캐리를 거치지 않는다. 그래서 작은 글씨 보조로만 둔다. */}
          <section className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>마진 합계</div>
              <div className="num" style={{ fontSize: 30, fontWeight: 700 }}>
                {totalMargin.toLocaleString()}원
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                취급고(참고) {totalVolume.toLocaleString()}원
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.65 }}>
              <strong>마진 = 위캐리가 버는 돈(부가세 제외)</strong>입니다. 수금방식에 따라 계산이
              다릅니다 — <strong>주선사 정산</strong>은 「화주 청구금액 − 차주 지급금액」,
              <strong>선착불</strong>은 「주선수수료」뿐입니다(운임은 화주가 차주에게 직접 주므로
              위캐리 매출이 아닙니다).
              <br />
              「취급고」는 위캐리를 거쳐 간 운임의 크기이고 <strong>매출이 아닙니다</strong>.
              <br />
              ⚠️ 배차 목록의 「마진·마진율」과 배차 상세의 「실질마진(정산기준)」은 계산이 다른
              별개 값입니다 — 이 화면의 숫자와 맞지 않는 것이 정상입니다.
            </p>
          </section>
          {/* 정기계약 화주 수 (33차 B장)
              🔴 최근 12개월 조회기간과 무관하게 **지금 유효한 계약 전체**를 센다 —
                 이 화면의 다른 지표(매출·마진)와 기간 기준이 다르므로 캡션으로 밝힌다.
              🔴 종료일이 지난 계약은 빠진다(`isRecurringContractActive`) — 「체크는 켜져
                 있는데 안 세어진다」는 의도된 동작이다. */}
          <section
            className="card"
            style={{ padding: 20, marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>정기계약 화주</div>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "2px 0 0" }}>
                현재 유효한 계약 기준(종료일이 지난 계약은 제외) · 조회기간과 무관합니다.
              </p>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              {!recurringList ? (
                <div style={{ fontSize: 13, color: "#e5484d", fontWeight: 700 }}>조회 실패</div>
              ) : recurringList.length === 0 ? (
                // 🔴 0개는 펼칠 것이 없으므로 버튼으로 만들지 않는다(눌러도 아무 일이 없으면
                //    고장으로 읽힌다).
                <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>
                  0개
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRecurringOpen((v) => !v)}
                  aria-expanded={recurringOpen}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    font: "inherit",
                    color: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span className="num" style={{ fontSize: 22, fontWeight: 700 }}>
                    {recurringList.length}개
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {recurringOpen ? "닫기 ▲" : "명단 보기 ▼"}
                  </span>
                </button>
              )}
              {data?.recurringContractError && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {data.recurringContractError}
                </div>
              )}
            </div>
          </section>

          {/* 정기계약 화주 명단 (실사용 리뷰 — "클릭시 명단이 나오면 좋겠다")
              🔴 이름은 `<Link>` 로 화주 상세에 잇는다(원칙 31번) — 명단만 보고 끝나는 게
                 아니라 거기서 바로 계약 내용을 고칠 수 있어야 쓸모가 있다. */}
          {recurringOpen && recurringList && recurringList.length > 0 && (
            <section className="card" style={{ padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>
                정기계약 화주 명단 ({recurringList.length}개)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {recurringList.map((c) => (
                  <Link
                    key={c.id}
                    href={`/admin/companies/${c.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "baseline",
                      gap: 6,
                      padding: "6px 10px",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 12.5,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {c.endedOn ? `~${c.endedOn}` : "기한 없음"}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* A. 전사 월별 매출·마진 추이 */}
          <section className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>전사 월별 마진 추이</div>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 0, marginBottom: 16 }}>
              {/* 🔴 35차 C-2 — 막대는 **마진** 길이다(그전에는 매출이었다). 마진이 작은 큰
                  건이 가장 길게 그려져 「어느 달이 잘 벌었나」를 읽을 수 없었다. */}
              막대 길이는 <strong>마진</strong>입니다. 취급고는 오른쪽에 작게 병기합니다 ·
              현장 추가비는 그 이후 등록된 것까지 표시 시점에 합산합니다.
            </p>
            {monthlyRows.length === 0 ? (
              <div className="empty-state">최근 12개월간 정산 데이터가 없습니다.</div>
            ) : (
              monthlyRows.map((r, idx) => {
                const prev = idx > 0 ? monthlyRows[idx - 1] : null;
                // 🔴 증감률도 마진 기준이다 — 취급고가 늘어도 마진이 줄면 나쁜 달이다
                const changePct =
                  prev && prev.margin > 0 ? Math.round(((r.margin - prev.margin) / prev.margin) * 100) : null;
                return (
                  <div key={r.period} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div className="num" style={{ width: 70, fontSize: 12.5, color: "var(--text-muted)" }}>
                      {r.period}
                    </div>
                    <div style={{ flex: 1, background: "var(--bg)", borderRadius: 8, overflow: "hidden", height: 26 }}>
                      <div
                        style={{
                          width: `${(Math.abs(r.margin) / maxMonthlyMargin) * 100}%`,
                          background: "var(--accent)",
                          height: "100%",
                          borderRadius: 8,
                          minWidth: r.margin !== 0 ? 4 : 0,
                        }}
                      />
                    </div>
                    <div className="num" style={{ width: 120, textAlign: "right", fontSize: 14, fontWeight: 700 }}>
                      {won(r.margin)}
                    </div>
                    <div className="num" style={{ width: 110, textAlign: "right", fontSize: 11.5, color: "var(--text-muted)" }}>
                      취급고 {won(r.revenue)}
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
              })
            )}
          </section>

          {/* B. 담당자별 영업 성과 */}
          <section className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>담당자별 영업 성과</div>
            {staffRows.length === 0 ? (
              <div className="empty-state">최근 12개월간 등록된 오더가 없습니다.</div>
            ) : (
              staffRows.map((r) => (
                <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 110, fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ flex: 1, background: "var(--bg)", borderRadius: 8, overflow: "hidden", height: 26 }}>
                    <div
                      style={{
                        width: `${(Math.abs(r.margin) / maxStaffMargin) * 100}%`,
                        background: "var(--accent)",
                        height: "100%",
                        borderRadius: 8,
                        minWidth: r.margin !== 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  <div className="num" style={{ width: 120, textAlign: "right", fontSize: 14, fontWeight: 700 }}>
                    {won(r.margin)}
                  </div>
                  <div className="num" style={{ width: 110, textAlign: "right", fontSize: 11.5, color: "var(--text-muted)" }}>
                    취급고 {won(r.revenue)}
                  </div>
                  <div style={{ width: 50, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                    {r.orderCount}건
                  </div>
                </div>
              ))
            )}
          </section>

          {/* C. 화주별 수익성 순위 */}
          <section className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>화주별 수익성 순위 (TOP 10)</div>
            {customerRows.length === 0 ? (
              <div className="empty-state">최근 12개월간 등록된 오더가 없습니다.</div>
            ) : (
              customerRows.map((r, idx) => (
                <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div className="num" style={{ width: 24, color: "var(--accent)", fontWeight: 800, fontSize: 13 }}>
                    {idx + 1}
                  </div>
                  <div style={{ width: 130, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </div>
                  <div style={{ flex: 1, background: "var(--bg)", borderRadius: 8, overflow: "hidden", height: 26 }}>
                    <div
                      style={{
                        width: `${(Math.abs(r.margin) / maxCustomerMargin) * 100}%`,
                        background: "var(--accent)",
                        height: "100%",
                        borderRadius: 8,
                        minWidth: r.margin !== 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  <div className="num" style={{ width: 120, textAlign: "right", fontSize: 14, fontWeight: 700 }}>
                    {won(r.margin)}
                  </div>
                  <div className="num" style={{ width: 110, textAlign: "right", fontSize: 11.5, color: "var(--text-muted)" }}>
                    취급고 {won(r.revenue)}
                  </div>
                  <div style={{ width: 50, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                    {r.orderCount}건
                  </div>
                </div>
              ))
            )}
          </section>

          {/* D. 클레임·현장추가비 통계 */}
          <section className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>클레임·현장추가비 통계</div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>클레임·사고</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>전체 클레임 건수</div>
                  <div className="num" style={{ fontSize: 18, fontWeight: 800 }}>{claimStats.totalCount}건</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    확정 배상액 합계 (처리완료 기준, {claimStats.compensationCount}건)
                  </div>
                  <div className="num" style={{ fontSize: 18, fontWeight: 800 }}>{won(claimStats.compensationTotal)}</div>
                </div>
                <div className="card" style={{ padding: 16, background: "var(--bg)" }}>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>청구액 합계 (참고, 상태 무관)</div>
                  <div className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)" }}>
                    {won(claimStats.claimAmountRefTotal)}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5 }}>
                {CLAIM_TYPES.map((t) => (
                  <span key={t}>
                    {getClaimTypeLabel(t)} {claimStats.typeCounts[t] || 0}건
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>현장 추가비 (카테고리별)</div>
              {extraChargeCategoryRows.map((r) => (
                <div
                  key={r.category}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                >
                  <span>{r.label}</span>
                  <span className="num" style={{ color: "var(--text-muted)" }}>
                    {r.count}건 · 화주 {won(r.customerAmount)} / 차주 {won(r.driverAmount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
