"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import "./landing.css";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import TmsShowcase from "@/components/landing/TmsShowcase";
import FaqList from "@/components/landing/FaqList";
import RatesModal from "@/components/landing/RatesModal";
import LegalLinks from "@/components/LegalLinks";
import BusinessInfoModal from "@/components/BusinessInfoModal";
import { useReveal } from "@/components/landing/useReveal";
import { useAutoMarquee } from "@/components/landing/useAutoMarquee";
import { buildReasons, IMG, process, services, vehicles } from "@/components/landing/data";
import { INSURANCE_ENABLED } from "@/lib/insuranceInfo";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";

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
  const [bizOpen, setBizOpen] = useState(false);

  // 🔴 보험 카드·FAQ 문항은 `INSURANCE_ENABLED` 가 false 인 동안 **배열에서 빠진다** —
  //    화면에서 숨기는 것이 아니라 DOM 에 렌더링하지 않는다(미가입 상태 노출은 표시광고
  //    문제이고 `display:none` 은 페이지 소스에 남는다).
  const reasons = buildReasons(INSURANCE_ENABLED);

  const reasonsRef = useReveal<HTMLDivElement>();
  const servicesRef = useReveal<HTMLDivElement>();
  const tmsImgRef = useReveal<HTMLImageElement>();
  const vehiclesRef = useReveal<HTMLDivElement>();
  // 🔴 **모바일 차량 목록 자동 슬라이드**(사용자 지시 2026-09-04).
  //    바깥(`vehiclesRef`)이 스크롤되는 상자이고 안쪽(`vehicleTrackRef`)이 실제로
  //    미끄러지는 줄이다 — 정수 픽셀은 스크롤이, 소수 픽셀은 안쪽 줄의 transform 이
  //    나눠 싣는다(`useAutoMarquee` 주석 참고. 둘로 나누지 않으면 덜덜거린다).
  //    🔴 `useReveal` 은 바깥에 걸려 있다 — 같은 요소에 두면 transform 이 서로 덮어쓴다.
  //    한 바퀴 기준점은 **사본 목록의 첫 장**이라 `vehicles.length` 다.
  const vehicleTrackRef = useRef<HTMLDivElement>(null);
  useAutoMarquee(vehiclesRef, vehicleTrackRef, vehicles.length);

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
          {/* 🔴 **한 줄로 고정한다**(사용자 지시 2026-09-02) — h1 과 같은 처리다.
              `<br />` 로 끊으면 서체가 CDN 에서 늦게 뜰 때 줄이 어긋나므로
              `white-space: nowrap` 으로 둔다. 🔴 모바일은 `app/landing.css` 가
              `normal` 로 되돌린다 — 좁은 화면에서 nowrap 이면 화면 밖으로 나간다. */}
          <p style={{ margin: "24px 0 0", fontSize: 18.2, lineHeight: 1.85, color: "rgba(21,24,33,0.7)", whiteSpace: "nowrap" }}>
            전화 주시면 가능 차량과 운임을 확인해 바로 안내드립니다.
          </p>
          {/* 🔴 **히어로에서 「무료 견적 문의」 버튼을 뺐다**(사용자 지시 2026-09-02).
              34차가 「히어로·마감 둘 다 견적 → 전화 순서로 통일」한 것을 바꾼 것이다.
              🔴 그래서 **히어로에 남는 유일한 행동이 전화**다 — 버튼을 검정 채움으로
                 올려 눈에 띄게 했다(뺀 견적 버튼이 쓰던 대비다). 새 버튼을 만들지 말 것.
              🟢 `/quote` 로 가는 길은 **헤더 CTA 와 마감 CTA** 에 그대로 있다. */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 34 }}>
            <a href={`tel:${COMPANY_SUPPORT_PHONE.replace(/-/g, "")}`} style={heroBtn("#0E0F12", "#FFFFFF", "#0E0F12", "0 6px 27px rgba(21,24,33,0.18)")}>
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
            {/* 🔴 **접힌 상태에 지금까지 보이던 것이 그대로 남는다** — 번호·제목·`desc`.
                27차 ⑬-5 가 동의 접이식에서 겪은 문제다(접으면 설명이 통째로 사라져
                무엇에 대한 항목인지 알 수 없게 됨). 펼치면 `detail` 이 더해질 뿐이다.
                🔴 `<details name="wecarry-why">` 를 쓴다 — FAQ 와 같은 **브라우저 기본
                배타 아코디언**이라 한 번에 하나만 열린다. 상태를 직접 관리하지 말 것.
                ⚠️ 검증할 때 `open=true` 를 한꺼번에 걸면 **마지막 하나만** 열린다(62차) —
                   하나씩 열어 잴 것. */}
            {reasons.map((r) => (
              <details key={r.no} name="wecarry-why" className="landing-reason-row"
                style={{ borderTop: "1px solid #E4E3DE" }}>
                <summary className="landing-reason-head"
                  style={{ display: "grid", gridTemplateColumns: "52px minmax(0,1fr) 132px", alignItems: "start", gap: 24, padding: "26px 0" }}>
                  <div style={{ fontSize: 20, lineHeight: 1.3, fontWeight: 700, letterSpacing: "-0.02em", color: "#0E0F12", paddingTop: 4 }}>{r.no}</div>
                  <div>
                    <div style={{ fontSize: 26, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.03em", color: "#0E0F12" }}>{r.title}</div>
                    <div style={{ marginTop: 10, fontSize: 17.4, lineHeight: 1.8, color: "#6C6B65", whiteSpace: "pre-line", textWrap: "pretty" } as CSSProperties}>{r.desc}</div>
                    {/* 🔴 **화살표는 제목 옆이 아니라 설명글 바로 아래다**(사용자 지시
                        2026-09-04 — 「설명 연장보기가 직관적」). 제목 옆에 있으면 제목을
                        펼치는 것처럼 읽히는데, 실제로 펼쳐지는 것은 **설명글의 뒷부분**이다.
                        🔴 `<summary>` 안에 있어야 클릭이 먹는다 — 밖으로 빼지 말 것.
                        🟢 열리면 `app/landing.css` 가 180° 돌려 ⌃ 로 바꾼다. */}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: "block", marginTop: 8 }}>
                      <path d="M3 5.5L7 9.5L11 5.5" stroke="#8B8A85" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ position: "relative", alignSelf: "center", width: 132, height: 96 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.img} alt={r.title} loading="lazy" decoding="async"
                      style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 132, height: 132, objectFit: "contain" }} />
                  </div>
                </summary>
                {/* 🔴 **펼침 내용은 카드가 아니라 설명글의 이어지는 부분이다**
                    (사용자 지시 2026-09-04 — 「원래 설명글 규격과 레이아웃대로 이어져서」).
                    ⚠️ **2026-09-02 의 「부가 설명 카드」 확정을 뒤집은 것이다** — 그때는
                    흰 카드 + 옅은 테두리로 띄워 `desc` 와 구분했는데, 구분이 되는 만큼
                    **다른 글처럼 보여서 「설명이 이어진다」는 느낌이 없었다.**
                    🔴 옛 기록(흰 카드 · 옐로 막대)을 근거로 되살리지 말 것.
                    🔴 **글자 규격을 `desc` 와 같게 유지할 것**(17.4 / 1.8 / #6C6B65) —
                       하나라도 다르면 다시 「다른 글」로 보인다.
                    🔴 들여쓰기 76px 은 `desc` 칼럼 시작점이다(번호 52 + gap 24) —
                       이게 있어야 두 글의 왼쪽 끝이 맞는다. 모바일은 아래 CSS 가 없앤다.
                    🔴 여는 순간 `summary` 의 아래 여백이 사라져야 두 글이 붙는다 —
                       `app/landing.css` 의 `[open]` 규칙이 그 일을 한다. 지우지 말 것.
                    🔴 `white-space: pre-line` 을 빼지 말 것 — `detail` 의 `\n` 이
                    문장을 가른다(둘이 같이 있어야 성립한다). */}
                <div className="landing-reason-detail"
                  style={{ margin: "6px 0 26px 76px", fontSize: 17.4, lineHeight: 1.8, color: "#6C6B65", whiteSpace: "pre-line", textWrap: "pretty" } as CSSProperties}>
                  {r.detail}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 위캐리 서비스 ──────────────────────────── */}
      <section id="work" style={{ padding: `150px ${PAD} 0` }}>
        <h2 style={{ ...h2, margin: "24px 0 40px" }}>위캐리 서비스</h2>
        <div ref={servicesRef} className="landing-work-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
          {services.map((s, i) => (
            <div key={s.title} className="landing-card-lift"
              style={{ display: "flex", flexDirection: "column", background: "#FFFFFF", border: "1px solid #E4E3DE", borderRadius: 18, overflow: "hidden" }}>
              {/* 🔴 **첫 카드 사진만 `loading="eager"` 다 — `lazy` 로 되돌리지 말 것.**
                  모바일에서 이 섹션이 y=2161px 에 있는데 그 거리가 브라우저 지연로딩
                  경계(약 1250px)와 거의 겹쳐서, **스크롤해서 카드가 보이는 순간에야 사진을
                  받기 시작한다.** 4G 실측에서 회색 상자가 평균 371ms 보였다(사용자 신고
                  「고정화물 배차 이미지가 나올 때 살짝 버벅임」의 정체다).
                  ⚠️ `fetchPriority="low"` 를 같이 준 것은 히어로 배경과 대역폭을 다투지
                     않게 하려는 것이다 — 빼면 첫 화면 그리기가 늦어질 수 있다.
                  🔴 둘째 카드부터는 그대로 `lazy` 다 — 넷 다 eager 로 만들지 말 것. */}
              {/* 🟢 2026-09-03 에 「고정화물 배차」 사진이 들어와 **4장 모두 `img` 가 있다.**
                  ⚠️ 그래도 이 분기를 지우지 말 것 — `img` 가 없으면 **사진 자리를 회색 상자로만
                  남기고** 깨진 이미지 아이콘이 뜨지 않게 `<img>` 자체를 그리지 않는 장치다.
                  카드를 새로 늘릴 때 사진이 늦게 오는 상황이 다시 생긴다.
                  🔴 자리표시자 문구를 넣지 말 것(사용자가 「일단 비어보이게」로 확정했다). */}
              <div style={{ position: "relative", aspectRatio: "4 / 3", backgroundColor: "#E3E2DD" }}>
                {s.img && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={s.img} alt={s.title} loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "low" : undefined} decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                )}
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
        <img ref={tmsImgRef} src={IMG.tmsOverview} alt="위캐리 운송관리 프로그램 PC·모바일 화면" decoding="async"
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
        {/* 🔴 **목록을 두 벌 이어 붙인다** — 모바일 자동 슬라이드가 한 바퀴 돌 때
            뒤쪽 사본이 이어져 **끊김이 보이지 않게** 하려는 것이다(`useAutoMarquee`).
            🔴 뒤쪽 12장은 `.landing-vehicle-dup` 이고 **데스크탑에서는 `display:none`**
               이다(`app/landing.css`) — 안 그러면 그리드가 2줄에서 4줄이 된다.
            🟢 `src` 가 앞쪽과 같아서 내려받는 이미지가 늘지 않는다(캐시).
            🔴 사본에는 `aria-hidden` 을 건다 — 스크린리더가 같은 차량을 두 번 읽는다. */}
        {/* 🔴 안쪽 `.landing-vehicle-track` 은 **데스크탑에서 `display: contents`** 라
            상자를 만들지 않는다 — 그래서 카드 24장이 바깥 6열 그리드에 그대로 들어간다.
            모바일에서만 flex 줄이 되어 transform 으로 미끄러진다. 지우지 말 것. */}
        <div ref={vehiclesRef} className="landing-vehicle-grid" style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 12 }}>
          <div ref={vehicleTrackRef} className="landing-vehicle-track">
          {[...vehicles, ...vehicles].map((v, i) => (
            <div key={`${v.name}-${i}`}
              className={i >= vehicles.length ? "landing-vehicle-dup" : undefined}
              aria-hidden={i >= vehicles.length ? true : undefined}>
              <div className="landing-card-lift" style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 16, overflow: "hidden", background: "#ECEBE6" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.img} alt={v.name} loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", color: "#0E0F12", wordBreak: "keep-all" }}>{v.name}</div>
              <div style={{ marginTop: 5, fontSize: 14, lineHeight: 1.5, color: "#6C6B65", wordBreak: "keep-all" }}>{v.desc}</div>
            </div>
          ))}
          </div>
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
      {/* 🔴 위아래 여백이 다른 섹션(150~200px)보다 짧다 — 사용자 지시(2026-09-01,
          "「이렇게 진행합니다」와 「궁금하실 것들」의 칸이 디자인 레이아웃상 조금 벙벙해
          보인다. 위 아래 여백을 조금만 더 줄이자"). 행 사이 간격도 40 → 30 으로 줄였다.
          🔴 다른 섹션까지 같이 줄이지 말 것 — 지시는 이 둘만이고 "전체 디자인을 해치지
             않는 선에서" 라는 단서가 붙어 있다. */}
      <section id="process" style={{ background: "#0E0F12", padding: `110px ${PAD} 118px` }}>
        <h2 style={{ ...h2, margin: 0, color: "#FFFFFF" }}>이렇게 진행됩니다.</h2>
        <p style={{ margin: "16px 0 40px", fontSize: 18.6, lineHeight: 1.8, color: "rgba(255,255,255,0.55)" }}>
          각 단계의 내역이 운송관리 화면에 남습니다.
        </p>
        {process.map((p) => (
          <div key={p.no} className="landing-process-row"
            style={{ display: "grid", gridTemplateColumns: "minmax(200px, 320px) minmax(280px, 1fr)", gap: 48, padding: "30px 0", borderTop: "1px solid rgba(255,255,255,0.14)", alignItems: "baseline" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>{p.no}</span>
              <h3 style={{ margin: 0, fontSize: 29.2, fontWeight: 600, letterSpacing: "-0.03em", color: "#FFFFFF" }}>{p.title}</h3>
            </div>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.85, color: "rgba(255,255,255,0.66)", textWrap: "pretty" } as CSSProperties}>{p.desc}</p>
          </div>
        ))}
      </section>

      {/* ── FAQ ────────────────────────────────────── */}
      {/* 위 진행 절차와 같은 이유로 여백을 줄였다(사용자 지시). */}
      <section className="landing-faq-section" style={{ padding: `110px ${PAD} 120px` }}>
        <div className="landing-faq-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(0,1fr))", gap: 52, alignItems: "start" }}>
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
        {/* 🔴 **운영시간을 이 화면에서만 뺐다**(사용자 지시 2026-09-02).
            ⚠️ `COMPANY_SUPPORT_HOURS` 상수 자체는 지우지 말 것 — `/about`·화주포털·
               로그인 화면이 같은 값을 쓴다. 여기서 안 그릴 뿐이다.
            🟢 섹션이 `textAlign: center` 라 번호는 이미 가운데 정렬이다. */}
        <p style={{ position: "relative", margin: "22px 0 0", maxWidth: 520, fontSize: 18.2, lineHeight: 1.8, color: "rgba(255,255,255,0.78)" }}>
          상·하차지와 연락처만 남겨주시면 확인해 안내드립니다.<br />고객센터 {COMPANY_SUPPORT_PHONE}
        </p>
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 36 }}>
          <Link href="/quote" style={ctaBtn("#FFFFFF")}>무료 견적 문의</Link>
          <Link href="/apply" style={ctaBtn("#FFD834")}>운송관리 계정 신청</Link>
        </div>
        <div className="landing-cta-bottom"
          style={{ position: "relative", width: "100%", maxWidth: 1200, marginTop: 130, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.14)", display: "flex", flexWrap: "wrap", gap: "16px 32px", justifyContent: "flex-end", alignItems: "center" }}>
          {/* 🔴 30차 리뷰 ④: 이 자리에 있던 이동 링크 8개(페이지 내부 앵커 4 +
              `/vehicles`·`/about`·`/status`·`/customer/login`)를 **전부 뺐다**(사용자 지시
              — "중복 기능이라 없어도 된다"). 앵커 4개와 `/vehicles`·`/about`·로그인은
              헤더에 그대로 있다. 🔴 여기에 다시 채우지 말 것.
              ⚠️ **`/status` 는 31차(62차 세션)에 라우트·조회 API·처리방침 행까지 통째로
              없앴다** — 이 주석이 한동안 「헤더 칩과 접수완료 화면에 있다」고 적어두어
              사실과 달랐다. 🔴 그 문장을 근거로 되살리지 말 것.
              ⚠️ 푸터의 법정 표시사항(전자상거래법 제10조)은 "중복 기능"이 아니라
              **빼면 위법 소지**라 그대로 뒀다(`LandingFooter`).
              🔴 그래서 이 줄은 `justify-content: flex-end` 다 — 링크가 하나만 남아
              `space-between` 이면 **왼쪽으로 붙는데, 배경 사진의 밝은 부분과 겹쳐
              글자가 안 보인다**(사용자 지적). 시안도 오른쪽 하단이다. 모바일은
              `app/landing.css` 가 가운데로 돌린다. */}
          {/* 🔴 법적 문서는 기존 모달(`components/LegalLinks.tsx`)을 그대로 쓴다 —
              시안의 `LegalModal` 은 약관·방침이 「전문 준비 중」 자리표시자였다.
              우리에겐 `lib/legal/*` 에 전문이 있고, 페이지(`/terms` 등)와 같은 데이터를
              공유하므로 한쪽만 낡는 일이 없다. `lib/legal/` 은 한 줄도 안 고쳤다. */}
          {/* 🔴 **네 번째로 「사업자정보」를 더했다**(사용자 확정 2026-09-02).
              30차 리뷰에 푸터에서 호스팅사업자·개인정보 보호책임자를 빼면서 전자상거래법
              제10조 1항의 **초기화면 표시**가 충족되지 않는 상태가 됐고, 되살리는 길 둘 중
              **「법적 문서 링크 옆에 사업자정보」로 확정**된 것이다.
              🔴 푸터 한 줄로 되돌리지 말 것 — 뺀 이유(푸터가 길어진다)가 그대로 유효하다. */}
          <div className="landing-cta-links" style={{ display: "flex", flexWrap: "wrap", gap: 24, fontSize: 15.6, color: "rgba(255,255,255,0.6)" }}>
            <LegalLinks linkClassName="landing-legal-link" />
            <button type="button" className="landing-legal-link"
              style={{ border: "none", background: "transparent", padding: 0, font: "inherit", color: "inherit", cursor: "pointer" }}
              onClick={() => setBizOpen(true)}>
              사업자정보
            </button>
          </div>
        </div>
      </section>

      <LandingFooter />

      <RatesModal open={ratesOpen} onClose={() => setRatesOpen(false)} />
      <BusinessInfoModal open={bizOpen} onClose={() => setBizOpen(false)} />
    </div>
  );
}
