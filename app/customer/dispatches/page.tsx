"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { getDispatchStatusColor } from "@/lib/dispatchStatusColors";
import MixableBadge from "@/components/MixableBadge";
import { getSettlementDisplayLabel, getPaymentConditionLabel } from "@/lib/settlementLabels";
import { useListSearchSort, sortIndicator } from "@/lib/useListSearchSort";
import DateRangeFilter, { DatePreset, getDateRange } from "@/components/DateRangeFilter";

// admin 정산관리 목록과 동일한 줄바꿈 처리 — "/"가 있는 라벨만 "/" 뒤에서
// 한 번 줄바꿈("선착불 / 수수료 월정산"이 3줄로 들쭉날쭉 갈라지는 것 방지).
// 화주포털은 주선수수료 금액/지급자·정보망 정산방식 같은 내부 전용 정보는
// 애초에 조회하지 않고(작업지시서 4-6), 라벨도 항상 이 공용 함수를 거쳐서
// 한글로만 출력한다(원본 코드값 직접 출력 금지).
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

export default function CustomerDispatchesPage() {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<DatePreset>("all");

  const periodFiltered = useMemo(() => {
    const { from } = getDateRange(period);
    if (!from) return dispatches;
    return dispatches.filter((d) => d.created_at && d.created_at >= from);
  }, [dispatches, period]);

  const {
    search,
    setSearch,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    toggleSort,
    result: visibleDispatches,
  } = useListSearchSort(
    periodFiltered,
    (d) => [d.orders?.order_no, d.orders?.origin, d.orders?.destination, d.orders?.item, d.dispatch_status],
    {
      created_at: (d) => d.created_at,
      requested_pickup_at: (d) => d.orders?.requested_pickup_at,
      dispatch_status: (d) => d.dispatch_status,
    },
    "created_at",
    "desc"
  );

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("dispatches")
        .select(
          "id,dispatch_status,created_at,orders(order_no,origin,destination,requested_pickup_at,item,loading_type,collection_method,billing_cycle,direct_collection_point)"
        )
        .order("created_at", { ascending: false })
        .limit(100);
      setDispatches(data || []);
      setLoading(false);
    }
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

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">배차·운송 조회</h1>
          <p className="page-desc">
            진행 중인 운송의 실시간 상태를 확인하세요. 엑셀로 내려받으시려면{" "}
            <Link href="/customer/stats" style={{ textDecoration: "underline" }}>
              월별 통계
            </Link>{" "}
            페이지를 이용해주세요.
          </p>
        </div>
      </div>

      {dispatches.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <DateRangeFilter value={period} onChange={setPeriod} />
        </div>
      )}

      {dispatches.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <input
            type="text"
            placeholder="오더번호·구간·품목·상태 검색"
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
            <option value="requested_pickup_at:asc">상차 빠른순</option>
            <option value="requested_pickup_at:desc">상차 늦은순</option>
            <option value="dispatch_status:asc">배차상태순</option>
          </select>
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : dispatches.length === 0 ? (
          <div className="empty-state">진행 중인 운송이 없습니다.</div>
        ) : visibleDispatches.length === 0 ? (
          <div className="empty-state">검색 결과가 없습니다.</div>
        ) : (
          <>
            <table className="desktop-only" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>오더번호</th>
                  <th>구간</th>
                  <th>품목</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("requested_pickup_at")}>
                    상차 예정{sortIndicator(sortKey, "requested_pickup_at", sortDir)}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("dispatch_status")}>
                    배차상태{sortIndicator(sortKey, "dispatch_status", sortDir)}
                  </th>
                  <th>정산방식</th>
                </tr>
              </thead>
              <tbody>
                {visibleDispatches.map((d) => (
                  <tr key={d.id}>
                    <td className="cell-nowrap">
                      <span className="num">{d.orders?.order_no || "-"}</span>
                      {d.orders?.loading_type === "mixable" && (
                        <div style={{ marginTop: 4 }}>
                          <MixableBadge />
                        </div>
                      )}
                    </td>
                    <td>
                      {d.orders?.origin || "-"} → {d.orders?.destination || "-"}
                    </td>
                    <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.orders?.item || "-"}
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
                    <td>
                      <span
                        className="badge"
                        style={{ display: "inline-block", textAlign: "center", lineHeight: 1.5 }}
                      >
                        <SettlementBadgeLabel
                          collectionMethod={d.orders?.collection_method}
                          billingCycle={d.orders?.billing_cycle}
                          directCollectionPoint={d.orders?.direct_collection_point}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-only">
              {visibleDispatches.map((d) => (
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
                  {d.orders?.loading_type === "mixable" && (
                    <div style={{ marginBottom: 6 }}>
                      <MixableBadge />
                    </div>
                  )}
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">구간</span>
                    <span>{d.orders?.origin || "-"} → {d.orders?.destination || "-"}</span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">품목</span>
                    <span>{d.orders?.item || "-"}</span>
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
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">정산방식</span>
                    <span>
                      {getSettlementDisplayLabel(d.orders?.collection_method, d.orders?.billing_cycle)}
                      {getPaymentConditionLabel(d.orders?.direct_collection_point) && (
                        <> · {getPaymentConditionLabel(d.orders?.direct_collection_point)}</>
                      )}
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
