"use client";

import { useState } from "react";

/**
 * @param inputStyle 입력창 인라인 스타일. 🔴 31차 `/customer/login` 이 `.field` 래퍼 없이
 *   시안 스타일을 입히려고 더했다(추가만 하는 방식 — `BrandLogo` 의 `style` 과 같다).
 *   ⚠️ `paddingRight` 는 눈 아이콘 자리라 덮어쓰지 말 것.
 *
 * @param autoComplete 🔴 **로그인 화면에서는 반드시 `"current-password"` 를 넘길 것.**
 *   빠져 있으면 아이폰·안드로이드 비밀번호 저장소가 이 칸을 비밀번호로 확신하지 못해
 *   **저장 제안도 자동 채우기도 잘 뜨지 않는다.** 아이폰은 홈 화면에 추가한 앱 창이
 *   사파리와 **저장 공간이 완전히 분리**되어 로그인이 처음부터 다시라(2026-09-08 신고),
 *   그 창에서 자동 채우기가 뜨는지가 실사용 편의를 가른다 — 비밀번호 저장소(키체인)는
 *   기기 전체가 공유하므로 이 한 가지는 칸막이를 넘어간다.
 *   ⚠️ 비밀번호 **변경** 화면에는 `"new-password"` 를 넘길 것 — 안 그러면 새 비밀번호
 *   칸에 옛 비밀번호가 채워진다.
 *   🔴 기본값을 두지 말 것 — 로그인과 변경 화면의 올바른 값이 서로 다르다.
 * @param name/@param id 비밀번호 저장소가 아이디 칸과 짝을 짓는 데 쓴다. 로그인 화면에서만 넘긴다.
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  inputStyle,
  autoComplete,
  name,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputStyle?: React.CSSProperties;
  autoComplete?: string;
  name?: string;
  id?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        name={name}
        id={id}
        style={{ ...inputStyle, paddingRight: 42 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "비밀번호 숨기기" : "비밀번호 표시"}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          border: "none",
          background: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: 15,
          padding: 6,
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        {show ? (
          // 눈 감음(숨기기) 아이콘
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.6 21.6 0 015.06-6.06M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a21.6 21.6 0 01-2.94 4.06M14.12 14.12a3 3 0 11-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          // 눈 뜸(표시) 아이콘
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
