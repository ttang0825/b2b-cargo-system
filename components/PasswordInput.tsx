"use client";

import { useState } from "react";

/**
 * @param inputStyle 입력창 인라인 스타일. 🔴 31차 `/customer/login` 이 `.field` 래퍼 없이
 *   시안 스타일을 입히려고 더했다(추가만 하는 방식 — `BrandLogo` 의 `style` 과 같다).
 *   ⚠️ `paddingRight` 는 눈 아이콘 자리라 덮어쓰지 말 것.
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  inputStyle,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputStyle?: React.CSSProperties;
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
