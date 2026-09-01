"use client";

import Link from "next/link";
import LegalLinks from "@/components/LegalLinks";
import { APPLY_CONSENT, TERMS_CONSENT } from "@/lib/legalInfo";

// 이용약관 + 개인정보 동의 블록 (18차).
//
// ⚠️ **지금 쓰는 곳은 `/apply` 하나뿐이다.** 처음엔 `/quote`도 함께 쓸 생각으로 만들었으나
// **사용자 결정(2026-08-26)으로 견적 문의에는 약관 동의를 넣지 않기로** 했다.
// 그래도 컴포넌트로 남겨둔 이유는 아래 두 규칙(체크박스 2개 · 문구는 상수)을 한 곳에
// 붙들어두기 위해서다 — 화면 JSX에 흩어지면 다음에 조용히 어긋난다.
//
// 🔴 **체크박스가 두 개인 것이 핵심이다. 하나로 합치지 말 것.**
// 개인정보보호법 제22조 1항이 **각각의 동의 사항을 구분해 알리고 각각 동의를 받도록**
// 하고 있다. 나중에 "UI 정리"로 묶으면 법적 요건이 깨진다.
//
// 🔴 **문구를 여기 적지 말 것** — `lib/legalInfo.ts`가 유일 정의처다. 버전 상수와 같은
// 파일에 있어야 문구를 고칠 때 버전을 같이 보게 된다(14차 판단).
//
// 🔴 **31차에 `variant="landing"` 이 생겼다 — 모양만 다르고 규칙은 같다.**
// 폼 3화면이 시안으로 바뀌면서 `.portal-theme` 팔레트(`--text-muted` 등)를 안 쓰게
// 됐는데, 그렇다고 화면에 동의 블록을 새로 그리면 위 두 규칙이 갈라진다. 그래서
// **한 컴포넌트 안에서 모양만 분기**했다. 새 화면이 또 생겨도 이 파일에 variant 를
// 더할 것 — 화면 JSX 로 옮기지 말 것.
//
// ⚠️ 약관·처리방침은 `portal` 에서는 **새 탭**으로 연다(같은 탭에서 열면 작성 중이던 폼이
// 날아간다). `landing` 에서는 30차 `LegalLinks` 모달로 여는데, **화면 이동 자체가 없어서
// 더 안전하다** — 조문은 두 경우 다 `lib/legal/` 하나를 본다.

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  fontSize: 12.5,
  color: "var(--text-muted)",
  cursor: "pointer",
  lineHeight: 1.5,
};

const linkStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  textDecoration: "underline",
  whiteSpace: "nowrap",
};

type Props = {
  /** 이용약관 동의 라벨. 지금은 `TERMS_CONSENT.applyLabel` 하나뿐이다 */
  termsLabel: string;
  termsAgreed: boolean;
  onTermsChange: (v: boolean) => void;
  /** 개인정보 동의 문구. `APPLY_CONSENT_TEXT` */
  privacyText: string;
  privacyAgreed: boolean;
  onPrivacyChange: (v: boolean) => void;
  /** 모양만 고른다. 규칙(체크박스 2개·문구 상수)은 어느 쪽이든 같다. */
  variant?: "portal" | "landing";
};

/** 시안 모양의 동의 카드 한 장. 🔴 라벨·설명 문구는 상수에서 온 것을 그대로 받는다. */
export function LandingConsentCard({
  checked,
  onChange,
  title,
  desc,
  doc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  desc?: string;
  doc: "terms" | "privacy";
}) {
  return (
    <div
      style={{
        padding: "18px 20px",
        border: `1px solid ${checked ? "#FFD834" : "#EBEAE7"}`,
        borderRadius: 16,
        background: checked ? "#FFFCEC" : "#FAFAF8",
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      <label className="landing-consent" style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
        <span
          style={{
            position: "relative",
            flex: "0 0 auto",
            width: 22,
            height: 22,
            border: `1.5px solid ${checked ? "#FFD834" : "#D8D7D1"}`,
            borderRadius: 7,
            background: checked ? "#FFD834" : "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s ease, border-color 0.15s ease",
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, opacity: 0, cursor: "pointer" }}
          />
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block", opacity: checked ? 1 : 0, pointerEvents: "none" }}>
            <path d="M5 12.6l4.4 4.4L19 7.4" stroke="#0E0F12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span style={{ flex: "1 1 auto", minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.02em", color: "#0E0F12" }}>
            {title}
            {/* 🔴 「필수」는 제목 안 대괄호가 아니라 **별도 배지**다(시안) — 상수의
                `[필수]` 접두사를 화면에 그대로 찍지 말 것. */}
            <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 600, color: "#8B8A85" }}>필수</span>
          </span>
          {desc && <span style={{ display: "block", marginTop: 4, fontSize: 13, lineHeight: 1.6, color: "#8B8A85" }}>{desc}</span>}
        </span>
        {/* 🔴 「전문 보기」는 30차 `LegalLinks` 모달이다 — 시안은 약관 초안을 화면 코드에
            통째로 들고 있었다. 조문은 `lib/legal/` 하나만 본다. */}
        <span className="landing-consent-doc" style={{ flex: "0 0 auto" }} onClick={(e) => e.preventDefault()}>
          <LegalLinks only={[doc]} label="전문 보기" linkClassName="landing-consent-doc-link" />
        </span>
      </label>
    </div>
  );
}

export default function PublicConsentFields({
  termsLabel,
  termsAgreed,
  onTermsChange,
  privacyText,
  privacyAgreed,
  onPrivacyChange,
  variant = "portal",
}: Props) {
  if (variant === "landing") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
        {/* 🔴 landing 변형은 제목·설명을 **두 줄로 나눠** 그린다(31차 리뷰 확정) — 그래서
            `termsLabel`/`privacyText`(=`[필수] …` 한 문장)를 쓰지 않고 상수의 조각을 쓴다.
            portal 변형은 예전 그대로 한 문장을 쓰므로 두 화면이 갈리지 않는다. */}
        <LandingConsentCard
          checked={termsAgreed}
          onChange={onTermsChange}
          title={TERMS_CONSENT.label}
          desc={TERMS_CONSENT.summary}
          doc="terms"
        />
        <LandingConsentCard
          checked={privacyAgreed}
          onChange={onPrivacyChange}
          title={APPLY_CONSENT.label}
          desc={APPLY_CONSENT.detail}
          doc="privacy"
        />
        {/* 🔴 거부권 안내(`refusal`)를 빼지 말 것 — 개인정보보호법 제15조 2항이 요구한다.
            두 동의에 함께 걸리는 문장이라 카드 아래에 한 번만 둔다. */}
        <p style={{ margin: "2px 0 0", paddingLeft: 2, fontSize: 12.5, lineHeight: 1.6, color: "#8B8A85" }}>
          {TERMS_CONSENT.refusal}
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, marginBottom: 18, display: "grid", gap: 10 }}>
      <div>
        <label style={rowStyle}>
          <input
            type="checkbox"
            checked={termsAgreed}
            onChange={(e) => onTermsChange(e.target.checked)}
            style={{ margin: "2px 0 0", width: "auto", flexShrink: 0 }}
          />
          <span>
            {termsLabel}{" "}
            <Link href="/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              약관 보기
            </Link>
          </span>
        </label>
        <p style={{ margin: "4px 0 0 24px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
          {TERMS_CONSENT.summary}
          <br />
          {TERMS_CONSENT.refusal}
        </p>
      </div>

      <label style={rowStyle}>
        <input
          type="checkbox"
          checked={privacyAgreed}
          onChange={(e) => onPrivacyChange(e.target.checked)}
          style={{ margin: "2px 0 0", width: "auto", flexShrink: 0 }}
        />
        <span>
          {privacyText}{" "}
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            처리방침 보기
          </Link>
        </span>
      </label>
    </div>
  );
}
