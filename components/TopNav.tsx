"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { supabaseAdminAuth } from "@/lib/supabaseAdminAuthClient";
import { onBadgeRefresh } from "@/lib/notifyBadgeRefresh";
import { getCurrentStaffInfo, onCurrentStaffChange, clearCurrentStaffCache } from "@/lib/currentStaff";

type NavItem = { href: string; label: string; key?: "applications" | "publicQuotes" | "portalRequests" };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "화주 확보",
    items: [
      { href: "/admin/companies", label: "화주 관리 (영업)" },
      { href: "/admin/applications", label: "화주신청", key: "applications" },
      { href: "/admin/public-quotes", label: "공개문의", key: "publicQuotes" },
      { href: "/admin/individual-customers", label: "개인고객 관리" },
    ],
  },
  {
    label: "화주 관리",
    items: [
      { href: "/admin/customers", label: "활성 화주 (CRM)" },
      { href: "/admin/portal-requests", label: "화주요청", key: "portalRequests" },
      { href: "/admin/account-cleanup", label: "포털 계정 정리" },
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
      { href: "/admin/settings/external-networks", label: "외부 정보망 관리" },
    ],
  },
];

// 관리자(admin) role일 때만 노출되는 그룹 - middleware.ts에서도 /admin/staff는 관리자만
// 접근 가능하도록 별도로 막고 있음 (여기서는 화면단 노출만 제어)
const ADMIN_ONLY_GROUP: NavGroup = {
  label: "시스템",
  items: [
    { href: "/admin/staff", label: "직원 계정 관리" },
    { href: "/admin/support-logs", label: "지원접속 이력" },
  ],
};

// 화주 상세(/admin/companies/[id])는 "화주 관리(영업)"/"활성 화주(CRM)" 두 목록
// 어디서든 들어올 수 있는 공용 화면이라, pathname만으로는 상단메뉴에서 어느 쪽을
// 활성표시해야 할지 구분이 안 됨 — 목록에서 넘어올 때 붙이는 ?from=customers
// 파라미터(?from_order 패턴과 동일)로 구분함
function isNavItemActive(pathname: string | null, fromCustomers: boolean, href: string) {
  if (fromCustomers && pathname?.startsWith("/admin/companies/")) {
    if (href === "/admin/customers") return true;
    if (href === "/admin/companies") return false;
  }
  return !!pathname?.startsWith(href);
}

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
  fromCustomers,
  counts,
  open,
  onToggle,
}: {
  group: NavGroup;
  pathname: string | null;
  fromCustomers: boolean;
  counts: Record<string, number>;
  open: boolean;
  onToggle: () => void;
}) {
  const isActiveGroup = group.items.some((i) => isNavItemActive(pathname, fromCustomers, i.href));
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
            const active = isNavItemActive(pathname, fromCustomers, item.href);
            const count = item.key ? counts[item.key] || 0 : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-dropdown-item nav-dropdown-item-active" : "nav-dropdown-item"}
              >
                {item.label}
                <Badge count={count} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// useSearchParams()를 쓰기 때문에 Suspense 경계 안에서만 렌더링 가능 — 루트
// 레이아웃에서 전체 사이트에 항상 렌더링되므로, 이 컴포넌트가 직접 export되면
// 정적 생성 시 "useSearchParams should be wrapped in a suspense boundary" 오류로
// 빌드가 실패함 (실제로 Vercel 배포에서 이 문제로 빌드 실패했던 적 있음)
export default function TopNav() {
  return (
    <Suspense fallback={null}>
      <TopNavInner />
    </Suspense>
  );
}

function TopNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromCustomers = searchParams.get("from") === "customers";
  const router = useRouter();
  const [counts, setCounts] = useState({ portalRequests: 0, publicQuotes: 0, applications: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffName, setStaffName] = useState<string | null>(null);
  const navGroupRef = useRef<HTMLDivElement>(null);

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

    // 관리자가 화주신청/공개문의를 방금 처리했으면 15초를 기다리지 않고 바로 배지 재조회
    const offBadgeRefresh = onBadgeRefresh(() => {
      loadPublicQuotes();
      loadApplications();
      loadPortalRequests();
    });

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      offBadgeRefresh();
    };
    // 배지 개수는 특정 페이지에 속한 값이 아니라 전역 값이라 페이지 이동마다
    // 다시 구독/폴링을 새로 만들 필요가 없음 (예전엔 [pathname]에 의존해서
    // 페이지를 옮길 때마다 Realtime 채널을 매번 재연결 + API 3개를 다시 호출하고
    // 있었음 — 관리자 화면 어디서든 페이지 전환이 느리게 느껴지던 원인).
    // 공개 페이지 ↔ 관리자 화면 경계를 넘나들 때만 다시 설정하면 되므로
    // isPublicPath로만 의존성을 좁힘
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublicPath]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  useEffect(() => {
    if (isPublicPath) return;
    function applyInfo(info: { name: string; role: "admin" | "staff" } | null) {
      setIsAdmin(info?.role === "admin");
      setStaffName(info?.name || null);
    }
    getCurrentStaffInfo().then(applyInfo);
    // 본인 정보 수정(/admin/my-account)·role 변경(/admin/staff) 직후 바로 반영되도록 구독
    const off = onCurrentStaffChange(applyInfo);
    return off;
  }, [isPublicPath]);

  // 드롭다운이 열려있을 때 메뉴 바깥의 빈 곳을 클릭하면 닫히게 함
  useEffect(() => {
    if (!openGroup) return;
    function handleClickOutside(e: MouseEvent) {
      if (navGroupRef.current && !navGroupRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openGroup]);

  if (isPublicPath) return null;

  async function handleLogout() {
    await supabaseAdminAuth.auth.signOut();
    clearCurrentStaffCache();
    router.push("/admin/login");
    router.refresh();
  }

  const totalPending = counts.portalRequests + counts.publicQuotes + counts.applications;
  const visibleGroups = isAdmin ? [...NAV_GROUPS, ADMIN_ONLY_GROUP] : NAV_GROUPS;

  return (
    <div className="top-nav">
      <div className="top-nav-inner" style={{ flexWrap: "wrap", gap: 16 }}>
        <Link href="/admin" className="brand-link">
          <div className="brand">WeCarry 운송 통합 운영 시스템</div>
          <div className="brand-sub">내부 관리자 (admin)</div>
        </Link>

        <div
          ref={navGroupRef}
          className="nav-desktop-group"
          style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
        >
          {visibleGroups.map((group) => (
            <NavDropdown
              key={group.label}
              group={group}
              pathname={pathname}
              fromCustomers={fromCustomers}
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
          {staffName && (
            <Link href="/admin/my-account" className="guide-link">
              {staffName}님
            </Link>
          )}
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
          {visibleGroups.map((group) => (
            <div key={group.label} style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
                {group.label}
              </div>
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, fromCustomers, item.href);
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
                    <Badge count={count} />
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
            {staffName && (
              <Link
                href="/admin/my-account"
                style={{ display: "block", padding: "8px 4px", fontSize: 13.5, color: "var(--text-muted)", textDecoration: "none" }}
              >
                {staffName}님
              </Link>
            )}
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
