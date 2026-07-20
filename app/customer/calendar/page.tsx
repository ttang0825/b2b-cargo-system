"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { getOrderStatusColor } from "@/lib/orderStatusColors";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function PortalCalendarPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("id,order_no,origin,destination,requested_pickup_at,status")
        .not("requested_pickup_at", "is", null)
        .order("requested_pickup_at", { ascending: true });
      setOrders(data || []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("customer_calendar_orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const today = new Date();
  const baseDate = new Date();
  baseDate.setDate(1);
  baseDate.setMonth(baseDate.getMonth() + monthOffset);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const isCurrentMonthView =
    year === today.getFullYear() && month === today.getMonth();

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

  const selectedOrders = selectedDay ? ordersByDay[selectedDay] || [] : [];

  function goToToday() {
    setMonthOffset(0);
    setSelectedDay(today.getDate());
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">배차 캘린더</h1>
          <p className="page-desc">상차 예정일 기준입니다. 날짜를 클릭하면 상세 내역이 보입니다.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn-ghost"
            style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}
            onClick={goToToday}
          >
            오늘
          </button>
          <button
            className="btn-ghost"
            style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}
            onClick={() => {
              setMonthOffset((m) => m - 1);
              setSelectedDay(null);
            }}
          >
            ← 이전
          </button>
          <span className="num" style={{ fontWeight: 700, fontSize: 15, minWidth: 80, textAlign: "center" }}>
            {year}.{String(month + 1).padStart(2, "0")}
          </span>
          <button
            className="btn-ghost"
            style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}
            onClick={() => {
              setMonthOffset((m) => m + 1);
              setSelectedDay(null);
            }}
          >
            다음 →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : (
        <>
          <div className="card" style={{ padding: 16, marginBottom: selectedOrders.length > 0 ? 16 : 0 }}>
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
              {cells.map((day, i) => {
                const dayOrders = day ? ordersByDay[day] || [] : [];
                const isSelected = day !== null && day === selectedDay;
                const isToday = day !== null && isCurrentMonthView && day === today.getDate();
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!day}
                    onClick={() => day && setSelectedDay(isSelected ? null : day)}
                    style={{
                      height: 56,
                      border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                      borderRadius: 8,
                      padding: 6,
                      background: !day ? "transparent" : isSelected ? "var(--accent-soft)" : "var(--surface)",
                      cursor: day ? "pointer" : "default",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                    }}
                  >
                    {day && (
                      <>
                        <span
                          className="num"
                          style={{
                            fontSize: 11.5,
                            color: isSelected ? "var(--accent)" : isToday ? "var(--text)" : "var(--text-muted)",
                            fontWeight: isSelected || isToday ? 800 : 400,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: isToday ? 18 : "auto",
                            height: isToday ? 18 : "auto",
                            borderRadius: "50%",
                            background: isToday && !isSelected ? "#ffd833" : "transparent",
                            color: isToday && !isSelected ? "#1a1a1a" : undefined,
                          }}
                        >
                          {day}
                        </span>
                        {dayOrders.length > 0 && (
                          <span
                            className="num"
                            style={{
                              alignSelf: "flex-end",
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: "var(--accent)",
                              background: "var(--accent-soft)",
                              padding: "1px 6px",
                              borderRadius: 999,
                            }}
                          >
                            {dayOrders.length}건
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDay && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 12 }}>
                {year}.{String(month + 1).padStart(2, "0")}.{String(selectedDay).padStart(2, "0")} 상차 일정
              </div>
              {selectedOrders.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>이 날짜에 예정된 운송이 없습니다.</p>
              ) : (
                selectedOrders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 13,
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="num">{o.order_no}</span>
                    <span style={{ flex: 1, minWidth: 120 }}>
                      {o.origin} → {o.destination}
                    </span>
                    <span className="num" style={{ color: "var(--text-muted)" }}>
                      {new Date(o.requested_pickup_at).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: getOrderStatusColor(o.status).bg,
                        color: getOrderStatusColor(o.status).text,
                      }}
                    >
                      {o.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
