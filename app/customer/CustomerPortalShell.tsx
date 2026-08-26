"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import PublicPageHeader from "@/components/PublicPageHeader";
import PortalIcon, { PortalIconName } from "@/components/PortalIcon";
import {
  getLastSeen,
  markSeen,
  getAcknowledgedRequestIds,
  acknowledgeRequestIds,
} from "@/lib/portalNotifications";
import { COMPANY_SUPPORT_PHONE, COMPANY_SUPPORT_HOURS } from "@/lib/contactInfo";

const PUBLIC_PATHS = ["/customer/login", "/customer/support-verify"];

type NotifyKey = "request" | "quotes" | "dispatches" | "invoices";

type NavItem = { href: string; label: string; icon: PortalIconName; key?: NotifyKey };

// 🔴 **4그룹 8항목. 그룹 라벨 텍스트는 없다** — 그룹 사이를 1px 구분선 + 위아래 12px
// 여백으로만 나눈다(시안 §6). 배열을 중첩으로 둔 것이 곧 구분선 위치다.
//
// 🔴 **캘린더·공지사항·비밀번호 변경이 메뉴에서 빠진 것은 확정이다**(2026-08-26).
// 라우트는 셋 다 살아 있다 — "안 쓰는 라우트"로 보고 지우지 말 것.
//   · 공지사항  → 홈의 공지 블록이 진입로다
//   · 캘린더    → 25차에 월별 통계 화면 하단으로 들어간다. ⚠️ 그때까지는 진입 경로가 없다
//   · 비밀번호 변경 → 아래 사이드바 하단·바텀시트에 링크로 남겼다.
//     지우면 must_change_password 인 신규 계정의 첫 로그인이 갇힌다(21차)
const NAV_GROUPS: NavItem[][] = [
  [{ href: "/customer", label: "홈", icon: "home" }],
  [
    { href: "/customer/request", label: "발주 요청", icon: "request", key: "request" },
    { href: "/customer/quotes", label: "견적 확인", icon: "quotes", key: "quotes" },
    { href: "/customer/dispatches", label: "배차·운송 조회", icon: "dispatch", key: "dispatches" },
  ],
  [
    { href: "/customer/invoices", label: "정산·결제내역", icon: "invoices", key: "invoices" },
    { href: "/customer/stats", label: "월별 통계", icon: "stats" },
  ],
  [
    { href: "/customer/locations", label: "배송지·화물 관리", icon: "locations" },
    { href: "/customer/profile", label: "담당자 정보", icon: "profile" },
  ],
];

// 모바일 하단 탭 5개 — 마지막 "전체"는 화면 이동이 아니라 바텀시트 토글이다.
const MOBILE_TABS: { href: string; label: string; icon: PortalIconName; key?: NotifyKey }[] = [
  { href: "/customer", label: "홈", icon: "home" },
  { href: "/customer/request", label: "발주", icon: "request", key: "request" },
  { href: "/customer/quotes", label: "견적", icon: "quotes", key: "quotes" },
  { href: "/customer/dispatches", label: "운송", icon: "dispatch", key: "dispatches" },
];

// pathname이 이 항목의 화면일 때 "확인함"으로 표시할 매핑
const PATH_TO_NOTIFY_KEY: Record<string, NotifyKey | "announcements"> = {
  "/customer/request": "request",
  "/customer/quotes": "quotes",
  "/customer/dispatches": "dispatches",
  "/customer/invoices": "invoices",
  "/customer/announcements": "announcements",
};

// 홈(`/customer`)은 다른 모든 경로의 접두어라 startsWith 로 판정하면 항상 활성이 된다.
function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/customer") return pathname === "/customer";
  return pathname.startsWith(href);
}

function NavList({
  pathname,
  counts,
  onNavigate,
}: {
  pathname: string | null;
  counts: Record<string, number>;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi} className="pv2-nav-group">
          {group.map((item) => {
            const active = isActive(pathname, item.href);
            const count = item.key ? counts[item.key] || 0 : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={active ? "pv2-nav-item pv2-nav-item-active" : "pv2-nav-item"}
              >
                <span className="pv2-nav-item-icon">
                  <PortalIcon name={item.icon} selected={active} size={21} />
                </span>
                <span className="pv2-nav-item-label">{item.label}</span>
                {count > 0 && <span className="pv2-nav-badge">{count}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </>
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetCloseRef = useRef<HTMLButtonElement>(null);

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
    setSheetOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

  // 바텀시트가 열리면 배경 스크롤을 잠그고 ESC 로 닫는다.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetCloseRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSheetOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

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

  // 로그인 전 화면(로그인·지원접속 확인)은 포털 셸(사이드바·알림 배지)을 건너뛴다.
  // 다만 **공개 화면 공용 헤더는 붙인다**(12차) — 랜딩의 옐로 헤더를 보고 넘어왔는데
  // 여기서 헤더가 사라지면 브랜드 연속성이 끊기고, 헤더 로고가 홈으로 돌아가는 길도 된다.
  // `.public-header` 클래스를 공유하므로 헤더 색·높이는 자동으로 따라온다.
  //
  // 🔴 색인 차단에는 영향이 없다 — noindex는 `app/customer/layout.tsx`의 metadata가
  // 결정하고 `/customer/login`에는 자체 layout이 없어 부모 설정을 그대로 상속한다.
  //
  // ⚠️ 현황조회 칩은 끈다(showStatusLink={false}) — 로그인하러 온 사람에게
  // 비회원 조회로 새는 링크를 주지 않기 위함.
  if (PUBLIC_PATHS.includes(pathname || "")) {
    return (
      <div className="portal-theme">
        <PublicPageHeader showStatusLink={false} />
        {children}
      </div>
    );
  }

  if (checking) {
    return (
      <div className="portal-v2">
        <div className="pv2-main">
          <div className="pv2-empty">확인 중...</div>
        </div>
      </div>
    );
  }

  // 지금 보고 있는 화면의 항목은 배지를 0으로 눌러둠 — 이미 보고 있는데
  // 실시간 이벤트로 배지가 다시 뜨는 걸 방지
  const currentNotifyKey = PATH_TO_NOTIFY_KEY[pathname || ""];
  const displayCounts = currentNotifyKey ? { ...counts, [currentNotifyKey]: 0 } : counts;
  const mobileTabTotal = MOBILE_TABS.reduce((s, t) => s + (t.key ? displayCounts[t.key] || 0 : 0), 0);
  const allBadgeTotal =
    NAV_GROUPS.flat().reduce((s, i) => s + (i.key ? displayCounts[i.key] || 0 : 0), 0) - mobileTabTotal;

  const accountLinks = (onNavigate?: () => void) => (
    <div className="pv2-foot-links">
      <Link href="/customer/change-password" className="pv2-foot-link" onClick={onNavigate}>
        비밀번호 변경
      </Link>
      <span className="pv2-foot-sep">·</span>
      <button type="button" onClick={handleLogout} className="pv2-foot-link">
        로그아웃
      </button>
    </div>
  );

  return (
    <div className="portal-v2">
      {/* 태블릿·모바일 상단 로고 헤더 */}
      <header className="pv2-mobile-header">
        <Link href="/customer" aria-label="위캐리 운송관리 홈">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/portal/wecarry-system-logo.svg" alt="위캐리 운송관리" className="pv2-mobile-logo" />
        </Link>
        <span className="pv2-mobile-company">{companyName}</span>
      </header>

      <div className="pv2-shell">
        <aside className="pv2-sidebar">
          <div className="pv2-sidebar-head">
            <Link href="/customer" className="pv2-logo-btn" aria-label="위캐리 운송관리 홈">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/portal/wecarry-system-logo.svg" alt="위캐리 운송관리" className="pv2-logo" />
            </Link>
            <div className="pv2-company">{companyName}</div>
          </div>

          <nav className="pv2-nav" aria-label="운송관리 메뉴">
            <NavList pathname={pathname} counts={displayCounts} />
          </nav>

          <div className="pv2-sidebar-foot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/portal/wecarry-eng-cropped.svg" alt="WeCarry" className="pv2-eng-logo" />
            <div>
              <div className="pv2-foot-label">고객센터 · {COMPANY_SUPPORT_HOURS}</div>
              <a href={`tel:${COMPANY_SUPPORT_PHONE}`} className="pv2-foot-phone">
                {COMPANY_SUPPORT_PHONE}
              </a>
            </div>
            {accountLinks()}
          </div>
        </aside>

        <main className="pv2-main">
          <div className="pv2-main-inner">{children}</div>
        </main>
      </div>

      {/* 모바일 하단 탭바 — 선택 표시는 아이콘 채움 + 텍스트 진해짐만 (시안 §7) */}
      <nav className="pv2-tabbar" aria-label="운송관리 하단 메뉴">
        {MOBILE_TABS.map((tab) => {
          const active = !sheetOpen && isActive(pathname, tab.href);
          const count = tab.key ? displayCounts[tab.key] || 0 : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={active ? "pv2-tab pv2-tab-active" : "pv2-tab"}
            >
              <span className="pv2-tab-icon" style={{ position: "relative" }}>
                <PortalIcon name={tab.icon} selected={active} size={26} />
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -4,
                      minWidth: 8,
                      height: 8,
                      borderRadius: 99,
                      background: "var(--pv2-yellow)",
                      border: "1.5px solid var(--pv2-surface)",
                    }}
                  />
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
        {/* ⚠️ "전체"는 화면 이동이 아니라 토글이다 — 선택 상태는 시트가 열려 있는 동안만 */}
        <button
          type="button"
          onClick={() => setSheetOpen((o) => !o)}
          aria-expanded={sheetOpen}
          className={sheetOpen ? "pv2-tab pv2-tab-active" : "pv2-tab"}
        >
          <span className="pv2-tab-icon" style={{ position: "relative" }}>
            <PortalIcon name="menu" selected={sheetOpen} size={26} />
            {allBadgeTotal > 0 && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: -2,
                  right: -4,
                  minWidth: 8,
                  height: 8,
                  borderRadius: 99,
                  background: "var(--pv2-yellow)",
                  border: "1.5px solid var(--pv2-surface)",
                }}
              />
            )}
          </span>
          전체
        </button>
      </nav>

      {/* 전체 메뉴 — 전체화면이 아니라 바텀시트 */}
      {sheetOpen && (
        <>
          <div className="pv2-sheet-backdrop" onClick={() => setSheetOpen(false)} />
          <div className="pv2-sheet" role="dialog" aria-modal="true" aria-label="전체 메뉴">
            <div className="pv2-sheet-handle" />
            <div className="pv2-sheet-head">
              <span className="pv2-sheet-title">전체 메뉴</span>
              <button
                type="button"
                ref={sheetCloseRef}
                onClick={() => setSheetOpen(false)}
                className="pv2-sheet-close"
                aria-label="전체 메뉴 닫기"
              >
                ✕
              </button>
            </div>
            <div className="pv2-sheet-body">
              <NavList
                pathname={pathname}
                counts={displayCounts}
                onNavigate={() => setSheetOpen(false)}
              />
              {/* 🔴 모바일에는 사이드바 하단이 없으므로 여기에 둘 다 넣는다 */}
              <div className="pv2-nav-group" style={{ padding: "0 10px" }}>
                {accountLinks(() => setSheetOpen(false))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
