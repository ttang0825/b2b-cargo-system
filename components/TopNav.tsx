"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type NavItem = { href: string; label: string; key?: "applications" | "publicQuotes" | "portalRequests" };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "화주 확보",
    items: [
      { href: "/admin/companies", label: "화주 관리 (영업)" },
      { href: "/admin/applications", label: "화주신청", key: "applications" },
      { href: "/admin/public-quotes", label: "공개문의", key: "publicQuotes" },
    ],
  },
  {
    label: "화주 관리",
    items: [
      { href: "/admin/customers", label: "활성 화주 (CRM)" },
      { href: "/admin/portal-requests", label: "화주요청", key: "portalRequests" },
    ],
  },
  {
    label: "운송 운영",
    items: [
      { href: "/admin/rates", label: "운임기준표" },
      { href: "/admin/quotes", label: "견적 관리" },
      { href: "/admin/orders", label: "운송오더" },
      { href: "/admin/drivers", label: "차주 관리" },
      { href: "/admin/dispatches", label: "배차 관리" },
      { href: "/admin/invoices", label: "정산 관리" },
    ],
  },
];

function Badge({ count }: { count: number }) {
  return (
    <span
      style={{
        marginLeft: 6,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 16,
        height: 16,
        padding: "0 4px",
        borderRadius: 999,
        background: "var(--danger)",
        color: "#fff",
        fontSize: 10,
        fontWeight: 800,
        visibility: count > 0 ? "visible" : "hidden",
      }}
    >
      {count}
    </span>
  );
}

function NavDropdown({
  group,
  pathname,
  counts,
  open,
  onToggle,
}: {
  group: NavGroup;
  pathname: string | null;
  counts: Record<string, number>;
  open: boolean;
  onToggle: () => void;
}) {
  const isActiveGroup = group.items.some((i) => pathname?.startsWith(i.href));
  const groupTotal = group.items.reduce((sum, i) => sum + (i.key ? counts[i.key] || 0 : 0), 0);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onToggle}
        className={isActiveGroup ? "nav-chip nav-chip-active" : "nav-chip"}
        style={{ border: "none", cursor: "pointer" }}
      >
        {group.label}
        <span style={{ marginLeft: 5, fontSize: 9 }}>{open ? "▲" : "▼"}</span>
        <Badge count={groupTotal} />
      </button>
      {open && (
        <div
          className="card"
          style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 190, padding: 6, zIndex: 30 }}
        >
          {group.items.map((item) => {
            const active = pathname?.startsWith(item.href);
            const count = item.key ? counts[item.key] || 0 : 0;
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--accent)" : "var(--text)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  textDecoration: "none",
                }}
              >
                {item.label}
                {count > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      borderRadius: 999,
                      background: "var(--danger)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {count}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState({ portalRequests: 0, publicQuotes: 0, applications: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const isPublicPath =
    pathname === "/admin/login" ||
    pathname?.startsWith("/customer") ||
    pathname === "/" ||
    pathname?.startsWith("/quote") ||
    pathname?.startsWith("/apply") ||
    pathname?.startsWith("/status");

  useEffect(() => {
    if (isPublicPath) return;

    async function loadPortalRequests() {
      const { count } = await supabase
        .from("portal_order_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "대기중");
      setCounts((prev) => ({ ...prev, portalRequests: count || 0 }));
    }
    async function loadPublicQuotes() {
      try {
        const res = await fetch("/api/admin/public-quote-requests");
        const data = await res.json();
        if (res.ok) {
          setCounts((prev) => ({
            ...prev,
            publicQuotes: (data.data || []).filter((r: any) => r.status === "신규").length,
          }));
        }
      } catch {
        // 무시
      }
    }
    async function loadApplications() {
      try {
        const res = await fetch("/api/admin/applications");
        const data = await res.json();
        if (res.ok) {
          setCounts((prev) => ({
            ...prev,
            applications: (data.data || []).filter((r: any) => r.status === "검토중").length,
          }));
        }
      } catch {
        // 무시
      }
    }

    loadPortalRequests();
    loadPublicQuotes();
    loadApplications();

    // 공개문의·화주신청은 anon으로 직접 실시간 구독이 안 되는 테이블이라 15초마다 조용히 재조회
    const pollInterval = setInterval(() => {
      loadPublicQuotes();
      loadApplications();
    }, 15000);

    const channel = supabase
      .channel("topnav_portal_requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_order_requests" }, () => loadPortalRequests())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  if (isPublicPath) return null;

  async function handleLogout() {
    await fetch("/api/admin-logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const totalPending = counts.portalRequests + counts.publicQuotes + counts.applications;

  return (
    <div className="top-nav">
      <div className="top-nav-inner" style={{ flexWrap: "wrap", gap: 16 }}>
        <Link href="/admin" className="brand-link">
          <div className="brand">WeCarry 운송 통합 운영 시스템</div>
          <div className="brand-sub">내부 관리자 (admin)</div>
        </Link>

        <div className="nav-desktop-group" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {NAV_GROUPS.map((group) => (
            <NavDropdown
              key={group.label}
              group={group}
              pathname={pathname}
              counts={counts}
              open={openGroup === group.label}
              onToggle={() => setOpenGroup((g) => (g === group.label ? null : group.label))}
            />
          ))}
          <Link href="/admin/guide" className="guide-link">
            이용가이드
          </Link>
          <Link href="/admin/announcements" className="guide-link">
            공지사항 관리
          </Link>
          <button
            onClick={handleLogout}
            className="guide-link"
            style={{ border: "none", background: "none", cursor: "pointer" }}
          >
            로그아웃
          </button>
        </div>

        <button
          type="button"
          className="nav-mobile-toggle"
          onClick={() => setMobileMenuOpen((o) => !o)}
          aria-label="메뉴 열기"
          style={{ position: "relative" }}
        >
          {mobileMenuOpen ? "✕" : "☰"}
          {!mobileMenuOpen && totalPending > 0 && (
            <span
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--danger)",
              }}
            />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          className="mobile-only"
          style={{ borderTop: "1px solid var(--border)", padding: "8px 20px 16px", display: "flex", flexDirection: "column" }}
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
                {group.label}
              </div>
              {group.items.map((item) => {
                const active = pathname?.startsWith(item.href);
                const count = item.key ? counts[item.key] || 0 : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 4px",
                      fontSize: 14,
                      fontWeight: active ? 700 : 500,
                      color: active ? "var(--accent)" : "var(--text)",
                      textDecoration: "none",
                    }}
                  >
                    {item.label}
                    {count > 0 && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 16,
                          height: 16,
                          padding: "0 4px",
                          borderRadius: 999,
                          background: "var(--danger)",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 10, paddingTop: 8 }}>
            <Link
              href="/admin/guide"
              style={{ display: "block", padding: "8px 4px", fontSize: 13.5, color: "var(--text-muted)", textDecoration: "none" }}
            >
              이용가이드
            </Link>
            <Link
              href="/admin/announcements"
              style={{ display: "block", padding: "8px 4px", fontSize: 13.5, color: "var(--text-muted)", textDecoration: "none" }}
            >
              공지사항 관리
            </Link>
            <button
              onClick={handleLogout}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 4px",
                fontSize: 13.5,
                color: "var(--text-muted)",
                border: "none",
                background: "none",
                cursor: "pointer",
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
