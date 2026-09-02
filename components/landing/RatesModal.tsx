"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatStartPrice, START_PRICE_FOOTNOTE, START_PRICE_NOTE, type StartPrice } from "@/lib/startPrices";

/* 「차량 · 요금 가이드」 버튼으로 열리는 팝업.
   🔴 **기준가는 운임기준표에서 실시간으로 읽어온다**(32차) — 열릴 때마다
      `/api/public/start-prices` 를 부른다. 숫자를 여기에 적지 말 것.
   ⚠️ 이 컴포넌트는 클라이언트라 `rate_distance_tiers` 를 직접 못 읽는다(21차에 잠겼다).
      서버 라우트를 거치는 이유가 그것이다. */
export default function RatesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<StartPrice[]>([]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    /* ⚠️ `no-store` 를 빼지 말 것 — 빼면 담당자가 운임기준표를 고쳐도 옛 값이 그대로 뜬다. */
    fetch("/api/public/start-prices", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j?.prices?.length) setRows(j.prices as StartPrice[]); })
      .catch(() => { /* 🔴 낡은 숫자를 게시하느니 표를 안 그린다(lib/startPrices.ts) */ });
    return () => { alive = false; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="landing-rates-overlay" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(12,13,15,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "64px 24px", overflowY: "auto" }}>
      <div className="landing-rates-modal" onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 720, background: "#F7F6F3", borderRadius: 24, padding: 44, boxShadow: "0 24px 60px rgba(12,13,15,0.28)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
          <div>
            <div style={{ fontSize: 30.2, fontWeight: 600, letterSpacing: "-0.03em" }}>차량·요금 안내</div>
            {/* 🔴 표시가격 안내는 **제목 아래 세 줄 + 표 아래 한 줄**이다(사용자 지시
                2026-09-02). 문구는 `lib/startPrices.ts` 가 유일 정의처이고 `/vehicles` 도
                같은 상수를 읽는다 — 여기에 직접 적지 말 것.
                🔴 필수 넷이 두 상수에 나뉘어 있으니 둘을 같이 볼 것.
                🔴 `whiteSpace: "pre-line"` 을 빼지 말 것 — 빼면 세 줄이 한 문단으로 붙는다. */}
            <p style={{ margin: "10px 0 0", fontSize: 16.4, lineHeight: 1.85, color: "#6C6B65", whiteSpace: "pre-line" }}>
              {START_PRICE_NOTE}
            </p>
          </div>
          <button type="button" onClick={onClose}
            style={{ flex: "0 0 auto", width: 36, height: 36, border: "none", borderRadius: 999, background: "#E9E8E3", fontFamily: "inherit", fontSize: 18, color: "#4A4945", cursor: "pointer" }}>✕</button>
        </div>

        <div className="landing-rate-price" style={{ marginTop: 30, background: "#FFFFFF", borderRadius: 16, padding: "26px 28px" }}>
          {/* 🔴 「기준가」는 **금액 위에** 두고 글씨톤을 낮춘다(사용자 지시 2026-09-02) —
              금액이 주인공이고 이 말은 그 금액이 무엇인지 알려주는 라벨이다.
              그래서 큰 제목이 아니라 **열 머리**다. 행마다 반복하지 말 것. */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, paddingBottom: 10, borderBottom: "1px solid #EDECE8", fontSize: 13, fontWeight: 500, letterSpacing: "0.04em", color: "#8B8A85" }}>
            <span>차량</span>
            <span>기준가</span>
          </div>
          {/* 🔴 값을 못 읽었으면 표를 그리지 않는다 — 낡은 숫자를 게시하면
              게시가와 견적가가 갈려 그대로 표시가격 분쟁이 된다(lib/startPrices.ts). */}
          {!rows.length && (
            <div style={{ padding: "13px 0 2px", fontSize: 16.4, lineHeight: 1.8, color: "#6C6B65" }}>
              기준가를 불러오지 못했습니다. 정확한 금액은 견적으로 안내드립니다.
            </div>
          )}
          {rows.map((r) => (
            <div key={r.ton} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "13px 0", borderBottom: "1px solid #F3F2EE", fontSize: 16.8 }}>
              <span style={{ fontWeight: 600 }}>{r.ton}</span>
              <span style={{ color: "#0E0F12", fontWeight: 600 }}>{formatStartPrice(r.amount)}</span>
            </div>
          ))}
        </div>

        {/* 🔴 표를 그린 경우에만 붙는 한 줄 — 표를 보고 난 뒤 읽어야 뜻이 산다. */}
        {rows.length > 0 && (
          <p style={{ margin: "12px 2px 0", fontSize: 15.4, lineHeight: 1.8, color: "#6C6B65" }}>
            {START_PRICE_FOOTNOTE}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
          <Link href="/quote" style={{ padding: "15px 30px", background: "#FFD834", color: "#0E0F12", whiteSpace: "nowrap", borderRadius: 999, fontSize: 17.4, fontWeight: 700 }}>
            견적 문의하기 ›
          </Link>
          <button type="button" onClick={onClose}
            style={{ padding: "15px 30px", border: "1px solid #D8D7D1", borderRadius: 999, background: "none", fontFamily: "inherit", fontSize: 17.4, fontWeight: 500, color: "#0E0F12", cursor: "pointer" }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
