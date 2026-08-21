"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { useScrolled } from "@/lib/useScrolled";

// 랜딩(/) 전용 헤더. 원칙 11번대로 랜딩은 TopNav가 숨겨지고 자체 헤더를 쓰므로,
// TopNav.tsx의 `.nav-mobile-toggle`/`.nav-desktop-group` 클래스를 그대로 가져다 쓰지
// 않고 랜딩 전용 클래스(`.landing-*`)로 새로 구현함 — 시각적 패턴과 "바깥 클릭 시
// 닫힘"(원칙 20번) 동작만 참고. 링크가 flexWrap 없이 한 줄에 붙어있어 360px에서
// 81px 가로 오버플로우가 실제로 발생하던 문제를 해소하는 것이 이 컴포넌트의 목적.
// "견적 문의"(주 CTA)는 모바일에서도 접지 않고 항상 노출하고, 나머지는 햄버거
// 드롭다운으로 접는다.
//
// **모바일 헤더에 눈에 보이는 항목을 더 넣지 말 것** — 로고 종횡비가 6.5:1이라
// 360px에서 로고 156 + 햄버거 44 + 견적 문의 87 = 287px을 쓰고 **남는 폭이 15px뿐**임
// (38차 실측. 27차 기록의 24px는 햄버거가 들어오기 전 값이라 무효). 신규 메뉴는 전부
// 드롭다운으로 들어가야 함 — 13차의 "운송관리 로그인"도 그래서 데스크탑 전용이다.
// 🟢 데스크탑은 여유가 크다(1280px에서 좌우 그룹 사이 551px).
//
// 라벨은 고객 접점 용어를 따름(용어정리 가이드 2-1·2-2): "화주 로그인"→"로그인",
// "화주 등록 신청"→"고객 등록"(28차)→**"운송관리 계정 신청"**(12차).
// 관리자 화면(app/admin/**)의 "화주"는 그대로 유지.
// ⚠️ 12차에 `/apply` 라벨을 화면 6곳에서 이 표현으로 통일했다 — 로그인과 신청이
// 둘 다 "운송관리로 가는 문"임을 용어로 잇기 위한 것이니 한 곳만 되돌리지 말 것.
type NavLink = { href: string; label: string };

// 드롭다운(모바일) 항목 4개 — 운송관리로 가는 두 문(로그인·계정 신청)을 위에 모은다.
// ⚠️ 13차에 「문의·신청 현황」(/status)을 뺐다 — 12차에 **푸터**에 같은 항목을 넣어뒀고,
// 헤더에 남겨두면 중복이다. 🔴 `PublicPageHeader`의 현황조회 칩은 그대로 두었다
// (그 화면들은 푸터까지 내려가지 않고도 바로 조회로 가야 하는 자리).
const MOBILE_LINKS: NavLink[] = [
  { href: "/customer/login", label: "운송관리 로그인" },
  { href: "/apply", label: "운송관리 계정 신청" },
  { href: "/about", label: "회사소개" },
  { href: "/vehicles", label: "차량·요금 안내" },
];

// 데스크탑에 텍스트 링크로 그대로 노출하는 항목.
// "운송관리 로그인"은 텍스트가 아니라 **테두리 버튼**으로 따로 빼고(아래 참고),
// "운송관리 계정 신청"은 헤더가 복잡해지는 것을 막기 위해 빼서 히어로 CTA로 유도한다.
const DESKTOP_LINKS: NavLink[] = MOBILE_LINKS.filter(
  (l) => l.href !== "/apply" && l.href !== "/customer/login"
);

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolled();
  const pathname = usePathname();

  // 이 헤더는 랜딩 말고 /about·/vehicles·법적 문서 3종도 함께 쓴다.
  // ⚠️ `?from=landing`은 "랜딩의 어느 지점에서 왔으니 돌아갈 때 그 자리로"라는 표시라
  // **랜딩에서 눌렀을 때만** 붙여야 한다(components/BackToHomeLink.tsx 참고).
  // 다른 화면에서 붙이면 홈에 가본 적도 없는데 뒤로가기를 하게 된다.
  const withReturn = (href: string) =>
    pathname === "/" && (href === "/customer/login" || href === "/apply")
      ? `${href}?from=landing`
      : href;

  // 메뉴 바깥의 빈 곳을 클릭하면 닫힘(TopNav·CustomerPortalShell과 동일한 동작, 원칙 20번)
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // 헤더가 스티키가 되면서 드롭다운도 화면에 계속 따라다니게 됐다 — 열어둔 채 스크롤하면
  // 본문을 가리므로 스크롤이 시작되면 닫는다(지시서 1-3)
  useEffect(() => {
    if (!menuOpen) return;
    function handleScroll() {
      setMenuOpen(false);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menuOpen]);

  return (
    // 스티키 동작·배경(11차부터 브랜드 옐로)·그림자는 `.public-header`가 담당하며
    // PublicPageHeader와 공유한다 — 헤더 색·높이는 그 클래스 한 곳만 고치면 된다
    <header className={scrolled ? "public-header public-header-scrolled" : "public-header"}>
      <div
        className="container"
        style={{
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* 시각 브랜딩은 로고(영문+한글 조합 워드마크)가 담당함. 로고 안에 "위캐리 운송"이
            이미 들어 있으므로 "운송" 텍스트를 따로 붙이지 말 것.
            검색·메타 title/description은 한글 "위캐리 운송"으로 따로 가는 의도된 이원화이며
            이번 로고 적용으로 바뀌지 않음.
            텍스트를 이미지로 바꿔서 스크린리더가 읽을 내용이 사라지므로, 로고 SVG는
            aria-hidden으로 두고 이 링크가 aria-label로 이름을 제공함 */}
        <Link
          href="/"
          aria-label="위캐리 운송 홈"
          style={{
            display: "inline-flex",
            alignItems: "center",
            // 터치 영역 44px 확보(26차에서 확보한 기준 유지)
            minHeight: 44,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <BrandLogo className="landing-brand-logo" />
        </Link>

        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          {/* 데스크탑: 링크를 그대로 노출 (760px 이하에서는 CSS로 숨김) */}
          <div className="landing-nav-desktop" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {DESKTOP_LINKS.map((link) => (
              <Link key={link.href} href={withReturn(link.href)} className="guide-link">
                {link.label}
              </Link>
            ))}
            {/* 운송관리 로그인 — 회색 텍스트 링크가 아니라 테두리 버튼(13차).
                ⚠️ `.btn`(옐로 헤더 위에서 글자가 배경과 같은 색)도, `.btn-ghost`
                (background: var(--bg)가 .portal-theme에서 #fffdf6이고 border: none)도
                쓸 수 없어서 `.public-header-status-link`와 같은 방식(흰 칩 + 옅은
                검정 테두리)으로 전용 클래스를 뒀다.
                🔴 모바일에는 이 버튼을 노출하지 않는다 — 360px 헤더 여유가 15px뿐이라
                자리가 없다. 모바일에서는 위 드롭다운 첫 항목이 같은 역할을 한다. */}
            <Link href={withReturn("/customer/login")} className="landing-nav-login">
              운송관리 로그인
            </Link>
          </div>

          {/* 모바일: 햄버거 버튼 + 드롭다운 (760px 초과에서는 CSS로 숨김) */}
          <div className="landing-nav-mobile" ref={menuRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="landing-nav-toggle"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
            {menuOpen && (
              <div className="landing-nav-dropdown">
                {MOBILE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={withReturn(link.href)}
                    className="landing-nav-dropdown-item"
                    // 항목을 선택해 이동할 때도 닫히도록(뒤로가기로 돌아왔을 때 열린 채 남지 않게)
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 주 CTA — 모바일에서도 접지 않고 항상 노출.
              ⚠️ `.btn`(=.portal-theme에서 검정 배경 + 옐로 글자)을 그대로 두면 11차에
              옐로로 바뀐 헤더 위에서 글자가 배경과 같은 색이 된다 — globals.css의
              `.public-header .landing-nav-cta`가 검정 배경 + 흰 글자로 덮어쓴다. */}
          <Link href="/quote" className="btn landing-nav-cta" style={{ padding: "9px 16px", fontSize: 13 }}>
            견적 문의
          </Link>
        </div>
      </div>
    </header>
  );
}
