"use client";

import Link from "next/link";
import { TERMS_CONSENT } from "@/lib/legalInfo";

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
// ⚠️ 약관·처리방침 링크는 **새 탭으로 연다** — 같은 탭에서 열면 작성 중이던 폼이 날아간다.

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
};

export default function PublicConsentFields({
  termsLabel,
  termsAgreed,
  onTermsChange,
  privacyText,
  privacyAgreed,
  onPrivacyChange,
}: Props) {
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
