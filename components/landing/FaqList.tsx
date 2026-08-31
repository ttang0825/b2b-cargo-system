"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { buildFaqs } from "./data";
import { INSURANCE_ENABLED } from "@/lib/insuranceInfo";

export default function FaqList() {
  // 🔴 보험 문항은 `INSURANCE_ENABLED` 가 false 인 동안 **문항 자체가 빠진다**(6 → 5문항).
  const faqs = buildFaqs(INSURANCE_ENABLED);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {faqs.map((f) => (
        /* name 속성으로 한 번에 하나만 열립니다 (배타적 아코디언). */
        <details key={f.q} name="wecarry-faq" className="landing-faq-item"
          style={{ background: "#ECEBE6", borderRadius: 16, overflow: "hidden", transition: "background 320ms ease" }}>
          <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, padding: "22px 26px", fontSize: 19.4, fontWeight: 500, letterSpacing: "-0.02em" }}>
            <span>{f.q}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flex: "0 0 auto", display: "block" }}>
              <path d="M3 5.5L7 9.5L11 5.5" stroke="#8B8A85" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <p style={{ margin: "0 26px 22px", paddingTop: 18, borderTop: "1px solid #DFDED8", fontSize: 17.4, lineHeight: 1.85, color: "#5A5955", textWrap: "pretty" } as CSSProperties}>
            {f.a}
          </p>
          {f.cta && (
            <Link href="/apply" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 236, margin: "0 26px 24px", padding: "14px 32px", background: "#FFD834", color: "#0E0F12", borderRadius: 999, fontSize: 16.8, fontWeight: 700, whiteSpace: "nowrap" }}>
              운송관리 계정 신청
            </Link>
          )}
        </details>
      ))}
    </div>
  );
}
