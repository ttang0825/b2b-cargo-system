"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";

function won(n: number | null) {
  if (!n) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function CustomerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ quotes: 0, activeDispatches: 0, unpaidInvoices: 0 });
  const [recentQuotes, setRecentQuotes] = useState<any[]>([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      const [{ count: quoteCount }, { data: dispatchRows }, { count: invoiceCount }, { data: recent }, { data: announcement }] =
        await Promise.all([
          supabase.from("quotes").select("id", { count: "exact", head: true }),
          supabase
            .from("dispatches")
            .select("id")
            .neq("dispatch_status", "운송완료"),
          supabase
            .from("invoices")
            .select("id", { count: "exact", head: true })
            .eq("payment_received", false),
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
      setRecentQuotes(recent || []);
      setLatestAnnouncement(announcement || null);
      setLoading(false);
    }
    load();

    // 견적이 삭제/추가/변경되면 새로고침 없이 바로 반영
    const channel = supabase
      .channel("customer_dashboard_quotes")
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
          <h1 className="page-title">대시보드</h1>
          <p className="page-desc">최근 견적·운송 현황을 한눈에 확인하세요.</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : (
        <>
          {latestAnnouncement && (
            <div
              className="card"
              style={{
                padding: 16,
                marginBottom: 20,
                background: "var(--accent-soft)",
                border: "none",
              }}
            >
              <div style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 700, marginBottom: 4 }}>
                📢 공지사항
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                {latestAnnouncement.title}
              </div>
              {latestAnnouncement.content && (
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                  {latestAnnouncement.content}
                </div>
              )}
              <a
                href="/customer/announcements"
                style={{ fontSize: 11.5, color: "var(--accent)", textDecoration: "underline" }}
              >
                전체 공지사항 보기 →
              </a>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>전체 견적</div>
              <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>
                {stats.quotes}건
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>진행 중인 운송</div>
              <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>
                {stats.activeDispatches}건
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>미결제 정산</div>
              <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>
                {stats.unpaidInvoices}건
              </div>
            </div>
          </div>

          <div className="card">
            <div
              style={{
                padding: "16px 20px",
                fontSize: 14,
                fontWeight: 700,
                borderBottom: "1px solid var(--border)",
              }}
            >
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
                      <td>
                        {q.origin} → {q.destination}
                      </td>
                      <td className="num">{won(q.final_amount)}</td>
                      <td>{q.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </main>
  );
}
