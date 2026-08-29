"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { getOrderStatusColor } from "@/lib/orderStatusColors";
import MixableBadge from "@/components/MixableBadge";

/**
 * 🔴 배차 캘린더 — **월별 통계 화면 하단**이 정식 자리다(29차, 시안 `isStatsCal`).
 *    24·25차에 진입 경로가 없던 의도된 공백이 이번에 메워진 것이다.
 *
 *    🔴 홈으로 옮기지 말 것 · 🔴 날짜 클릭 상세를 지우지 말 것(34차 기능).
 *    `/customer/calendar` 라우트도 살아 있고 이 컴포넌트를 함께 쓴다 — 두 곳에
 *    각각 캘린더를 그리면 조용히 갈린다(53차가 "안 쓰는 라우트로 보고 지우지
 *    말 것"이라 못박은 그 라우트다).
 */

const WEEKDAYS = [
  { label: "일", color: "#C05B54" },
  { label: "월", color: "#888378" },
  { label: "화", color: "#888378" },
  { label: "수", color: "#888378" },
  { label: "목", color: "#888378" },
  { label: "금", color: "#888378" },
  { label: "토", color: "#4C6FBF" },
];

function won(n: number | null | undefined) {
  if (!n) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function Pv2DispatchCalendar() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select(
          "id,order_no,origin,destination,requested_pickup_at,status,item,vehicle_type,loading_type,quotes(final_amount)"
        )
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

  const isCurrentMonthView = year === today.getFullYear() && month === today.getMonth();
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
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  // 마지막 줄을 7칸으로 채워야 오른쪽 테두리 규칙(`:nth-child(7n)`)이 어긋나지 않는다
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedOrders = selectedDay ? ordersByDay[selectedDay] || [] : [];

  return (
    <>
      <div className="pv2-calhead">
        <div>
          <div className="pv2-caltitle">배차 캘린더</div>
          <div className="pv2-calsub">상차 예정일 기준입니다.</div>
        </div>
        <div className="pv2-calnav">
          <button
            type="button"
            className="pv2-calbtn"
            onClick={() => {
              setMonthOffset(0);
              setSelectedDay(null);
            }}
          >
            오늘
          </button>
          <button
            type="button"
            className="pv2-calbtn pv2-calbtn-arrow"
            aria-label="이전 달"
            onClick={() => {
              setMonthOffset((m) => m - 1);
              setSelectedDay(null);
            }}
          >
            ←
          </button>
          <span className="pv2-calmonth num">
            {year}. {String(month + 1).padStart(2, "0")}
          </span>
          <button
            type="button"
            className="pv2-calbtn pv2-calbtn-arrow"
            aria-label="다음 달"
            onClick={() => {
              setMonthOffset((m) => m + 1);
              setSelectedDay(null);
            }}
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="pv2-empty">불러오는 중...</div>
      ) : (
        <>
          <div className="pv2-caltable">
            <div className="pv2-calwk">
              {WEEKDAYS.map((w) => (
                <span key={w.label} style={{ color: w.color }}>
                  {w.label}
                </span>
              ))}
            </div>
            <div className="pv2-calgrid">
              {cells.map((day, i) => {
                const dayOrders = day ? ordersByDay[day] || [] : [];
                const isSelected = day !== null && day === selectedDay;
                const isToday = day !== null && isCurrentMonthView && day === today.getDate();
                const weekday = i % 7;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!day}
                    className={`pv2-calcell${day ? " pv2-calcell-on" : ""}`}
                    onClick={() => day && setSelectedDay(isSelected ? null : day)}
                  >
                    {day && (
                      <>
                        <span
                          className="pv2-calday num"
                          style={{
                            background: isSelected ? "#1A1A1A" : isToday ? "#FFD833" : "transparent",
                            color: isSelected
                              ? "#FFFFFF"
                              : weekday === 0
                                ? "#C05B54"
                                : weekday === 6
                                  ? "#4C6FBF"
                                  : "#1A1A1A",
                            fontWeight: isSelected || isToday ? 700 : 400,
                          }}
                        >
                          {day}
                        </span>
                        {dayOrders.length > 0 && (
                          <span className="pv2-calcount num">{dayOrders.length}건 상차</span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Link href="/customer/dispatches" className="pv2-callink">
            배차·운송 조회에서 전체 보기
          </Link>

          {/* 🔴 날짜 클릭 상세는 34차 기능이다 — 지우지 말 것.
              시안은 클릭 위치에 뜨는 팝오버이지만 표 아래 카드로 뒀다. 팝오버는
              달력 칸마다 위치를 계산해야 하고 모바일에서 화면을 덮는데, 이 카드는
              같은 정보를 더 안정적으로 보여준다. */}
          {selectedDay && (
            <div className="pv2-caldetail">
              <div className="pv2-caldetail-title">
                {year}. {String(month + 1).padStart(2, "0")}. {String(selectedDay).padStart(2, "0")} 상차
              </div>
              <div className="pv2-caldetail-sub">
                이 날 상차 예정인 운송 {selectedOrders.length}건
              </div>
              {selectedOrders.length === 0 ? (
                <div className="pv2-sempty-line">이 날짜에 예정된 운송이 없습니다</div>
              ) : (
                selectedOrders.map((o) => (
                  <div key={o.id} className="pv2-caldetail-row">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="num" style={{ fontWeight: 700 }}>
                        {o.order_no}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="num" style={{ color: "var(--pv2-text-3)" }}>
                          {new Date(o.requested_pickup_at).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: getOrderStatusColor(o.status).bg,
                            color: getOrderStatusColor(o.status).text,
                          }}
                        >
                          {o.status}
                        </span>
                      </div>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {o.origin} <span className="pv2-arrow-glyph">→</span> {o.destination}
                    </div>
                    <div className="pv2-caldetail-meta">
                      <span>품목 {o.item || "-"}</span>
                      <span>· 차량 {o.vehicle_type || "-"}</span>
                      <span className="num">· 금액 {won(o.quotes?.final_amount)}</span>
                      {o.loading_type === "mixable" && <MixableBadge />}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
