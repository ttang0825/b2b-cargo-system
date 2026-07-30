"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { getDispatchStatusColor } from "@/lib/dispatchStatusColors";
import MixableBadge from "@/components/MixableBadge";
import { getSettlementTypeLabel } from "@/lib/constants";

// admin 정산관리 목록과 동일한 줄바꿈 처리 — "/"가 있는 라벨만 "/" 뒤에서
// 한 번 줄바꿈("일반오더/주선사정산"이 3줄로 들쭉날쭉 갈라지는 것 방지)
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

export default function CustomerDispatchesPage() {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("dispatches")
        .select(
          "id,dispatch_status,created_at,orders(order_no,origin,destination,requested_pickup_at,item,loading_type,settlement_type)"
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
                  <th>품목</th>
                  <th>상차 예정</th>
                  <th>배차상태</th>
                  <th>정산방식</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d) => (
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
                        <SettlementBadgeLabel value={d.orders?.settlement_type} />
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
                    <span>{getSettlementTypeLabel(d.orders?.settlement_type)}</span>
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
