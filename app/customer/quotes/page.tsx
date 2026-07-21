"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";

function won(n: number | null) {
  if (!n) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function formatDateTime(v: string | null) {
  if (!v) return null;
  return new Date(v).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  상담중: { bg: "#EFF6FF", text: "#3B82F6" },
  견적제출: { bg: "#EDE9FE", text: "#7C3AED" },
  수주: { bg: "#D1FAE5", text: "#059669" },
  보류: { bg: "#FEF3C7", text: "#B45309" },
  실패: { bg: "#FEE2E2", text: "#B91C1C" },
};

const OPTION_LABELS: Record<string, string> = {
  톤수: "톤수",
  차량형태: "차량형태",
  상차조건: "상차조건",
  하차조건: "하차조건",
  물품특성: "물품특성",
  운송시간: "운송시간",
  긴급여부: "긴급여부",
  "왕복/편도": "왕복/편도",
  대기시간_분: "대기시간(분)",
  경유지수: "경유지 수",
};

export default function CustomerQuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [itemsByQuote, setItemsByQuote] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("quotes")
      .select(
        "id,quote_no,origin,destination,distance_km,vehicle_type,item,base_fare,final_amount,status,selected_options,notes,requested_pickup_at,requested_dropoff_at,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    setQuotes(data || []);

    const ids = (data || []).map((q) => q.id);
    if (ids.length > 0) {
      const { data: items } = await supabase
        .from("quote_items")
        .select("id,quote_id,item_name,amount")
        .in("quote_id", ids);
      const map: Record<string, any[]> = {};
      (items || []).forEach((it) => {
        if (!map[it.quote_id]) map[it.quote_id] = [];
        map[it.quote_id].push(it);
      });
      setItemsByQuote(map);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("customer_quotes_list")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">견적 확인</h1>
          <p className="page-desc">받으신 견적 내역입니다. 카드를 클릭하면 자세히 볼 수 있습니다. (부가세 별도)</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : quotes.length === 0 ? (
        <div className="card">
          <div className="empty-state">아직 받은 견적이 없습니다.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {quotes.map((q) => {
            const isOpen = openId === q.id;
            const statusColor = STATUS_COLORS[q.status] || { bg: "var(--bg)", text: "var(--text-muted)" };
            const options = q.selected_options || {};
            const items = itemsByQuote[q.id] || [];
            const pickup = formatDateTime(q.requested_pickup_at);
            const dropoff = formatDateTime(q.requested_dropoff_at);

            return (
              <div key={q.id} className="card" style={{ overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : q.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "16px 20px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div className="num" style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 3 }}>
                      {q.quote_no}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {q.origin} → {q.destination}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="num" style={{ fontSize: 16, fontWeight: 800 }}>{won(q.final_amount)}</span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: statusColor.bg,
                        color: statusColor.text,
                      }}
                    >
                      {q.status}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                        gap: 12,
                        marginTop: 16,
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>거리</div>
                        <div className="num" style={{ fontSize: 13 }}>{q.distance_km ? `${q.distance_km}km` : "-"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>톤수</div>
                        <div style={{ fontSize: 13 }}>{q.vehicle_type || "-"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>품목</div>
                        <div style={{ fontSize: 13 }}>{q.item || "-"}</div>
                      </div>
                      {Object.entries(options).map(([k, v]) => {
                        if (v === null || v === undefined || v === "" || v === 0 || v === false) return null;
                        if (!OPTION_LABELS[k]) return null;
                        return (
                          <div key={k}>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{OPTION_LABELS[k]}</div>
                            <div style={{ fontSize: 13 }}>{String(v)}</div>
                          </div>
                        );
                      })}
                      {pickup && (
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>희망 상차일시</div>
                          <div className="num" style={{ fontSize: 13 }}>{pickup}</div>
                        </div>
                      )}
                      {dropoff && (
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>희망 하차일시</div>
                          <div className="num" style={{ fontSize: 13 }}>{dropoff}</div>
                        </div>
                      )}
                    </div>

                    {q.notes && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>특이사항</div>
                        <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{q.notes}</div>
                      </div>
                    )}

                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>견적 계산 내역</div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                        <span style={{ color: "var(--text-muted)" }}>기본운임</span>
                        <span className="num">{won(q.base_fare)}</span>
                      </div>
                      {items.map((it) => (
                        <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                          <span>+ {it.item_name}</span>
                          <span className="num">{won(it.amount)}</span>
                        </div>
                      ))}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontWeight: 700,
                          fontSize: 14,
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: "1px solid var(--border)",
                        }}
                      >
                        <span>최종 견적금액</span>
                        <span className="num">{won(q.final_amount)}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, marginBottom: 14 }}>부가세 별도</p>
                      <button
                        className="btn"
                        style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12.5 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/customer/quotes/${q.id}/print`, "_blank");
                        }}
                      >
                        견적서 출력 (PDF)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
