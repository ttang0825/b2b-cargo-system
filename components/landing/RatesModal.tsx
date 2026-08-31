"use client";

import Link from "next/link";
import { startPrices } from "./data";

/* 「차량 · 요금 가이드」 버튼으로 열리는 팝업. */
export default function RatesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="landing-rates-overlay" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(12,13,15,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "64px 24px", overflowY: "auto" }}>
      <div className="landing-rates-modal" onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 720, background: "#F7F6F3", borderRadius: 24, padding: 44, boxShadow: "0 24px 60px rgba(12,13,15,0.28)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
          <div>
            <div style={{ fontSize: 30.2, fontWeight: 600, letterSpacing: "-0.03em" }}>차량·요금 안내</div>
            <p style={{ margin: "10px 0 0", fontSize: 17.4, lineHeight: 1.8, color: "#6C6B65" }}>
              차급별 운임이 어디서부터 시작하는지 안내합니다.
            </p>
          </div>
          <button type="button" onClick={onClose}
            style={{ flex: "0 0 auto", width: 36, height: 36, border: "none", borderRadius: 999, background: "#E9E8E3", fontFamily: "inherit", fontSize: 18, color: "#4A4945", cursor: "pointer" }}>✕</button>
        </div>

        <div className="landing-rate-price" style={{ marginTop: 30, background: "#FFFFFF", borderRadius: 16, padding: "26px 28px" }}>
          <div style={{ fontSize: 18.2, fontWeight: 600 }}>시작가</div>
          {startPrices.map((r) => (
            <div key={r.ton} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "13px 0", borderBottom: "1px solid #F3F2EE", fontSize: 16.8 }}>
              <span style={{ fontWeight: 600 }}>{r.ton}</span>
              <span style={{ color: "#0E0F12", fontWeight: 600 }}>{r.from}</span>
            </div>
          ))}
          <ul style={{ margin: "18px 0 0", paddingLeft: 18, fontSize: 15.6, lineHeight: 1.9, color: "#8B8A85" }}>
            <li>표시 금액은 10km 이내 기준 최소 운임이며, 부가가치세는 별도입니다.</li>
            <li>실제 운임은 운송 거리, 차량 종류, 상·하차 조건, 운송 시간대, 화물 특성에 따라 달라집니다.</li>
            <li>정확한 금액은 견적 시 안내해 드립니다.</li>
            <li>차급은 1톤부터 25톤까지 안내드립니다. 그 밖의 조건은 문의해 주시면 확인해 드립니다.</li>
          </ul>
        </div>

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
