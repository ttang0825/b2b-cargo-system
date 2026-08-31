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
        style={{ display: "flex", alignItems: "center", flex: "0 1 auto", minWidth: 0, color: "#0E0F12" }}>
        <BrandLogo className="landing-logo" />
      </Link>

      <nav className="landing-nav" style={{ display: "flex", alignItems: "center", gap: 32, flex: "0 0 auto" }}>
        <Link href="/quote" style={pill("#0E0F12", "#FFFFFF")}>무료 견적 문의</Link>
        <Link href="/customer/login" style={{ ...pill("#FFD834", "#0E0F12"), marginLeft: -22 }}>운송관리 로그인</Link>
      </nav>
    </header>
  );
}
