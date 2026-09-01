"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import BrandLogo from "@/components/BrandLogo";

const pill = (bg: string, fg: string): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 148,
  padding: "12px 24px",
  background: bg,
  color: fg,
  whiteSpace: "nowrap",
  borderRadius: 999,
  fontSize: 16.2,
  fontWeight: 700,
});

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="landing-header"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "18px max(56px, calc((100% - 1200px) / 2))",
        background: scrolled ? "rgba(255,255,255,0.94)" : "transparent",
        borderBottom: scrolled ? "1px solid rgba(21,24,33,0.08)" : "1px solid transparent",
        backdropFilter: "blur(28px) saturate(1.05)",
        transition: "background 0.25s ease, border-color 0.25s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      {/* 🔴 로고는 `<BrandLogo />`(인라인 SVG)다 — `currentColor` 를 상속받아야 배경이
          바뀌어도 보인다. `/landing/wecarry-logo.svg` 를 `<img>` 로 넣으면 색이 고정된다.
          🔴 SVG 는 aria-hidden 이고 **이 링크가 aria-label 로 이름을 제공한다**(27차). */}
      <Link href="/" aria-label="위캐리 운송 홈" className="landing-logo-link"
        /* 🔴 `flex: 0 0 auto` 다 — 예전에는 `0 1 auto` + `minWidth: 0` 이라 좁은 화면에서
            워드마크가 통째로 찌그러졌다(실측 430px 폭 61 · 390px 21 · **360px 0**).
            사용자가 「홈버튼 로고도 너무 작게 표시된다」로 신고한 것이 이것이다. */
        style={{ display: "flex", alignItems: "center", flex: "0 0 auto", color: "#0E0F12" }}>
        <BrandLogo className="landing-logo" />
      </Link>

      {/* 🔴 두 버튼 사이 간격을 인라인 `marginLeft: -22` 로 주지 말 것 — 데스크탑에서는
          `gap: 32` 와 상쇄되어 10px 이었지만, `app/landing.css` 가 1120px 이하에서 gap 을
          14 로 줄이는 순간 **-8px 이 되어 두 버튼이 서로 겹쳤다**(사용자 신고). 지금은
          gap 을 처음부터 10 으로 두어 데스크탑 렌더링은 그대로이고 겹침만 없앴다.
          🔴 짧은 라벨 span 을 지우지 말 것 — 520px 이하에서는 전체 라벨·로고·좌우 여백이
          한 줄에 들어가지 않는다(360px 실측: 로고 169 + 버튼 142 + 여백 32 = 343 > 328).
          CSS 로는 글자를 줄일 수 없어 두 벌을 그려 두고 미디어쿼리로 하나만 보여준다. */}
      <nav className="landing-nav" style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
        {/* 🔴 두 span 을 `aria-hidden` 으로 두고 **링크가 `aria-label` 로 이름을 준다** —
            CSS 로 숨긴 쪽도 DOM 에는 남아 있어서, 그냥 두면 스크린리더가
            「무료 견적 문의견적 문의」로 두 번 읽는다(27차 로고와 같은 처리). */}
        <Link href="/quote" aria-label="무료 견적 문의" style={pill("#0E0F12", "#FFFFFF")}>
          <span className="landing-nav-full" aria-hidden>무료 견적 문의</span>
          <span className="landing-nav-short" aria-hidden>견적 문의</span>
        </Link>
        <Link href="/customer/login" aria-label="운송관리 로그인" style={pill("#FFD834", "#0E0F12")}>
          <span className="landing-nav-full" aria-hidden>운송관리 로그인</span>
          <span className="landing-nav-short" aria-hidden>로그인</span>
        </Link>
      </nav>
    </header>
  );
}
