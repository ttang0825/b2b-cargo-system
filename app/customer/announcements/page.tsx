"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import {
  ANNOUNCEMENTS_LAST_SEEN_KEY as LAST_SEEN_KEY,
  ANNOUNCEMENT_NOTICE_FIELD,
} from "@/lib/portalNotifications";
import AnnouncementBody from "@/components/AnnouncementBody";
import { useListSearchSort } from "@/lib/useListSearchSort";

export default function PortalAnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { search, setSearch, result: visibleItems } = useListSearchSort(
    items,
    (a) => [a.title],
    { created_at: (a) => a.created_at },
    "created_at",
    "desc"
  );

  useEffect(() => {
    async function load() {
      // 🔴 `content_format` 을 빼지 말 것 — 없으면 옛 평문 공지를 서식으로 읽어
      //    줄바꿈이 통째로 사라진다(`_verify.sql` ㉙-f — 기존 행에 실제로 있다).
      // 🔴 `announced_at` 은 「새 글」 판정 기준이다(`ANNOUNCEMENT_NOTICE_FIELD`).
      const { data, error } = await supabase
        .from("announcements")
        .select(`id,title,content,content_format,created_at,${ANNOUNCEMENT_NOTICE_FIELD}`)
        .order("created_at", { ascending: false })
        .limit(50);

      // 🔴 조회 실패를 빈 목록으로 삼키지 말 것(원칙 55번) — "등록된 공지사항이
      //    없습니다" 가 떠서 원인을 짚을 단서가 하나도 안 남는다.
      if (error) setLoadError(error.message);

      const lastSeenStr = typeof window !== "undefined" ? localStorage.getItem(LAST_SEEN_KEY) : null;
      const lastSeen = lastSeenStr ? new Date(lastSeenStr) : null;

      const withNewFlag = (data || []).map((a) => ({
        ...a,
        // 🔴 `created_at` 이 아니라 `announced_at` 이다 — 담당자가 오타를 고쳐도
        //    「화주에게 다시 알림」을 켜지 않았으면 새 글로 뜨지 않는다.
        isNew: lastSeen
          ? new Date((a as any)[ANNOUNCEMENT_NOTICE_FIELD]) > lastSeen
          : true,
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

      {items.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <input
            type="text"
            placeholder="제목 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", maxWidth: 320, fontSize: 13, padding: "8px 12px" }}
          />
        </div>
      )}

      {loadError && <div className="error-box">공지사항을 불러오지 못했습니다: {loadError}</div>}

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">등록된 공지사항이 없습니다.</div>
      ) : visibleItems.length === 0 ? (
        <div className="card">
          <div className="empty-state">검색 결과가 없습니다.</div>
        </div>
      ) : (
        <div className="card">
          {visibleItems.map((a, i) => {
            const isOpen = openId === a.id;
            return (
              <div key={a.id} style={{ borderBottom: i < visibleItems.length - 1 ? "1px solid var(--border)" : "none" }}>
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
                  <div style={{ padding: "0 20px 18px", fontSize: 13.5, color: "var(--text)" }}>
                    {/* 🔴 관리자 미리보기와 **같은 부품**이다 — 따로 그리지 말 것.
                        `whiteSpace: pre-wrap` 은 옛 평문 공지용으로 그 부품 안
                        (`.ann-body-plain`)에 들어 있다. */}
                    <AnnouncementBody content={a.content} format={a.content_format} />
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
