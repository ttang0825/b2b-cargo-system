"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";

const PUBLIC_PATHS = ["/customer/login"];

type NavItem = { href: string; label: string; key?: "quotes" | "dispatches" | "invoices" };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "운송 현황",
    items: [
      { href: "/customer/request", label: "발주 요청" },
      { href: "/customer/quotes", label: "견적 확인", key: "quotes" },
      { href: "/customer/dispatches", label: "배차·운송 조회", key: "dispatches" },
      { href: "/customer/calendar", label: "캘린더" },
    ],
  },
  {
    label: "정산",
    items: [
      { href: "/customer/invoices", label: "정산·세금계산서", key: "invoices" },
      { href: "/customer/stats", label: "월별 통계" },
    ],
  },
  {
    label: "내 계정",
    items: [
      { href: "/customer/locations", label: "배송지 관리" },
      { href: "/customer/profile", label: "담당자 정보" },
      { href: "/customer/change-password", label: "비밀번호 변경" },
    ],
  },
];

function NavDropdown({
  group,
  pathname,
  hasNotice,
  open,
  onToggle,
}: {
  group: NavGroup;
  pathname: string | null;
  hasNotice: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const isActiveGroup = group.items.some((i) => pathname?.startsWith(i.href));

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onToggle}
        className={isActiveGroup ? "nav-chip nav-chip-active" : "nav-chip"}
        style={{ border: "none", cursor: "pointer", position: "relative" }}
      >
        {group.label}
        <span style={{ marginLeft: 5, fontSize: 9 }}>{open ? "▲" : "▼"}</span>
        {hasNotice && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--danger)",
            }}
          />
        )}
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 180,
            padding: 6,
            zIndex: 30,
          }}
        >
          {group.items.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
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
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CustomerPortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [notified, setNotified] = useState({ quotes: false, dispatches: false, invoices: false, announcements: false });
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navGroupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function check() {
      if (PUBLIC_PATHS.includes(pathname || "")) {
        setChecking(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/customer/login");
        return;
      }

      const { data: account } = await supabase
        .from("customer_accounts")
        .select("must_change_password, is_active, companies(name)")
        .eq("auth_user_id", session.user.id)
        .single();

      if (!account || !account.is_active) {
        await supabase.auth.signOut();
        router.replace("/customer/login");
        return;
      }

      if (account.must_change_password && pathname !== "/customer/change-password") {
        router.replace("/customer/change-password");
        return;
      }

      setCompanyName((account.companies as any)?.name || "");
      setChecking(false);

      if (pathname === "/customer/quotes") setNotified((prev) => ({ ...prev, quotes: false }));
      if (pathname === "/customer/dispatches") setNotified((prev) => ({ ...prev, dispatches: false }));
      if (pathname === "/customer/invoices") setNotified((prev) => ({ ...prev, invoices: false }));
      if (pathname === "/customer/announcements") setNotified((prev) => ({ ...prev, announcements: false }));
    }
    check();
    setOpenGroup(null);
    setMobileMenuOpen(false);
  }, [pathname, router]);

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

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname || "")) return;

    const channel = supabase
      .channel("customer_layout_notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => {
        setNotified((prev) => (pathname === "/customer/quotes" ? prev : { ...prev, quotes: true }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatches" }, () => {
        setNotified((prev) => (pathname === "/customer/dispatches" ? prev : { ...prev, dispatches: true }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {
        setNotified((prev) => (pathname === "/customer/invoices" ? prev : { ...prev, invoices: true }));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, () => {
        setNotified((prev) => (pathname === "/customer/announcements" ? prev : { ...prev, announcements: true }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/customer/login");
  }

  if (PUBLIC_PATHS.includes(pathname || "")) {
    return <div className="portal-theme">{children}</div>;
  }

  if (checking) {
    return (
      <div className="portal-theme">
        <main className="container">
          <div className="empty-state">확인 중...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="portal-theme" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="top-nav">
        <div className="top-nav-inner" style={{ flexWrap: "wrap", gap: 16 }}>
          <a href="/customer" className="brand-link">
            <div className="brand">{companyName || "화주"} 포털</div>
            <div className="brand-sub">WeCarry 운송 통합 운영 시스템 · 홈으로</div>
          </a>
          <div
            ref={navGroupRef}
            className="nav-desktop-group"
            style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
          >
            {NAV_GROUPS.map((group) => (
              <NavDropdown
                key={group.label}
                group={group}
                pathname={pathname}
                hasNotice={group.items.some((i) => i.key && (notified as any)[i.key])}
                open={openGroup === group.label}
                onToggle={() => setOpenGroup((g) => (g === group.label ? null : group.label))}
              />
            ))}
            <a
              href="/customer/announcements"
              className={pathname === "/customer/announcements" ? "nav-chip nav-chip-active" : "nav-chip"}
              style={{ position: "relative" }}
            >
              공지사항
              {notified.announcements && (
                <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "var(--danger)" }} />
              )}
            </a>
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
          >
            {mobileMenuOpen ? "✕" : "☰"}
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
            {NAV_GROUPS.map((group) => (
              <div key={group.label} style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const active = pathname?.startsWith(item.href);
                  const hasDot = item.key && (notified as any)[item.key];
                  return (
                    <a
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
                      {hasDot && (
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--danger)" }} />
                      )}
                    </a>
                  );
                })}
              </div>
            ))}
            <a
              href="/customer/announcements"
              style={{
                padding: "10px 4px",
                marginTop: 10,
                fontSize: 14,
                fontWeight: pathname === "/customer/announcements" ? 700 : 500,
                color: pathname === "/customer/announcements" ? "var(--accent)" : "var(--text)",
                textDecoration: "none",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              공지사항
              {notified.announcements && (
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--danger)" }} />
              )}
            </a>
            <button
              onClick={handleLogout}
              style={{
                marginTop: 10,
                padding: "10px 4px",
                fontSize: 14,
                textAlign: "left",
                border: "none",
                background: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }}>{children}</div>

      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", marginTop: 40 }}>
        <div
          className="container"
          style={{
            padding: "32px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
              📞 고객센터
            </div>
            <a
              href="tel:1588-0000"
              className="num"
              style={{
                display: "block",
                fontSize: 24,
                fontWeight: 800,
                color: "#8a6d00",
                textDecoration: "none",
                marginBottom: 6,
              }}
            >
              1588-0000
            </a>
            <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600 }}>
              평일 09:00 ~ 18:00
              <span style={{ color: "var(--text-muted)", fontWeight: 500 }}> (주말·공휴일 휴무)</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
            WeCarry 운송 통합 운영 시스템 · 화주 포털
          </div>
        </div>
      </footer>
    </div>
  );
}
