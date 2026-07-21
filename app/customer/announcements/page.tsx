"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";

const LAST_SEEN_KEY = "wecarry_announcements_last_seen";

export default function PortalAnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,content,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      const lastSeenStr = typeof window !== "undefined" ? localStorage.getItem(LAST_SEEN_KEY) : null;
      const lastSeen = lastSeenStr ? new Date(lastSeenStr) : null;

      const withNewFlag = (data || []).map((a) => ({
        ...a,
        isNew: lastSeen ? new Date(a.created_at) > lastSeen : true,
      }));

      setItems(withNewFlag);
      setLoading(false);

      // 이번 방문을 "확인함"으로 기록 (다음 방문부터는 지금까지 글이 NEW로 안 보임)
      if (typeof window !== "undefined") {
        localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
      }
    }
    load();
  }, []);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">공지사항</h1>
          <p className="page-desc">제목을 클릭하면 자세한 내용을 볼 수 있습니다.</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">등록된 공지사항이 없습니다.</div>
      ) : (
        <div className="card">
          {items.map((a, i) => {
            const isOpen = openId === a.id;
            return (
              <div key={a.id} style={{ borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none" }}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : a.id)}
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
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {a.isNew && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#fff",
                          background: "var(--danger)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        NEW
                      </span>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{a.title}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span className="num" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      {new Date(a.created_at).toLocaleDateString("ko-KR")}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                  </span>
                </button>
                {isOpen && a.content && (
                  <div
                    style={{
                      padding: "0 20px 18px",
                      fontSize: 13.5,
                      color: "var(--text)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {a.content}
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
