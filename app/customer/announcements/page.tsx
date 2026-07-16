"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";

export default function PortalAnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,content,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setItems(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">공지사항</h1>
          <p className="page-desc">운영 관련 안내를 확인하세요.</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">등록된 공지사항이 없습니다.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((a) => (
            <div key={a.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{a.title}</h3>
                <span className="num" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  {new Date(a.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
              {a.content && (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, whiteSpace: "pre-wrap" }}>
                  {a.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
