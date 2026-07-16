"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function PortalCalendarPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("id,order_no,origin,destination,requested_pickup_at")
        .not("requested_pickup_at", "is", null)
        .order("requested_pickup_at", { ascending: true });
      setOrders(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const baseDate = new Date();
  baseDate.setDate(1);
  baseDate.setMonth(baseDate.getMonth() + monthOffset);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const ordersByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    orders.forEach((o) => {
      const d = new Date(o.requested_pickup_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(o);
      }
    });
    return map;
  }, [orders, year, month]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">배차 캘린더</h1>
          <p className="page-desc">상차 예정일 기준으로 표시됩니다.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn-ghost"
            style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}
            onClick={() => setMonthOffset((m) => m - 1)}
          >
            이전
          </button>
          <span className="num" style={{ fontWeight: 700, fontSize: 15, minWidth: 80, textAlign: "center" }}>
            {year}.{String(month + 1).padStart(2, "0")}
          </span>
          <button
            className="btn-ghost"
            style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}
            onClick={() => setMonthOffset((m) => m + 1)}
          >
            다음
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : (
        <div className="card" style={{ padding: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
              marginBottom: 6,
              fontSize: 11.5,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {cells.map((day, i) => (
              <div
                key={i}
                style={{
                  minHeight: 84,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 6,
                  background: day ? "var(--surface)" : "transparent",
                  borderColor: day ? "var(--border)" : "transparent",
                }}
              >
                {day && (
                  <>
                    <div className="num" style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
                      {day}
                    </div>
                    {(ordersByDay[day] || []).map((o) => (
                      <div
                        key={o.id}
                        className="badge"
                        style={{
                          display: "block",
                          marginBottom: 3,
                          fontSize: 10,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={`${o.origin} → ${o.destination}`}
                      >
                        {o.origin} → {o.destination}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
