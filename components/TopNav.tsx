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

  useEffect(() => {
    if (pathname === "/admin/login" || pathname?.startsWith("/customer")) return;

    async function loadPendingCount() {
      const { count } = await supabase
        .from("portal_order_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "대기중");
      setPendingRequests(count || 0);
    }
    loadPendingCount();
  }, [pathname]);

  // 로그인 화면과 화주포털 영역에서는 admin 헤더 자체를 숨김
  if (pathname === "/admin/login" || pathname?.startsWith("/customer")) return null;

  async function handleLogout() {
    await fetch("/api/admin-logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="top-nav">
      <div className="top-nav-inner" style={{ flexWrap: "wrap", gap: 16 }}>
        <Link href="/admin" className="brand-link">
          <div className="brand">EGG 운송 통합 운영 시스템</div>
          <div className="brand-sub">내부 관리자 (admin)</div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
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
              {pendingRequests > 0 && (
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
                  }}
                >
                  {pendingRequests}
                </span>
              )}
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
      </div>
    </div>
  );
}
