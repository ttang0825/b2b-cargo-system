"use client";

import { useEffect, useMemo, useState } from "react";
// 🔴 원칙 31번 — 앱 내부 경로는 반드시 next/link. <a href> 로 바꾸면 하드 리로드가 된다.
import Link from "next/link";
import { calcInclusiveAmount } from "@/lib/vat";
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

  // 오더별 매출·원가·마진(현장 추가비 표시시점 합산 포함) — 담당자별/화주별 섹션이
  // 공통으로 재사용하는 중간 집계
  const revenueByOrderId = useMemo(() => {
    const map: Record<string, { revenue: number; cost: number; margin: number }> = {};
    if (!data) return map;
    data.invoices.forEach((inv) => {
      if (!inv.order_id) return;
      const attribution = data.extraChargeAttributionByInvoiceId[inv.id];
      const revenue = (inv.customer_charge_total || 0) + (attribution?.customerAmount || 0);
      const cost = (inv.driver_payout_total || 0) + (attribution?.driverAmount || 0);
      const margin = calcInclusiveAmount(revenue) - cost;
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
      const revenue = (inv.customer_charge_total || 0) + (attribution?.customerAmount || 0);
      const cost = (inv.driver_payout_total || 0) + (attribution?.driverAmount || 0);
      const margin = calcInclusiveAmount(revenue) - cost;
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
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
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
      .sort((a, b) => b.revenue - a.revenue)
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

  const maxMonthlyRevenue = Math.max(1, ...monthlyRows.map((r) => r.revenue));
  const maxStaffRevenue = Math.max(1, ...staffRows.map((r) => r.revenue));
  const maxCustomerRevenue = Math.max(1, ...customerRows.map((r) => r.revenue));

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
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>전사 월별 매출·마진 추이</div>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 0, marginBottom: 16 }}>
              매출 = 정산 청구금액 + 그 이후 등록된 현장 추가비 · 마진은 청구금액을 부가세 포함가로 환산한 뒤
              지급금액(+추가비)을 차감한 값입니다.
            </p>
            {monthlyRows.length === 0 ? (
              <div className="empty-state">최근 12개월간 정산 데이터가 없습니다.</div>
            ) : (
              monthlyRows.map((r, idx) => {
                const prev = idx > 0 ? monthlyRows[idx - 1] : null;
                const changePct =
                  prev && prev.revenue > 0 ? Math.round(((r.revenue - prev.revenue) / prev.revenue) * 100) : null;
                return (
                  <div key={r.period} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div className="num" style={{ width: 70, fontSize: 12.5, color: "var(--text-muted)" }}>
                      {r.period}
                    </div>
                    <div style={{ flex: 1, background: "var(--bg)", borderRadius: 8, overflow: "hidden", height: 26 }}>
                      <div
                        style={{
                          width: `${(r.revenue / maxMonthlyRevenue) * 100}%`,
                          background: "var(--accent)",
                          height: "100%",
                          borderRadius: 8,
                          minWidth: r.revenue > 0 ? 4 : 0,
                        }}
                      />
                    </div>
                    <div className="num" style={{ width: 120, textAlign: "right", fontSize: 13 }}>
                      {won(r.revenue)}
                    </div>
                    <div className="num" style={{ width: 110, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                      마진 {won(r.margin)}
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
                        width: `${(r.revenue / maxStaffRevenue) * 100}%`,
                        background: "var(--accent)",
                        height: "100%",
                        borderRadius: 8,
                        minWidth: r.revenue > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  <div className="num" style={{ width: 120, textAlign: "right", fontSize: 13 }}>
                    {won(r.revenue)}
                  </div>
                  <div className="num" style={{ width: 110, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                    마진 {won(r.margin)}
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
                        width: `${(r.revenue / maxCustomerRevenue) * 100}%`,
                        background: "var(--accent)",
                        height: "100%",
                        borderRadius: 8,
                        minWidth: r.revenue > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  <div className="num" style={{ width: 120, textAlign: "right", fontSize: 13 }}>
                    {won(r.revenue)}
                  </div>
                  <div className="num" style={{ width: 110, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                    마진 {won(r.margin)}
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
