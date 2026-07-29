"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import NavCountBadge from "@/components/NavCountBadge";
import {
  getLastSeen,
  markSeen,
  getAcknowledgedRequestIds,
  acknowledgeRequestIds,
} from "@/lib/portalNotifications";

const PUBLIC_PATHS = ["/customer/login", "/customer/support-verify"];

type NotifyKey = "request" | "quotes" | "dispatches" | "invoices";

type NavItem = { href: string; label: string; key?: NotifyKey };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "운송 현황",
    items: [
      { href: "/customer/request", label: "발주 요청", key: "request" },
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

// pathname이 이 항목의 화면일 때 "확인함"으로 표시할 매핑
const PATH_TO_NOTIFY_KEY: Record<string, NotifyKey | "announcements"> = {
  "/customer/request": "request",
  "/customer/quotes": "quotes",
  "/customer/dispatches": "dispatches",
  "/customer/invoices": "invoices",
  "/customer/announcements": "announcements",
};

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
        <NavCountBadge count={groupTotal} />
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 190,
            padding: 6,
            zIndex: 30,
          }}
        >
          {group.items.map((item) => {
            const active = pathname?.startsWith(item.href);
            const count = item.key ? counts[item.key] || 0 : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-dropdown-item nav-dropdown-item-active" : "nav-dropdown-item"}
              >
                {item.label}
                <NavCountBadge count={count} />
              </Link>
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
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({
    request: 0,
    quotes: 0,
    dispatches: 0,
    invoices: 0,
    announcements: 0,
  });
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navGroupRef = useRef<HTMLDivElement>(null);

  // 항목별 배지 개수를 다시 계산 — quotes/dispatches/invoices/announcements는
  // "마지막 확인 시각 이후 변경된 행 수", 발주요청은 "대기중을 벗어났는데
  // 아직 확인 안 한 건 수"(공지사항과 달리 화주 본인이 직접 등록도 하는
  // 테이블이라 시각 비교만으로는 방금 등록한 대기중 건까지 안읽음으로 잡힘)
  async function loadCounts(company: string | null) {
    const epoch = "1970-01-01T00:00:00.000Z";
    const [quotesRes, dispatchesRes, invoicesRes, announcementsRes, requestRes] = await Promise.all([
      supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .gt("updated_at", getLastSeen("quotes") || epoch),
      supabase
        .from("dispatches")
        .select("id", { count: "exact", head: true })
        .gt("updated_at", getLastSeen("dispatches") || epoch),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .gt("updated_at", getLastSeen("invoices") || epoch),
      supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .gt("created_at", getLastSeen("announcements") || epoch),
      company
        ? supabase.from("portal_order_requests").select("id").eq("company_id", company).neq("status", "대기중")
        : Promise.resolve({ data: [] as { id: string }[] }),
    ]);

    const acknowledged = new Set(getAcknowledgedRequestIds());
    const requestUnread = ((requestRes.data as { id: string }[]) || []).filter(
      (r) => !acknowledged.has(r.id)
    ).length;

    setCounts({
      quotes: quotesRes.count || 0,
      dispatches: dispatchesRes.count || 0,
      invoices: invoicesRes.count || 0,
      announcements: announcementsRes.count || 0,
      request: requestUnread,
    });
  }

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
        .select("must_change_password, is_active, company_id, companies(name)")
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
      setCompanyId(account.company_id || null);
      setChecking(false);

      // 이 화면에 들어왔으면 해당 항목은 "확인함"으로 기록
      const notifyKey = PATH_TO_NOTIFY_KEY[pathname || ""];
      if (notifyKey === "request" && account.company_id) {
        const { data: settled } = await supabase
          .from("portal_order_requests")
          .select("id")
          .eq("company_id", account.company_id)
          .neq("status", "대기중");
        acknowledgeRequestIds(((settled as { id: string }[]) || []).map((r) => r.id));
      } else if (notifyKey) {
        markSeen(notifyKey);
      }

      loadCounts(account.company_id || null);
    }
    check();
    setOpenGroup(null);
    setMobileMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => loadCounts(companyId))
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatches" }, () => loadCounts(companyId))
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => loadCounts(companyId))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, () => loadCounts(companyId))
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_order_requests" }, () => loadCounts(companyId))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, companyId]);

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

  // 지금 보고 있는 화면의 항목은 배지를 0으로 눌러둠 — 이미 보고 있는데
  // 실시간 이벤트로 배지가 다시 뜨는 걸 방지 (기존 boolean 방식의 "현재
  // 페이지면 건드리지 않음" 동작을 렌더 시점 계산으로 대체)
  const currentNotifyKey = PATH_TO_NOTIFY_KEY[pathname || ""];
  const displayCounts = currentNotifyKey ? { ...counts, [currentNotifyKey]: 0 } : counts;

  return (
    <div className="portal-theme" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="top-nav">
        <div className="top-nav-inner" style={{ flexWrap: "wrap", gap: 16 }}>
          <Link href="/customer" className="brand-link">
            <div className="brand">{companyName || "화주"} 포털</div>
            <div className="brand-sub">WeCarry 운송 통합 운영 시스템 · 홈으로</div>
          </Link>
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
                counts={displayCounts}
                open={openGroup === group.label}
                onToggle={() => setOpenGroup((g) => (g === group.label ? null : group.label))}
              />
            ))}
            <Link
              href="/customer/announcements"
              className={pathname === "/customer/announcements" ? "nav-chip nav-chip-active" : "nav-chip"}
            >
              공지사항
              <NavCountBadge count={displayCounts.announcements || 0} />
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
                  const count = item.key ? displayCounts[item.key] || 0 : 0;
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
                      <NavCountBadge count={count} />
                    </Link>
                  );
                })}
              </div>
            ))}
            <Link
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
              <NavCountBadge count={displayCounts.announcements || 0} />
            </Link>
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
