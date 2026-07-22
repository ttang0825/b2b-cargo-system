"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const MENU = [
  { href: "/admin/companies", label: "화주 관리 (영업)" },
  { href: "/admin/customers", label: "활성 화주 (CRM)" },
  { href: "/admin/rates", label: "운임기준표" },
  { href: "/admin/quotes", label: "견적 관리" },
  { href: "/admin/orders", label: "운송오더" },
  { href: "/admin/drivers", label: "차주 관리" },
  { href: "/admin/dispatches", label: "배차 관리" },
  { href: "/admin/invoices", label: "정산 관리" },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingPublicQuotes, setPendingPublicQuotes] = useState(0);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login" || pathname?.startsWith("/customer") || pathname === "/" || pathname?.startsWith("/quote") || pathname?.startsWith("/apply")) return;

    async function loadPendingCount() {
      const { count } = await supabase
        .from("portal_order_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "대기중");
      setPendingRequests(count || 0);
    }
    loadPendingCount();

    async function loadPendingPublicQuotes() {
      try {
        const res = await fetch("/api/admin/public-quote-requests");
        const data = await res.json();
        if (res.ok) {
          setPendingPublicQuotes((data.data || []).filter((r: any) => r.status === "신규").length);
        }
      } catch {
        // 무시 - 배지 표시만 실패, 페이지 이동에는 영향 없음
      }
    }
    loadPendingPublicQuotes();

    async function loadPendingApplications() {
      try {
        const res = await fetch("/api/admin/applications");
        const data = await res.json();
        if (res.ok) {
          setPendingApplications((data.data || []).filter((r: any) => r.status === "검토중").length);
        }
      } catch {
        // 무시
      }
    }
    loadPendingApplications();

    // 공개문의·화주신청은 anon으로 직접 실시간 구독이 안 되는 테이블이라, 15초마다 조용히 재조회
    const pollInterval = setInterval(() => {
      loadPendingPublicQuotes();
      loadPendingApplications();
    }, 15000);

    const channel = supabase
      .channel("topnav_portal_requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "portal_order_requests" },
        () => loadPendingCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // 로그인 화면, 화주포털, 랜딩페이지, 공개 견적문의/등록신청에서는 admin 헤더 자체를 숨김
  if (
    pathname === "/admin/login" ||
    pathname?.startsWith("/customer") ||
    pathname === "/" ||
    pathname?.startsWith("/quote") ||
    pathname?.startsWith("/apply")
  )
    return null;

  async function handleLogout() {
    await fetch("/api/admin-logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="top-nav">
      <div className="top-nav-inner" style={{ flexWrap: "wrap", gap: 16 }}>
        <Link href="/admin" className="brand-link">
          <div className="brand">WeCarry 운송 통합 운영 시스템</div>
          <div className="brand-sub">내부 관리자 (admin)</div>
        </Link>

        <div className="nav-desktop-group" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MENU.map((m) => {
              const active = pathname?.startsWith(m.href);
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className={active ? "nav-chip nav-chip-active" : "nav-chip"}
                >
                  {m.label}
                </Link>
              );
            })}
            <Link
              href="/admin/portal-requests"
              className={
                pathname?.startsWith("/admin/portal-requests") ? "nav-chip nav-chip-active" : "nav-chip"
              }
              style={{ position: "relative" }}
            >
              화주 요청
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
                  visibility: pendingRequests > 0 ? "visible" : "hidden",
                }}
              >
                {pendingRequests}
              </span>
            </Link>
            <Link
              href="/admin/public-quotes"
              className={
                pathname?.startsWith("/admin/public-quotes") ? "nav-chip nav-chip-active" : "nav-chip"
              }
              style={{ position: "relative" }}
            >
              공개문의
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
                  visibility: pendingPublicQuotes > 0 ? "visible" : "hidden",
                }}
              >
                {pendingPublicQuotes}
              </span>
            </Link>
            <Link
              href="/admin/applications"
              className={
                pathname?.startsWith("/admin/applications") ? "nav-chip nav-chip-active" : "nav-chip"
              }
              style={{ position: "relative" }}
            >
              화주신청
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
                  visibility: pendingApplications > 0 ? "visible" : "hidden",
                }}
              >
                {pendingApplications}
              </span>
            </Link>
          </nav>
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
          {!mobileMenuOpen && (pendingRequests > 0 || pendingPublicQuotes > 0 || pendingApplications > 0) && (
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
          style={{
            borderTop: "1px solid var(--border)",
            padding: "8px 20px 16px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {MENU.map((m) => {
            const active = pathname?.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                style={{
                  padding: "10px 4px",
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--accent)" : "var(--text)",
                  textDecoration: "none",
                }}
              >
                {m.label}
              </Link>
            );
          })}
          <Link
            href="/admin/portal-requests"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 4px",
              fontSize: 14,
              fontWeight: pathname?.startsWith("/admin/portal-requests") ? 700 : 500,
              color: pathname?.startsWith("/admin/portal-requests") ? "var(--accent)" : "var(--text)",
              textDecoration: "none",
            }}
          >
            화주 요청
            {pendingRequests > 0 && (
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
                {pendingRequests}
              </span>
            )}
          </Link>
          <Link
            href="/admin/public-quotes"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 4px",
              fontSize: 14,
              fontWeight: pathname?.startsWith("/admin/public-quotes") ? 700 : 500,
              color: pathname?.startsWith("/admin/public-quotes") ? "var(--accent)" : "var(--text)",
              textDecoration: "none",
            }}
          >
            공개문의
            {pendingPublicQuotes > 0 && (
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
                {pendingPublicQuotes}
              </span>
            )}
          </Link>
          <Link
            href="/admin/applications"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 4px",
              fontSize: 14,
              fontWeight: pathname?.startsWith("/admin/applications") ? 700 : 500,
              color: pathname?.startsWith("/admin/applications") ? "var(--accent)" : "var(--text)",
              textDecoration: "none",
            }}
          >
            화주신청
            {pendingApplications > 0 && (
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
                {pendingApplications}
              </span>
            )}
          </Link>
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8 }}>
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
