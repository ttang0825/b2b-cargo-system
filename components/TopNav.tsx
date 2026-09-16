"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchUnlinkedWonQuotes } from "@/lib/unlinkedWonQuotes";
import { supabaseAdminAuth } from "@/lib/supabaseAdminAuthClient";
import { onBadgeRefresh } from "@/lib/notifyBadgeRefresh";
import { getCurrentStaffInfo, onCurrentStaffChange, clearCurrentStaffCache } from "@/lib/currentStaff";
import NavCountBadge from "@/components/NavCountBadge";
import AdminIntakeToast, { type IntakeToastItem } from "@/components/AdminIntakeToast";
import {
  applyUnseenTitle,
  collectIntakeRises,
  isIntakeSoundOn,
  setIntakeSoundOn,
  playIntakeChime,
  type IntakeCounts,
} from "@/lib/adminIntakeAlert";

type NavItem = {
  href: string;
  label: string;
  key?: "applications" | "publicQuotes" | "portalRequests" | "approvedQuotes";
};
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
      { href: "/admin/quotes", label: "견적 관리", key: "approvedQuotes" },
      { href: "/admin/orders", label: "운송오더" },
      { href: "/admin/dispatches", label: "배차 관리" },
      { href: "/admin/invoices", label: "정산 관리" },
      // 🔴 차주 관리는 **정산 관리 아래**다(35차 리뷰 4라운드, 사용자 지시).
      //    위에서 아래로 운송 한 건이 흘러가는 순서(견적 → 오더 → 배차 → 정산)를
      //    끊지 않으려고 차주를 뒤로 뺀 것이다.
      { href: "/admin/drivers", label: "차주 관리" },
      { href: "/admin/settings/external-networks", label: "외부 정보망 관리" },
      // 🔴 **운임기준표가 맨 아래다**(36차 리뷰 2라운드, 사용자 지시 — *"상단메뉴
      //    운송운영 드롭다운 메뉴에서 「운임기준표」가 제일 아래로 가게 설정"*).
      //    그전에는 맨 위였다. 날마다 쓰는 화면이 아니라 값을 고칠 때만 여는 설정이라
      //    운송 흐름 네 개를 위로 올린 것이다.
      //    🔴 **원칙 14번과 `HANDOFF.md` §3 도 이 순서로 같이 고쳤다** — 코드를
      //       뒤집었으면 그것을 적어 둔 글도 같은 커밋에서 고친다(35차 교훈).
      { href: "/admin/rates", label: "운임기준표" },
    ],
  },
];

// 관리자(admin) role일 때만 노출되는 그룹 - middleware.ts에서도 /admin/staff는 관리자만
// 접근 가능하도록 별도로 막고 있음 (여기서는 화면단 노출만 제어)
const ADMIN_ONLY_GROUP: NavGroup = {
  label: "시스템",
  items: [
    { href: "/admin/dashboard", label: "운영 대시보드" },
    { href: "/admin/staff", label: "직원 계정 관리" },
    { href: "/admin/sms-logs", label: "문자 발송 이력" },
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
        <NavCountBadge count={groupTotal} />
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
                <NavCountBadge count={count} />
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
  const [counts, setCounts] = useState({
    portalRequests: 0,
    publicQuotes: 0,
    applications: 0,
    approvedQuotes: 0,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffName, setStaffName] = useState<string | null>(null);
  const navGroupRef = useRef<HTMLDivElement>(null);

  // ── 새 접수 알림 (38차 A장) ──────────────────────────────────────────────
  // 🔴 **새 폴링을 만들지 않는다.** 아래 `counts` 는 세 경로가 모두 흘러드는 한 곳이라
  //    (15초 폴링 · Realtime · `notifyBadgeRefresh`) 그 값이 늘어난 순간만 보면 된다.
  //    ⚠️ 38차 지시서는 *「15초 폴링 결과가 늘어난 순간」* 이라 적었는데 **그러면 가장
  //       급한 발주요청을 못 잡는다** — `portal_order_requests` 는 anon-locked 가
  //       아니라서 **폴링이 아니라 Realtime 구독**이다(실측 2026-09-16).
  //       🔴 폴링 쪽에 얹으라는 그 문장을 근거로 되돌리지 말 것.
  const [toasts, setToasts] = useState<IntakeToastItem[]>([]);
  const [unseen, setUnseen] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  // 🔴 **직전 건수는 `useRef` 에 둔다**(지시서 2-1) — `useState` 로 두면 값이 바뀔
  //    때마다 화면을 다시 그린다. 키가 **없는 것**과 **0인 것**을 갈라야 하므로
  //    (첫 조회에는 울리지 않는다) `Partial` 이다.
  const prevCountsRef = useRef<Partial<IntakeCounts>>({});
  const toastSeqRef = useRef(0);

  // ⚠️ **새 공개 경로(admin도 customer도 아닌 최상위 경로)를 추가하면 여기에도 반드시
  // 추가할 것**(원칙 11번). 빠뜨리면 관리자 메뉴가 그 공개 페이지 위에 그대로 얹혀서
  // 나타난다 — 28차에 회사소개·차량안내 화면을 만들면서, 30차에 법적 문서 3종을
  // 만들면서 실제로 두 번 겪었음.
  // ⚠️ 그 두 화면(`/about`·`/vehicles`)은 2026-09-08 에 삭제돼서 이 목록에서도 뺐다.
  const isPublicPath =
    pathname === "/admin/login" ||
    pathname?.startsWith("/customer") ||
    pathname === "/" ||
    pathname?.startsWith("/quote") ||
    pathname?.startsWith("/apply") ||
    pathname?.startsWith("/guide") ||
    // 🔴 견적서 공유 링크(2026-09-15) — 원칙 11번. 빼면 화주가 문자로 받아 연
    //    견적서 위에 **관리자 메뉴가 얹힌다.**
    pathname?.startsWith("/q/") ||
    pathname?.startsWith("/terms") ||
    pathname?.startsWith("/privacy") ||
    pathname?.startsWith("/email-policy");

  useEffect(() => {
    if (isPublicPath) return;

    async function loadPortalRequests() {
      const { count } = await supabase
        .from("portal_order_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "대기중");
      setCounts((prev) => ({ ...prev, portalRequests: count || 0 }));
    }
    // 🔴 화주가 「견적 승인」을 누르면 견적이 `수주` 로 바뀐다(27차 리뷰). 담당자에게는
    //    **그 뒤에 할 일(운송오더 생성)이 남았다는 것**이 알림이어야 한다.
    //    그래서 「수주인데 아직 운송오더가 없는 건」을 센다 — 담당자가 오더를 만들면
    //    배지가 저절로 사라진다.
    //    ⚠️ 담당자가 손으로 `수주` 로 바꾼 건도 같이 세어진다. 지금은 "누가 바꿨는지"를
    //       DB 에 남기지 않기 때문이고(컬럼이 필요하다 — 28차 조사 항목), 어느 쪽이든
    //       "오더를 만들어야 하는 건"이라 담당자가 할 일로는 똑같이 맞다.
    //    🔴 실패하면 0 으로 둔다 — 배지 하나 때문에 상단메뉴가 통째로 깨지면 안 된다.
    //    🔴 **세는 규칙은 `lib/unlinkedWonQuotes.ts` 한 곳에 있다**(34차 리뷰 1라운드).
    //       그 전에는 계산식이 이 파일 안에만 있어서 **배지는 숫자를 말하는데 그 숫자가
    //       어느 건인지 볼 화면이 없었다** — 신고 *"계속해서 알림 표시 4건이 남아 있다"*
    //       가 그것이다. 여기서 다시 적지 말 것(견적 목록·오더 목록·오더 상세가 같은
    //       함수를 쓴다).
    async function loadApprovedQuotes() {
      try {
        const { quotes, error } = await fetchUnlinkedWonQuotes();
        setCounts((prev) => ({
          ...prev,
          approvedQuotes: error ? 0 : quotes.length,
        }));
      } catch {
        setCounts((prev) => ({ ...prev, approvedQuotes: 0 }));
      }
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
    loadApprovedQuotes();

    // 공개문의·화주신청은 anon으로 직접 실시간 구독이 안 되는 테이블이라 15초마다 조용히 재조회
    const pollInterval = setInterval(() => {
      loadPublicQuotes();
      loadApplications();
    }, 15000);

    const channel = supabase
      .channel("topnav_portal_requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_order_requests" }, () => loadPortalRequests())
      // 화주가 견적을 승인하면 `quotes` 가, 담당자가 오더를 만들면 `orders` 가 바뀐다 —
      // 둘 다 이 배지의 입력이라 같이 구독한다.
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => loadApprovedQuotes())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadApprovedQuotes())
      .subscribe();

    // 관리자가 화주신청/공개문의를 방금 처리했으면 15초를 기다리지 않고 바로 배지 재조회
    const offBadgeRefresh = onBadgeRefresh(() => {
      loadPublicQuotes();
      loadApplications();
      loadPortalRequests();
      loadApprovedQuotes();
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

  // 소리 켜짐 여부는 브라우저에만 있는 값이라 첫 그림 뒤에 읽는다
  // (서버가 그린 HTML 과 달라지면 하이드레이션이 깨진다).
  useEffect(() => {
    setSoundOn(isIntakeSoundOn());
  }, []);

  // 🔴 **접수 건수가 늘어난 순간**만 잡는다 — 규칙 셋(첫 조회 · 감소 · 키별 판정)은
  //    `lib/adminIntakeAlert.ts` 의 `collectIntakeRises()` 한 곳에 있다.
  //    🔴 **여기에 다시 적지 말 것** — 화면에 묻으면 잴 수가 없어서 뺀 것이다.
  useEffect(() => {
    if (isPublicPath) return;
    const rises = collectIntakeRises(prevCountsRef.current, counts);
    if (rises.length === 0) return;
    const fired: IntakeToastItem[] = rises.map((r) => ({ id: ++toastSeqRef.current, ...r }));
    // 🔴 배너는 최근 셋까지만 쌓는다 — 더 쌓이면 화면 오른쪽이 통째로 덮인다.
    setToasts((t) => [...t, ...fired].slice(-3));
    setUnseen((n) => n + fired.reduce((sum, f) => sum + f.count, 0));
    // 🔴 소리는 꺼져 있을 수 있고 자동재생 정책에 막힐 수도 있다 — 어느 쪽이든
    //    배너와 탭 제목은 위에서 이미 떴다(완료조건 6번).
    if (isIntakeSoundOn()) void playIntakeChime();
  }, [counts, isPublicPath]);

  // 🔴 **다른 탭을 보고 있을 때 유일하게 보이는 신호**가 탭 제목이다.
  //    화면으로 돌아오면 원래대로 되돌린다.
  useEffect(() => {
    if (isPublicPath) return;
    function onVisible() {
      if (!document.hidden) setUnseen(0);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isPublicPath]);

  useEffect(() => {
    if (isPublicPath) return;
    applyUnseenTitle(unseen);
    // ⚠️ `pathname` 을 의존성에 넣은 것은 화면을 옮겨 Next 가 제목을 갈아끼운 뒤에
    //    다시 붙이기 위해서다. 안 보고 있는 동안 화면을 옮기는 일은 없으므로
    //    이것으로 충분하다 — 🔴 **주기적으로 다시 붙이는 타이머를 만들지 말 것**
    //    (새 되풀이 타이머 0개가 이 차수의 완료조건이라, 그 낱말을 주석에도 쓰지
    //    않는다 — 쓰면 완료조건의 `grep` 세기가 코드가 아니라 주석에 걸린다).
  }, [unseen, pathname, isPublicPath]);

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

  // 🔴 설치형 앱(홈 화면 추가)으로 열면 브라우저 뒤로가기 단추가 아예 없다 —
  // 그래서 화면 안에 뒤로가기를 둔다(2026-09-08 신고). 데스크탑은 브라우저 단추가
  // 있으므로 CSS로 숨긴다.
  // ⚠️ 히스토리가 없으면(앱을 이 화면에서 바로 켠 경우) 뒤로 갈 곳이 없으므로 홈으로 보낸다.
  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/admin");
  }

  // 🔴 **끄면 소리만 멈춘다** — 배지도 배너도 그대로다(38차 확정).
  //    배지는 이 차수보다 먼저 있던 기능이라 이 토글이 건드릴 것이 아니다.
  function toggleSound() {
    setSoundOn((on) => {
      const next = !on;
      setIntakeSoundOn(next);
      // 켜는 그 클릭이 곧 사용자 제스처다 — 여기서 한 번 울려 두면 자동재생 정책이
      // 풀리고, 담당자도 무슨 소리인지 미리 듣는다.
      if (next) void playIntakeChime();
      return next;
    });
  }

  const totalPending = counts.portalRequests + counts.publicQuotes + counts.applications;
  const visibleGroups = isAdmin ? [...NAV_GROUPS, ADMIN_ONLY_GROUP] : NAV_GROUPS;

  const soundToggleLabel = soundOn ? "새 접수 알림음 끄기" : "새 접수 알림음 켜기";

  return (
    <>
    <div className="top-nav">
      <div className="top-nav-inner" style={{ flexWrap: "wrap", gap: 16 }}>
        {/* 브랜드 표기를 로고로 교체(PR #77 리뷰). 로고 SVG는 aria-hidden이라 링크가
            aria-label로 이름을 제공함. "내부 관리자 (admin)"는 관리자 화면과 고객 화면을
            구분해주는 정보라 그대로 둠 */}
        <Link href="/admin" className="brand-link" aria-label="위캐리 운송 내부관리 홈">
          <BrandLogo className="topnav-brand-logo" />
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
          {/* 🔴 종 모양 하나로 끄고 켠다 — 수신 설정 화면을 새로 만들지 말 것
              (사용자 확정: **직원 전원 같은 알림** · 역할별 분기 없음). */}
          <button
            type="button"
            onClick={toggleSound}
            className="aintake-bell"
            aria-label={soundToggleLabel}
            aria-pressed={soundOn}
            title={soundToggleLabel}
          >
            {soundOn ? "🔔" : "🔕"}
          </button>
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

        {/* 모바일 상단 액션 — 뒤로 · 로그아웃 · 메뉴. 데스크탑에서는 통째로 숨기고
            기존 우측 메뉴(.nav-desktop-group)의 로그아웃을 그대로 쓴다.
            🔴 뒤로가기는 홈(/admin)에서는 그리지 않는다 — 갈 곳이 없다. */}
        <div className="nav-mobile-actions">
          {pathname !== "/admin" && (
            <button
              type="button"
              className="nav-mobile-icon-btn"
              onClick={handleBack}
              aria-label="뒤로 가기"
            >
              ←
            </button>
          )}
          <button type="button" className="nav-mobile-logout" onClick={handleLogout}>
            로그아웃
          </button>
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
                    <NavCountBadge count={count} />
                  </Link>
                );
              })}
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 10, paddingTop: 8 }}>
            {/* 🔴 데스크탑 종 모양은 `.nav-desktop-group` 안이라 모바일에서 통째로
                숨겨진다 — 여기에도 한 줄을 둬야 휴대폰에서 끌 수 있다. */}
            <button
              type="button"
              onClick={toggleSound}
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
              aria-pressed={soundOn}
            >
              {soundOn ? "🔔 새 접수 알림음 켜짐" : "🔕 새 접수 알림음 꺼짐"}
            </button>
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
    {/* 🔴 **배너는 `.top-nav` 바깥이다.** 안에 두면 `z-index: 30` 인 헤더의 쌓임
        맥락에 갇혀, 관리자 모달(전부 50 이상)보다 **위로 올라갈 수 없는 것이 아니라
        오히려 헤더와 함께 통째로 눌린다.** 밖에 두고 40 을 줘서 본문보다는 위,
        모달보다는 아래에 놓는다 — 담당자가 모달로 작업 중일 때 배너가 위로 튀면 안 된다. */}
    <AdminIntakeToast
      items={toasts}
      onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))}
    />
    </>
  );
}
