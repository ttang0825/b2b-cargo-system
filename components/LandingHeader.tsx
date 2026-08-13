"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

// 랜딩(/) 전용 헤더. 원칙 11번대로 랜딩은 TopNav가 숨겨지고 자체 헤더를 쓰므로,
// TopNav.tsx의 `.nav-mobile-toggle`/`.nav-desktop-group` 클래스를 그대로 가져다 쓰지
// 않고 랜딩 전용 클래스(`.landing-*`)로 새로 구현함 — 시각적 패턴과 "바깥 클릭 시
// 닫힘"(원칙 20번) 동작만 참고. 링크 4개가 flexWrap 없이 한 줄에 붙어있어 360px에서
// 81px 가로 오버플로우가 실제로 발생하던 문제를 해소하는 것이 이 컴포넌트의 목적.
// "견적 문의"(주 CTA)는 모바일에서도 접지 않고 항상 노출하고, 나머지 3개만 햄버거
// 드롭다운으로 접는다.
const MOBILE_LINKS = [
  { href: "/status", label: "문의·신청 현황" },
  { href: "/customer/login", label: "화주 로그인" },
  { href: "/apply", label: "화주 등록 신청" },
];

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
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
          {/* 데스크탑: 링크 3개를 그대로 노출 (760px 이하에서는 CSS로 숨김) */}
          <div className="landing-nav-desktop" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {MOBILE_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="guide-link">
                {link.label}
              </Link>
            ))}
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
                    href={link.href}
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

          {/* 주 CTA — 모바일에서도 접지 않고 항상 노출 */}
          <Link href="/quote" className="btn landing-nav-cta" style={{ padding: "9px 16px", fontSize: 13 }}>
            견적 문의
          </Link>
        </div>
      </div>
    </header>
  );
}
