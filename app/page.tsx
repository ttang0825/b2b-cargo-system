"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import "./landing.css";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import TmsShowcase from "@/components/landing/TmsShowcase";
import FaqList from "@/components/landing/FaqList";
import RatesModal from "@/components/landing/RatesModal";
import LegalLinks from "@/components/LegalLinks";
import { useReveal } from "@/components/landing/useReveal";
import { buildReasons, IMG, process, services, vehicles } from "@/components/landing/data";
import { INSURANCE_ENABLED } from "@/lib/insuranceInfo";
import { COMPANY_SUPPORT_HOURS, COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";

const PAD = "max(56px, calc((100% - 1200px) / 2))";

const h2: CSSProperties = { fontSize: 46.2, lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.035em" };

const heroBtn = (bg: string, fg: string, border: string, shadow?: string): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 330,
  padding: "23px 45px",
  border: `1px solid ${border}`,
  background: bg,
  color: fg,
  whiteSpace: "nowrap",
  borderRadius: 999,
  fontSize: 26,
  fontWeight: 600,
  boxShadow: shadow,
});

const ctaBtn = (bg: string): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 236,
  padding: "16px 32px",
  background: bg,
  color: "#0E0F12",
  whiteSpace: "nowrap",
  borderRadius: 999,
  fontSize: 18,
  fontWeight: 600,
});

const stepIcons = [
  <>
    <path d="M7 3.5h7.5L19 8v12.5H7z" />
    <path d="M14 3.5V8h5" />
    <path d="M10 12.5h6M10 16h4" />
  </>,
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8 12.2l2.8 2.8L16 9.6" />
  </>,
  <>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
    <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
    <circle cx="12" cy="15.2" r="1.2" />
  </>,
];

const steps = [
  { title: "1. 계정 신청", desc: "전화 또는 신청서로 계정을 신청해주세요" },
  { title: "2. 계정 발급", desc: "본사에서 계정을 생성해 아이디와 비밀번호를 보내드립니다" },
  { title: "3. 로그인", desc: "발급받은 아이디와 비밀번호로 홈페이지 우측 상단의 운송관리 로그인 버튼에서 로그인하세요" },
];

export default function LandingPage() {
  const [ratesOpen, setRatesOpen] = useState(false);

  // 🔴 보험 카드·FAQ 문항은 `INSURANCE_ENABLED` 가 false 인 동안 **배열에서 빠진다** —
  //    화면에서 숨기는 것이 아니라 DOM 에 렌더링하지 않는다(미가입 상태 노출은 표시광고
  //    문제이고 `display:none` 은 페이지 소스에 남는다).
  const reasons = buildReasons(INSURANCE_ENABLED);

  const reasonsRef = useReveal<HTMLDivElement>();
  const servicesRef = useReveal<HTMLDivElement>();
  const tmsImgRef = useReveal<HTMLImageElement>();
  const vehiclesRef = useReveal<HTMLDivElement>();

  return (
    <div className="landing-page" style={{ width: "100%", margin: "0 auto", overflowX: "clip", background: "#F4F3F0", color: "#0E0F12" }}>
      <LandingHeader />

      {/* ── 히어로 ─────────────────────────────────── */}
      <section id="top" className="landing-hero"
        style={{ position: "relative", height: 820, backgroundColor: "#F3F0E9", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: `120px ${PAD} 56px` }}>
        <div className="landing-hero-band"
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(1520px, calc(80% - 72px))", backgroundColor: "#F3F0E9", backgroundImage: `url('${IMG.heroMain}')`, backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: "82% center", pointerEvents: "none" }}>
          <div className="landing-hero-fade"
            style={{ position: "absolute", inset: 0, backgroundImage: `url('${IMG.heroAlt}')`, backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: "88% center", opacity: 0 }} />
        </div>
        <div className="landing-hero-scrim"
          style={{ position: "absolute", top: 0, bottom: 0, right: "calc(min(1520px, calc(80% - 72px)) - 320px)", width: 320, background: "linear-gradient(90deg, #F3F0E9 0%, rgba(243,240,233,0.98) 14%, rgba(243,240,233,0.86) 32%, rgba(243,240,233,0.58) 54%, rgba(243,240,233,0.26) 76%, rgba(243,240,233,0) 100%)", pointerEvents: "none" }} />

        <div className="landing-hero-copy" style={{ position: "relative", maxWidth: "min(760px, 44%)" }}>
          <h1 style={{ margin: 0, fontSize: "clamp(34px, 4.3vw, 68px)", lineHeight: 1.14, fontWeight: 600, letterSpacing: "-0.04em", color: "#0E0F12", whiteSpace: "nowrap" }}>
            출발부터 도착까지,<br />위캐리가 관리합니다.
          </h1>
          <p style={{ margin: "24px 0 0", fontSize: 18.2, lineHeight: 1.85, color: "rgba(21,24,33,0.7)" }}>
            전화 주시면 가능 차량과 운임을<br />확인해 바로 안내드립니다.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 34 }}>
            <Link href="/quote" style={heroBtn("#0E0F12", "#FFFFFF", "#0E0F12", "0 6px 27px rgba(21,24,33,0.18)")}>무료 견적 문의</Link>
            <a href={`tel:${COMPANY_SUPPORT_PHONE.replace(/-/g, "")}`} style={heroBtn("#FFFFFF", "#0E0F12", "#FFFFFF")}>
              전화 문의 {COMPANY_SUPPORT_PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* ── WHY WECARRY ────────────────────────────── */}
      <section className="landing-about" style={{ padding: `180px ${PAD} 0` }}>
        <div className="landing-about-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,380px) minmax(0,1fr)", gap: 64 }}>
          <div className="landing-about-head" style={{ position: "sticky", top: 110, alignSelf: "start" }}>
            <h2 style={{ ...h2, margin: "24px 0 18px", fontSize: 46.2, lineHeight: 1.15 }}>위캐리를 <br />선택하는 이유</h2>
          </div>
          <div ref={reasonsRef} style={{ display: "flex", flexDirection: "column" }}>
            {reasons.map((r) => (
              <div key={r.no} className="landing-reason-row"
                style={{ display: "grid", gridTemplateColumns: "52px minmax(0,1fr) 132px", alignItems: "start", gap: 24, padding: "26px 0", borderTop: "1px solid #E4E3DE" }}>
                <div style={{ fontSize: 20, lineHeight: 1.3, fontWeight: 700, letterSpacing: "-0.02em", color: "#0E0F12", paddingTop: 4 }}>{r.no}</div>
                <div>
                  <div style={{ fontSize: 26, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.03em", color: "#0E0F12" }}>{r.title}</div>
                  <div style={{ marginTop: 10, fontSize: 17.4, lineHeight: 1.8, color: "#6C6B65", whiteSpace: "pre-line", textWrap: "pretty" } as CSSProperties}>{r.desc}</div>
                </div>
                <div style={{ position: "relative", alignSelf: "center", width: 132, height: 96 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.img} alt={r.title} loading="lazy"
                    style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 132, height: 132, objectFit: "contain" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 위캐리 서비스 ──────────────────────────── */}
      <section id="work" style={{ padding: `150px ${PAD} 0` }}>
        <h2 style={{ ...h2, margin: "24px 0 40px" }}>위캐리 서비스</h2>
        <div ref={servicesRef} className="landing-work-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
          {services.map((s) => (
            <div key={s.title} className="landing-card-lift"
              style={{ display: "flex", flexDirection: "column", background: "#FFFFFF", border: "1px solid #E4E3DE", borderRadius: 18, overflow: "hidden" }}>
              <div style={{ position: "relative", aspectRatio: "4 / 3", backgroundColor: "#E3E2DD" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.img} alt={s.title} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", padding: 24 }}>
                <div style={{ fontSize: 24, lineHeight: 1.3, fontWeight: 700, letterSpacing: "-0.03em", color: "#0E0F12", wordBreak: "keep-all" }}>{s.title}</div>
                <div style={{ marginTop: 10, fontSize: 17.4, lineHeight: 1.7, color: "#6C6B65", wordBreak: "keep-all", textWrap: "pretty" } as CSSProperties}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 운송관리 시스템 ────────────────────────── */}
      <section id="manage" style={{ padding: `200px ${PAD} 0`, paddingBottom: 0 }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ ...h2, margin: "24px 0 0", textWrap: "balance" } as CSSProperties}>운송 발주부터 정산까지, 위캐리 운송관리 시스템</h2>
          <p style={{ margin: "18px auto 0", maxWidth: 640, fontSize: 18.6, lineHeight: 1.8, color: "#6C6B65", textWrap: "pretty" } as CSSProperties}>
            발주 요청부터 견적 확인, 배차 조회, 정산까지 한 화면에서 관리합니다.<br />PC와 모바일 모두 같은 화면으로 확인할 수 있습니다.
          </p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={tmsImgRef} src={IMG.tmsOverview} alt="위캐리 운송관리 프로그램 PC·모바일 화면"
          style={{ display: "block", width: "100%", maxWidth: 1200, height: "auto", margin: "36px auto 0" }} />

        <div className="landing-tms-lead" style={{ margin: "120px auto 0", textAlign: "center" }}>
          <div className="landing-lead-text" style={{ fontSize: 32.4, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.03em", color: "#0E0F12" }}>
            발주부터 정산까지, <br />한 화면에서 관리하세요
          </div>
        </div>

        <TmsShowcase />

        <div className="landing-tms-foot"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36, maxWidth: 1200, margin: "112px auto 0", padding: "72px 56px 76px", borderRadius: 28, background: "#0E0F12", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 34, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.035em", color: "#FFFFFF", wordBreak: "keep-all" }}>
              운송 관리 시스템, 어떻게 시작하나요?
            </div>
          </div>
          <div className="landing-tms-steps" style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
            {steps.map((s, i) => (
              <div key={s.title} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 24px 30px", borderRadius: 20, background: "rgba(255,255,255,0.07)" }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFD834" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {stepIcons[i]}
                </svg>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF" }}>{s.title}</div>
                <div style={{ fontSize: 15.5, lineHeight: 1.7, color: "rgba(255,255,255,0.62)", wordBreak: "keep-all" }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <Link href="/apply"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "22px 52px", background: "#FFD834", color: "#0E0F12", borderRadius: 999, fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
            운송관리 계정 신청
          </Link>
        </div>
      </section>

      {/* ── 차량 형태 ──────────────────────────────── */}
      <section id="vehicles" style={{ padding: `150px ${PAD}` }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
          <div>
            {/* 🔴 30차 리뷰: **시안 문구 그대로 되돌렸다**(사용자 지시). 30차 본작업에서
                「1톤부터 25톤까지」로 바꾸고 「특수차량」을 뺐던 자리다.
                ⚠️ 이 섹션이 말하는 것은 **차량 형태**다 — 아래 12장이 무진동·초장축·냉동탑
                처럼 특수한 **형태**를 실제로 담고 있어서 「특수차량까지」가 이 섹션에서는
                형태를 가리킨다. 차급 범위(1톤~25톤)는 WHY 02·FAQ·요금 가이드가 말한다.
                🔴 「전 차종」·「모든 차량」은 여전히 금지다(트레일러·크레인은 취급 범위 밖). */}
            <h2 style={{ ...h2, margin: "24px 0 12px" }}>1톤부터 5톤 이상, 특수차량까지<br />필요한 차량 형태로 배차해드립니다.</h2>
            <p style={{ margin: 0, fontSize: 18.6, lineHeight: 1.8, color: "#6C6B65" }}>
              그 밖의 차량 형태가 필요하시면 문의해 주세요. 빠르게 확인해 안내드립니다.
            </p>
          </div>
        </div>
        <div ref={vehiclesRef} className="landing-vehicle-grid" style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 12 }}>
          {vehicles.map((v) => (
            <div key={v.name}>
              <div className="landing-card-lift" style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 16, overflow: "hidden", background: "#ECEBE6" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.img} alt={v.name} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", color: "#0E0F12", wordBreak: "keep-all" }}>{v.name}</div>
              <div style={{ marginTop: 5, fontSize: 14, lineHeight: 1.5, color: "#6C6B65", wordBreak: "keep-all" }}>{v.desc}</div>
            </div>
          ))}
        </div>
        {/* 🔴 랜딩 이름(「5톤 윙바디」)과 발주 폼 선택지가 다르다 — 폼은 차급과 형태를
            **각각** 고르는 구조라 그 이름이 통째로 있지는 않다. 이름은 시안 그대로
            두기로 확정됐으므로(사용자), 그 간극을 이 한 줄이 메운다. 지우지 말 것. */}
        <p className="landing-vehicle-note"
          style={{ margin: "28px 0 0", fontSize: 16.2, lineHeight: 1.8, color: "#6C6B65", wordBreak: "keep-all" }}>
          발주 요청에서는 <strong style={{ fontWeight: 700, color: "#0E0F12" }}>차량 크기와 형태를 각각 선택</strong>합니다.
          예를 들어 「5톤 윙바디」는 <strong style={{ fontWeight: 700, color: "#0E0F12" }}>5톤 + 윙바디</strong>로 고르시면 됩니다.
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 56 }}>
          <button type="button" onClick={() => setRatesOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "19px 40px", border: "none", borderRadius: 999, background: "#0E0F12", fontFamily: "inherit", fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "#FFFFFF", cursor: "pointer" }}>
            차량 · 요금 가이드 <span style={{ fontSize: 18 }}>›</span>
          </button>
        </div>
      </section>

      {/* ── 진행 절차 ──────────────────────────────── */}
      <section id="process" style={{ background: "#0E0F12", padding: `150px ${PAD} 160px` }}>
        <h2 style={{ ...h2, margin: 0, color: "#FFFFFF" }}>이렇게 진행됩니다.</h2>
        <p style={{ margin: "16px 0 40px", fontSize: 18.6, lineHeight: 1.8, color: "rgba(255,255,255,0.55)" }}>
          각 단계의 내역이 운송관리 화면에 남습니다.
        </p>
        {process.map((p) => (
          <div key={p.no} className="landing-process-row"
            style={{ display: "grid", gridTemplateColumns: "minmax(200px, 320px) minmax(280px, 1fr)", gap: 48, padding: "40px 0", borderTop: "1px solid rgba(255,255,255,0.14)", alignItems: "baseline" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>{p.no}</span>
              <h3 style={{ margin: 0, fontSize: 29.2, fontWeight: 600, letterSpacing: "-0.03em", color: "#FFFFFF" }}>{p.title}</h3>
            </div>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.85, color: "rgba(255,255,255,0.66)", textWrap: "pretty" } as CSSProperties}>{p.desc}</p>
          </div>
        ))}
      </section>

      {/* ── FAQ ────────────────────────────────────── */}
      <section style={{ padding: `150px ${PAD} 170px` }}>
        <div className="landing-faq-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(0,1fr))", gap: 64, alignItems: "start" }}>
          <div>
            <h2 style={{ ...h2, margin: "24px 0 0", fontSize: 42, lineHeight: 1.25 }}>궁금하실 것들,<br />먼저 답해드립니다.</h2>
          </div>
          <FaqList />
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section className="landing-cta"
        style={{ position: "relative", backgroundColor: "#0B0D12", backgroundImage: `url('${IMG.ctaBg}')`, backgroundSize: "cover", backgroundPosition: "center 42%", backgroundRepeat: "no-repeat", padding: `190px ${PAD} 56px`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <h2 style={{ position: "relative", margin: 0, maxWidth: 820, fontSize: 58.8, lineHeight: 1.15, fontWeight: 600, letterSpacing: "-0.04em", color: "#FFFFFF", textWrap: "balance" } as CSSProperties}>
          지금 바로 견적을 받아보세요.
        </h2>
        <p style={{ position: "relative", margin: "22px 0 0", maxWidth: 520, fontSize: 18.2, lineHeight: 1.8, color: "rgba(255,255,255,0.78)" }}>
          상·하차지와 연락처만 남겨주시면 확인해 안내드립니다.<br />고객센터 {COMPANY_SUPPORT_PHONE} · {COMPANY_SUPPORT_HOURS}
        </p>
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 36 }}>
          <Link href="/quote" style={ctaBtn("#FFFFFF")}>무료 견적 문의</Link>
          <Link href="/apply" style={ctaBtn("#FFD834")}>운송관리 계정 신청</Link>
        </div>
        <div className="landing-cta-bottom"
          style={{ position: "relative", width: "100%", maxWidth: 1200, marginTop: 130, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.14)", display: "flex", flexWrap: "wrap", gap: "16px 32px", justifyContent: "space-between", alignItems: "center" }}>
          {/* 🔴 30차 리뷰 ④: 이 자리에 있던 이동 링크 8개(페이지 내부 앵커 4 +
              `/vehicles`·`/about`·`/status`·`/customer/login`)를 **전부 뺐다**(사용자 지시
              — "중복 기능이라 없어도 된다"). 앵커 4개와 `/vehicles`·`/about`·로그인은
              헤더에 그대로 있고, `/status` 는 `/quote`·`/apply` 헤더 칩과 두 접수완료
              화면에 있다. 🔴 여기에 다시 채우지 말 것.
              ⚠️ 푸터의 법정 표시사항(전자상거래법 제10조)은 "중복 기능"이 아니라
              **빼면 위법 소지**라 그대로 뒀다(`LandingFooter`). */}
          {/* 🔴 법적 문서는 기존 모달(`components/LegalLinks.tsx`)을 그대로 쓴다 —
              시안의 `LegalModal` 은 약관·방침이 「전문 준비 중」 자리표시자였다.
              우리에겐 `lib/legal/*` 에 전문이 있고, 페이지(`/terms` 등)와 같은 데이터를
              공유하므로 한쪽만 낡는 일이 없다. `lib/legal/` 은 한 줄도 안 고쳤다. */}
          <div className="landing-cta-links" style={{ display: "flex", flexWrap: "wrap", gap: 24, fontSize: 15.6, color: "rgba(255,255,255,0.6)" }}>
            <LegalLinks linkClassName="landing-legal-link" />
          </div>
        </div>
      </section>

      <LandingFooter />

      <RatesModal open={ratesOpen} onClose={() => setRatesOpen(false)} />
    </div>
  );
}
