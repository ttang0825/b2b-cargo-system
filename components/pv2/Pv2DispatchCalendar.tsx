"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  // 🔴 팝오버 위치는 grid 좌표를 계산하지 않고 **클릭한 칸의 실제 offset** 에서 읽는다.
  //    칸마다 폭이 달라져도(모바일) 어긋나지 않는다.
  const [popAt, setPopAt] = useState<{ left: number; top: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

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

  const closePop = useCallback(() => {
    setSelectedDay(null);
    setPopAt(null);
  }, []);

  // Esc 로 닫는다(모달·바텀시트와 같은 관례)
  useEffect(() => {
    if (!popAt) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePop();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [popAt, closePop]);

  function openPop(day: number, el: HTMLElement) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const POP_W = 360;
    const wrapW = wrap.clientWidth;
    const w = Math.min(POP_W, wrapW - 16);
    // 칸 가운데를 기준으로 두되 캘린더 밖으로 나가지 않게 가둔다
    const center = el.offsetLeft + el.offsetWidth / 2;
    const left = Math.max(8, Math.min(center - w / 2, wrapW - w - 8));
    setSelectedDay(day);
    setPopAt({ left, top: el.offsetTop + el.offsetHeight + 6 });
  }

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
              closePop();
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
              closePop();
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
              closePop();
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
          <div className="pv2-calwrap" ref={wrapRef}>
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
                    onClick={(e) => {
                      if (!day) return;
                      if (isSelected) closePop();
                      else openPop(day, e.currentTarget);
                    }}
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

          {/* 🔴 날짜 클릭 상세는 34차 기능이고, **팝오버**가 시안이다(PR #107 리뷰).
              표 아래 카드로 되돌리지 말 것. 「배차·운송 조회에서 전체 보기」도
              이 팝오버 안에 있고 캘린더 아래에 따로 두지 않는다. */}
          {selectedDay !== null && popAt && (
            <>
              {/* 바깥을 누르면 닫힌다 — 팝오버보다 z-index 가 하나 낮다 */}
              <div className="pv2-calpop-back" onClick={closePop} aria-hidden="true" />
              <div
                className="pv2-calpop"
                role="dialog"
                aria-modal="false"
                aria-label={`${year}년 ${month + 1}월 ${selectedDay}일 상차 일정`}
                style={{ left: popAt.left, top: popAt.top }}
              >
                <div className="pv2-calpop-head">
                  <div>
                    <div className="pv2-calpop-title num">
                      {year}. {String(month + 1).padStart(2, "0")}. {String(selectedDay).padStart(2, "0")} 상차
                    </div>
                    <div className="pv2-calpop-sub">
                      이 날 상차 예정인 운송 {selectedOrders.length}건
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pv2-calpop-close"
                    onClick={closePop}
                    aria-label="닫기"
                  >
                    ✕
                  </button>
                </div>

                {selectedOrders.length === 0 ? (
                  <div className="pv2-calpop-empty">이 날짜에 예정된 운송이 없습니다</div>
                ) : (
                  <div className="pv2-calpop-list">
                    {selectedOrders.map((o) => (
                      <div key={o.id} className="pv2-calpop-row">
                        <div className="pv2-calpop-top">
                          {/* ⚠️ 이 배지는 **오더 상태**다 — 배차 3단계로 바꾸지 말 것.
                              캘린더는 `orders` 를 읽고, 오더 상태에는 「운송중」처럼
                              3단계로는 표현되지 않는 값이 있다(원칙 42번). */}
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
                          <span className="pv2-calpop-no num">{o.order_no}</span>
                          <span className="pv2-calpop-no num">
                            상차{" "}
                            {new Date(o.requested_pickup_at).toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </span>
                        </div>
                        <div className="pv2-calpop-route">
                          {o.origin} <span className="pv2-arrow-glyph">→</span> {o.destination}
                        </div>
                        <div className="pv2-calpop-meta">
                          <span>{[o.item, o.vehicle_type].filter(Boolean).join(" · ") || "-"}</span>
                          <span className="num">· {won(o.quotes?.final_amount)}</span>
                          {o.loading_type === "mixable" && <MixableBadge />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Link href="/customer/dispatches" className="pv2-callink">
                  배차·운송 조회에서 전체 보기
                </Link>
              </div>
            </>
          )}
          </div>
        </>
      )}
    </>
  );
}
