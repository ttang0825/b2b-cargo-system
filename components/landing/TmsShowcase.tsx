"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tmsCards } from "./data";

/* 6개 아이콘 — 클릭 시 해당 카드로 이동하고, 스크롤 시 현재 카드에 맞춰 활성화됩니다.
   활성 상태 스타일(노랑 원 + 확대 + 라벨 노출)은 app/landing.css 의
   .landing-tms-features[data-pick="n"] 규칙이 담당합니다. */
const ICONS = [
  "M4.6 6a2.4 2.4 0 0 1 2.4-2.4h6.6l5.8 5.4V18a2.4 2.4 0 0 1-2.4 2.4H7A2.4 2.4 0 0 1 4.6 18zM13.4 3.8v5.2h5.4M12 12.4v4.4M9.4 14.6h5.2",
  "M4.6 6a2.4 2.4 0 0 1 2.4-2.4h6.6l5.8 5.4V18a2.4 2.4 0 0 1-2.4 2.4H7A2.4 2.4 0 0 1 4.6 18zM13.4 3.8v5.2h5.4M9.2 14.8l2.2 2.2 4-4.2",
  "M13.2 17.4V6.6a1.8 1.8 0 0 0-1.8-1.8H4.6a1.8 1.8 0 0 0-1.8 1.8v10.8M2.8 17.4h1.9M9.3 17.4h5M18.9 17.4h1.9M13.2 8.2h3.8a1.8 1.8 0 0 1 1.4.6l2 2.6a1.8 1.8 0 0 1 .4 1.1v4.9M9.3 17.4a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 1 1 4.6 0M18.9 17.4a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 1 1 4.6 0",
  "M2.8 8.4a2.4 2.4 0 0 1 2.4-2.4h13.6a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4H5.2a2.4 2.4 0 0 1-2.4-2.4zM2.8 10.2h18.4M6.4 14.4h3.6",
  "M4 20h16M7 20v-5.6M12 20V6.8M17 20v-8.4",
  "M18 10.2c0 4.2-4.6 8.6-5.7 9.6a.45.45 0 0 1-.6 0C10.6 18.8 6 14.4 6 10.2a6 6 0 0 1 12 0zM10.2 9.4a1.2 1.2 0 0 1 1.2-1.2h1.2a1.2 1.2 0 0 1 1.2 1.2v2.4a1.2 1.2 0 0 1-1.2 1.2h-1.2a1.2 1.2 0 0 1-1.2-1.2z",
];

/* 제목의 공백을 NBSP 로 바꿔 쉼표 뒤에서만 줄바꿈되게 합니다. */
const commaWrap = (s: string) => s.replace(/ /g, "\u00A0").replace(/,\u00A0/g, ", ");

export default function TmsShowcase() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [pick, setPick] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /* 좌우 꺽쇠를 카드 바깥 여백에 맞춰 배치·크기 조정 */
  const syncArrowBox = useCallback(() => {
    const t = trackRef.current;
    const stage = stageRef.current;
    if (!t || !stage || !t.children.length) return;
    const box = (t.children[0] as HTMLElement).firstElementChild as HTMLElement | null;
    if (!box) return;
    const br = box.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    stage.style.setProperty("--mImgTop", Math.round(br.top - sr.top) + "px");
    stage.style.setProperty("--mImgH", Math.round(br.height) + "px");
    const tr = t.getBoundingClientRect();
    const cardLeftAbs = tr.left + (t.clientWidth - (t.children[0] as HTMLElement).offsetWidth) / 2;
    const side = Math.max(0, cardLeftAbs - 6);
    const gap = side > 70 ? Math.min(26, side * 0.2) : 8;
    const cap = side > 160 ? 44 : 34;
    const aw = Math.max(18, Math.min(cap, side - gap - 4));
    stage.style.setProperty("--mAW", Math.round(aw) + "px");
    stage.style.setProperty("--mAX", Math.round(Math.max(6, cardLeftAbs - aw - gap) - sr.left) + "px");
  }, []);

  const currentIndex = (t: HTMLDivElement) => {
    const center = t.scrollLeft + t.clientWidth / 2;
    let cur = 0;
    let best = Infinity;
    Array.from(t.children).forEach((c, i) => {
      const el = c as HTMLElement;
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
      if (d < best) { best = d; cur = i; }
    });
    return cur;
  };

  const scrollToCard = (i: number) => {
    const t = trackRef.current;
    if (!t) return;
    const c = t.children[i] as HTMLElement | undefined;
    if (!c) return;
    t.scrollTo({ left: c.offsetLeft - (t.clientWidth - c.offsetWidth) / 2, behavior: "smooth" });
  };

  const goCard = (dir: number) => {
    const t = trackRef.current;
    if (!t || !t.children.length) return;
    scrollToCard(Math.min(t.children.length - 1, Math.max(0, currentIndex(t) + dir)));
  };

  /* 스크롤 위치에 따라 카드 확대/축소 + 활성 아이콘 갱신 */
  const onTrackScroll = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const center = t.scrollLeft + t.clientWidth / 2;
    setPick(currentIndex(t));
    setAtStart(t.scrollLeft <= 4);
    setAtEnd(t.scrollLeft >= t.scrollWidth - t.clientWidth - 4);
    Array.from(t.children).forEach((c) => {
      const el = c as HTMLElement;
      const d = Math.min(1, Math.abs(el.offsetLeft + el.offsetWidth / 2 - center) / (el.offsetWidth || 1));
      el.style.transformOrigin = "center center";
      el.style.transform = `scale(${(1 - d * 0.2).toFixed(3)})`;
      el.style.opacity = (1 - d * 0.35).toFixed(3);
    });
  }, []);

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;

    syncArrowBox();
    onTrackScroll();

    const ro = new ResizeObserver(() => syncArrowBox());
    ro.observe(t);
    if (t.children[0]) ro.observe(t.children[0]);

    const onResize = () => { syncArrowBox(); onTrackScroll(); };
    window.addEventListener("resize", onResize);
    t.addEventListener("scroll", onTrackScroll, { passive: true });
    const timer = window.setTimeout(onResize, 400);

    /* 드래그로 넘기기 */
    t.style.cursor = "grab";
    t.style.userSelect = "none";
    t.querySelectorAll("img").forEach((im) => { im.draggable = false; });
    let down = false;
    let sx = 0;
    let sl = 0;
    let moved = false;
    const onDragStart = (e: Event) => e.preventDefault();
    const onDown = (e: PointerEvent) => {
      if (getComputedStyle(t).overflowX !== "auto") return;
      down = true; moved = false; sx = e.clientX; sl = t.scrollLeft;
      t.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 3) { moved = true; t.setPointerCapture(e.pointerId); }
      if (moved) { t.scrollLeft = sl - dx; e.preventDefault(); }
    };
    const onUp = () => { down = false; t.style.cursor = "grab"; };
    const onClickCapture = (e: MouseEvent) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    };
    t.addEventListener("dragstart", onDragStart);
    t.addEventListener("pointerdown", onDown);
    t.addEventListener("pointermove", onMove);
    t.addEventListener("pointerup", onUp);
    t.addEventListener("pointercancel", onUp);
    t.addEventListener("click", onClickCapture, true);

    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      t.removeEventListener("scroll", onTrackScroll);
      t.removeEventListener("dragstart", onDragStart);
      t.removeEventListener("pointerdown", onDown);
      t.removeEventListener("pointermove", onMove);
      t.removeEventListener("pointerup", onUp);
      t.removeEventListener("pointercancel", onUp);
      t.removeEventListener("click", onClickCapture, true);
    };
  }, [syncArrowBox, onTrackScroll]);

  const arrowStyle = (side: "left" | "right", visible: boolean): React.CSSProperties => ({
    position: "absolute",
    zIndex: 3,
    top: "var(--mImgTop, 28px)",
    [side]: "var(--mAX, 6px)",
    width: "var(--mAW, clamp(20px, 3vw, 44px))",
    height: "var(--mImgH, min(50vh, 600px))",
    display: "flex",
    opacity: visible ? 1 : 0.28,
    pointerEvents: visible ? "auto" : "none",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    transition: "transform 240ms ease, opacity 240ms ease",
  });

  return (
    <>
      <div className="landing-tms-features" data-pick={String(pick)}
        style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "center", gap: 4, margin: "32px auto 0" }}>
        {tmsCards.map((c, i) => (
          <div key={c.no} onClick={() => { setPick(i); scrollToCard(i); }}
            style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, width: 140, padding: "10px 4px" }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 108, height: 108, borderRadius: 999, background: "#0E0F12", boxShadow: "0 8px 18px rgba(20,20,18,0.14)" }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#FFD834" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={ICONS[i]} />
              </svg>
            </span>
            <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.02em", color: "#0E0F12", wordBreak: "keep-all", textAlign: "center" }}>{c.no}</div>
          </div>
        ))}
      </div>

      <div className="landing-tms-showcase" style={{ position: "relative", marginTop: 12 }}>
        <div>
          <div ref={stageRef} className="landing-tms-stage" style={{ position: "relative", width: "100vw", marginLeft: "calc(50% - 50vw)" }}>
            <div className="landing-tms-feather" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "12vw", background: "linear-gradient(90deg, #F4F3F0 0%, rgba(244,243,240,0.92) 38%, rgba(244,243,240,0) 100%)", zIndex: 2, pointerEvents: "none" }} />
            <div className="landing-tms-feather" style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "12vw", background: "linear-gradient(270deg, #F4F3F0 0%, rgba(244,243,240,0.92) 38%, rgba(244,243,240,0) 100%)", zIndex: 2, pointerEvents: "none" }} />

            <button type="button" aria-label="이전" onClick={() => goCard(-1)} style={arrowStyle("left", !atStart)}>
              <svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" viewBox="6.4 3.4 9.2 17.2" fill="none" stroke="#0E0F12" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 4 7 12 15 20" />
              </svg>
            </button>
            <button type="button" aria-label="다음" onClick={() => goCard(1)} style={arrowStyle("right", !atEnd)}>
              <svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" viewBox="8.4 3.4 9.2 17.2" fill="none" stroke="#0E0F12" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 4 17 12 9 20" />
              </svg>
            </button>

            <div ref={trackRef} className="landing-tms-track"
              style={{ display: "flex", gap: 16, marginTop: 28, padding: "0 max(20px, calc(50vw - min(880px, 62vw) / 2))", overflowX: "auto", overflowY: "hidden", scrollBehavior: "smooth", scrollSnapType: "x mandatory" }}>
              {tmsCards.map((c, i) => (
                <div key={c.no} style={{ flex: "0 0 auto", width: "min(880px, 62vw)", scrollSnapAlign: "center", transition: "transform 320ms cubic-bezier(0.22,0.61,0.36,1), opacity 320ms ease" }}>
                  <div style={{ position: "relative", height: "min(50vh, 600px)", width: "100%", borderRadius: 16, border: "1px solid #E4E3DE", background: "#F7F6F3", overflow: "hidden", boxShadow: "38px 44px 64px -30px rgba(66,57,24,0.20), 20px 20px 34px -18px rgba(78,67,28,0.10), 6px 6px 12px -6px rgba(42,37,18,0.05)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.img} alt={c.shot} decoding="async"
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 88, background: "linear-gradient(180deg, rgba(247,246,243,0) 0%, rgba(247,246,243,0.96) 100%)", pointerEvents: "none" }} />
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 26 }}>
                    <div style={{ flex: "0 0 auto", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14.4, lineHeight: 2.6, letterSpacing: "0.08em", color: "#A8A79F" }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "#8B8A85" }}>{c.no}</div>
                      <h3 style={{ margin: "6px 0 0", fontSize: 28.1, lineHeight: 1.32, fontWeight: 600, letterSpacing: "-0.03em", textWrap: "balance" } as React.CSSProperties}>
                        {commaWrap(c.title)}
                      </h3>
                      <p style={{ margin: "12px 0 0", maxWidth: "100%", fontSize: 18, lineHeight: 1.8, color: "#6C6B65", whiteSpace: "pre-line" }}>{c.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
