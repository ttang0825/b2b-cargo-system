"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { getDispatchStatusColor } from "@/lib/dispatchStatusColors";

function won(n: number | null) {
  if (!n) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

const MENU = [
  { href: "/customer/request", tag: "요청", title: "발주 요청", desc: "새로운 운송을 요청합니다." },
  { href: "/customer/quotes", tag: "견적", title: "견적 확인", desc: "받으신 견적 내역을 확인합니다.", key: "quotes" },
  { href: "/customer/dispatches", tag: "배차", title: "배차·운송 조회", desc: "진행 중인 운송 상태를 확인합니다.", key: "dispatches" },
  { href: "/customer/calendar", tag: "일정", title: "캘린더", desc: "상차 예정일을 달력으로 확인합니다." },
  { href: "/customer/invoices", tag: "정산", title: "정산·세금계산서", desc: "청구내역과 발행 여부를 확인합니다.", key: "invoices" },
  { href: "/customer/stats", tag: "통계", title: "월별 통계", desc: "운송 건수와 청구금액 추이 확인, 운송·정산내역 엑셀 다운로드." },
  { href: "/customer/locations", tag: "배송지", title: "배송지 관리", desc: "자주 쓰는 상·하차지를 등록합니다." },
  { href: "/customer/profile", tag: "계정", title: "담당자 정보", desc: "담당자 연락처를 관리합니다." },
] as const;

export default function CustomerHomePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ quotes: 0, activeDispatches: 0, unpaidInvoices: 0 });
  const [recentQuotes, setRecentQuotes] = useState<any[]>([]);
  const [activeDispatch, setActiveDispatch] = useState<any | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<any | null>(null);
  const [cardNotified, setCardNotified] = useState({ quotes: false, dispatches: false, invoices: false });

  async function load() {
    const [{ count: quoteCount }, { data: dispatchRows }, { count: invoiceCount }, { data: recent }, { data: announcement }] =
      await Promise.all([
        supabase.from("quotes").select("id", { count: "exact", head: true }),
        supabase
          .from("dispatches")
          .select("id,dispatch_status,created_at,orders(order_no,origin,destination)")
          .neq("dispatch_status", "운송완료")
          .order("created_at", { ascending: false }),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("payment_received", false),
        supabase
          .from("quotes")
          .select("id,quote_no,origin,destination,final_amount,status,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("announcements")
          .select("id,title,content,created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    setStats({
      quotes: quoteCount || 0,
      activeDispatches: dispatchRows?.length || 0,
      unpaidInvoices: invoiceCount || 0,
    });
    setActiveDispatch(dispatchRows && dispatchRows.length > 0 ? dispatchRows[0] : null);
    setRecentQuotes(recent || []);
    setLatestAnnouncement(announcement || null);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("customer_home_all")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => {
        load();
        setCardNotified((prev) => ({ ...prev, quotes: true }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatches" }, () => {
        load();
        setCardNotified((prev) => ({ ...prev, dispatches: true }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {
        load();
        setCardNotified((prev) => ({ ...prev, invoices: true }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="container">
      {/* 발주요청 CTA 배너 */}
      <a
        href="/customer/request"
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "26px 28px",
          marginBottom: 20,
          background: "#1a1a1a",
          border: "none",
          textDecoration: "none",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12.5, color: "#FFD833", fontWeight: 700, marginBottom: 4 }}>
            새 운송이 필요하신가요?
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#fff" }}>지금 바로 발주 요청하기</div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "10px 20px",
            borderRadius: 12,
            background: "#FFD833",
            color: "#1a1a1a",
            fontWeight: 800,
            fontSize: 13.5,
          }}
        >
          요청하기 →
        </span>
      </a>

      {latestAnnouncement && (
        <div className="card" style={{ padding: 16, marginBottom: 20, background: "var(--accent-soft)", border: "none" }}>
          <div style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 700, marginBottom: 4 }}>📢 공지사항</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{latestAnnouncement.title}</div>
          {latestAnnouncement.content && (
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{latestAnnouncement.content}</div>
          )}
          <a href="/customer/announcements" style={{ fontSize: 11.5, color: "var(--accent)", textDecoration: "underline" }}>
            전체 공지사항 보기 →
          </a>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>전체 견적</div>
          <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>{stats.quotes}건</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>진행 중인 운송</div>
          <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>{stats.activeDispatches}건</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>미결제 정산</div>
          <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>{stats.unpaidInvoices}건</div>
        </div>
      </div>

      {activeDispatch && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>가장 최근 진행 중인 운송</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div className="num" style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 2 }}>
                {activeDispatch.orders?.order_no}
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                {activeDispatch.orders?.origin} → {activeDispatch.orders?.destination}
              </div>
            </div>
            <span
              style={{
                display: "inline-block",
                padding: "5px 14px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                background: getDispatchStatusColor(activeDispatch.dispatch_status).bg,
                color: getDispatchStatusColor(activeDispatch.dispatch_status).text,
              }}
            >
              {activeDispatch.dispatch_status}
            </span>
          </div>
        </div>
      )}

      <div className="home-grid" style={{ marginBottom: 24 }}>
        {MENU.map((m) => (
          <a key={m.href} href={m.href} className="card home-card" style={{ position: "relative" }}>
            {"key" in m && (m.key as string) && (cardNotified as any)[m.key as string] && (
              <span
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "var(--danger)",
                }}
              />
            )}
            <span className="home-card-tag">{m.tag}</span>
            <h3 className="home-card-title">{m.title}</h3>
            <p className="home-card-desc">{m.desc}</p>
          </a>
        ))}
      </div>

      <div className="card">
        <div style={{ padding: "16px 20px", fontSize: 14, fontWeight: 700, borderBottom: "1px solid var(--border)" }}>
          최근 견적
        </div>
        {recentQuotes.length === 0 ? (
          <div className="empty-state">아직 받은 견적이 없습니다.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>견적번호</th>
                <th>구간</th>
                <th>금액</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {recentQuotes.map((q) => (
                <tr key={q.id}>
                  <td className="num">{q.quote_no}</td>
                  <td>{q.origin} → {q.destination}</td>
                  <td className="num">{won(q.final_amount)}</td>
                  <td>{q.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
