"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import BrandLogo from "@/components/BrandLogo";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";

/* 접수 완료 팝업 (견적문의 · 계정신청 공용) — 31차.
   시안 `components/landing/SubmitDone.tsx` 를 옮긴 것이다.

   🔴 **접수번호 블록을 넣지 않았다** — 시안에는 있지만 우리는 접수번호를 발급하지 않는다.
      어디에도 쓸 수 없는 번호를 보여주면 화주가 그걸로 조회하려다 막힌다.
   🔴 **「문의·신청 현황 조회」(`/status`) 안내를 다시 넣지 말 것 — 사용자 지시(2026-09-01).**
      30차 리뷰에 랜딩에서 그 링크를 뺀 데 이어, **공개 화면 전체에서 없애기로 확정**됐다.
      진행 상황은 담당자가 남겨주신 연락처로 안내한다(`message` 가 그 말을 한다).
   🔴 로고는 `<BrandLogo />` 다(시안은 `/landing/wecarry-logo.svg` 직접 참조) — 워드마크는
      `currentColor` 를 상속하는 인라인 SVG 여야 한다(27차). 전화번호도 상수 참조다. */

export default function SubmitDone({
  title,
  message,
  href = "/",
  extra,
}: {
  title: string;
  message: string;
  href?: string;
  /** 확인 버튼 아래에 덧붙일 것. `/quote` 가 계정 신청 유도 카드를 넣는다(원칙 42번 —
   *  옛 접수완료 화면에 있던 안내를 잃지 않기 위해서다). */
  extra?: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ position: "fixed", inset: 0, zIndex: 240, background: "rgba(12,13,15,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}
    >
      <div style={{ width: "100%", maxWidth: 520, background: "#FFFFFF", borderRadius: 22, boxShadow: "0 24px 60px rgba(12,13,15,0.28)", overflow: "hidden" }}>
        <div style={{ padding: "40px 40px 34px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 999, background: "#FFD834" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12.6l4.4 4.4L19 7.4" stroke="#0E0F12" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ marginTop: 22, fontSize: 26, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.03em" }}>{title}</div>
          <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.75, color: "#6C6B65", textWrap: "pretty" } as CSSProperties}>{message}</div>

          <Link href={href} style={{ display: "block", marginTop: 22, padding: 19, background: "#FFD834", color: "#0E0F12", borderRadius: 16, textAlign: "center", fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>
            확인
          </Link>

          {extra}
        </div>

        <div style={{ padding: "24px 40px 26px", borderTop: "1px solid #EEEDE9", background: "#FAFAF8", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <BrandLogo style={{ height: 38, width: "auto", display: "block", opacity: 0.9 }} />
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, color: "#8B8A85" }}>고객센터</span>
            <a href={`tel:${COMPANY_SUPPORT_PHONE.replace(/-/g, "")}`} style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: "#0E0F12" }}>
              {COMPANY_SUPPORT_PHONE}
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
