"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import PasswordInput from "@/components/PasswordInput";
import BrandLogo from "@/components/BrandLogo";
import { syntheticLoginEmail } from "@/lib/portalAccountCredentials";
import BackToHomeLink from "@/components/BackToHomeLink";
import { COMPANY_SUPPORT_HOURS, COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";
import { COMPANY_LEGAL_NAME } from "@/lib/companyInfo";
import "@/app/landing.css";

// 운송관리 로그인 — 31차에 시안(디자인팀 Next 변환본)으로 껍데기를 갈아끼웠다.
//
// 🔴 **인증 로직은 한 줄도 안 바꿨다** — 화면이 받는 것은 **아이디**(`login_id`)이고
//    `syntheticLoginEmail()` 로 합성 이메일(`{아이디}@wecarry-portal.internal`)을 만들어
//    `signInWithPassword` 에 넘긴다(21차). 라벨을 「이메일」로 되돌리지 말 것.
// 🔴 **`PasswordInput`(표시/숨김 토글)을 그대로 쓴다**(원칙 12번) — 시안은 맨
//    `<input type="password">` 였다.
// 🔴 **「아이디 저장」은 아이디만 localStorage 에 넣는다** — 비밀번호는 어떤 방식으로도
//    저장하지 않는다(21차).
// 🔴 **`.landing-page` 스코프 안에 있어야 서체가 걸린다**(30차 — 전역 서체 변수를
//    건드리지 않고 이 클래스에만 Pretendard 를 걸었다).
// ⚠️ `.public-form`(입력창 16px, iOS 자동확대 방지)은 더 이상 필요 없다 — 아래 입력이
//    전부 15px 이상이다. 그래도 `public-form` 을 남긴 이유는 `PasswordInput` 안의
//    입력이 전역 `.field input`(14px)을 상속받을 수 있어서다.

const labelStyle: CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#4A4945" };
// 🔴 입력창 글자는 16px 이다 — 시안의 15px 을 그대로 쓰면 iOS 가 포커스 때 화면을
// 자동 확대한다(26차 「커지고 밀린다」 신고의 원인). 전역 `.public-form` 규칙이 16px 을
// 주지만 인라인 style 이 그 CSS 를 이기므로 값 자체를 올려둔다.
const inputStyle: CSSProperties = {
  width: "100%",
  marginTop: 9,
  padding: "15px 16px",
  border: "1px solid #E1E0DB",
  borderRadius: 12,
  background: "#FAFAF8",
  fontFamily: "inherit",
  fontSize: 16,
  color: "#1A1A1A",
};

const SAVED_LOGIN_ID_KEY = "wecarry_portal_saved_login_id";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberId, setRememberId] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(SAVED_LOGIN_ID_KEY);
    if (saved) {
      setLoginId(saved);
      setRememberId(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedId = loginId.trim();
    if (rememberId) {
      window.localStorage.setItem(SAVED_LOGIN_ID_KEY, trimmedId);
    } else {
      window.localStorage.removeItem(SAVED_LOGIN_ID_KEY);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: syntheticLoginEmail(trimmedId),
      password: password.trim(),
    });
    setLoading(false);
    if (error) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    router.push("/customer");
    router.refresh();
  }

  return (
    <div
      className="landing-page public-form"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#F4F3EF", color: "#0E0F12" }}
    >
      <header className="landing-login-header" style={{ padding: "18px 56px", display: "flex", alignItems: "center" }}>
        <Link href="/" aria-label="위캐리 운송 홈" style={{ display: "flex", alignItems: "center", color: "#0E0F12" }}>
          <BrandLogo style={{ height: 46, width: "auto", display: "block" }} />
        </Link>
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 24px 96px" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div className="landing-login-card" style={{ background: "#FFFFFF", borderRadius: 22, padding: "48px 44px 42px", boxShadow: "0 1px 3px rgba(20,20,18,0.06)" }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em" }}>운송관리 로그인</h1>
            <p style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.7, color: "#6C6B65" }}>
              견적, 배차, 정산 현황을 확인하세요.
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="portal-login-id" style={{ ...labelStyle, marginTop: 34 }}>아이디</label>
              <input
                id="portal-login-id"
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                autoComplete="username"
                autoFocus
                placeholder="발급받은 아이디"
                style={inputStyle}
              />

              <label style={{ ...labelStyle, marginTop: 20 }}>비밀번호</label>
              <div style={{ marginTop: 9 }}>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  inputStyle={{ ...inputStyle, marginTop: 0 }}
                />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 18 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: "#6C6B65", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={rememberId}
                    onChange={(e) => setRememberId(e.target.checked)}
                    style={{ width: "auto", margin: 0 }}
                  />
                  아이디 저장
                </label>
                {/* 🔴 비밀번호 재발급은 담당자가 관리자 화면에서 한다(21차) — 셀프 재설정
                    경로가 없으므로 전화 안내가 맞다. */}
                <a
                  href={`tel:${COMPANY_SUPPORT_PHONE.replace(/-/g, "")}`}
                  style={{ fontSize: 13.5, color: "#8B8A85", textDecoration: "underline", textUnderlineOffset: 3 }}
                >
                  비밀번호 문의 {COMPANY_SUPPORT_PHONE}
                </a>
              </div>

              {error && (
                <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: "#FDF3F2", color: "#B4423A", fontSize: 13.5, lineHeight: 1.6 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: 26,
                  padding: 17,
                  background: loading ? "#4A4945" : "#0E0F12",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 999,
                  fontFamily: "inherit",
                  fontSize: 15.5,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "확인 중..." : "로그인"}
              </button>
            </form>

            {/* 계정이 없는 사람에게 그 자리에서 경로를 준다(41차).
                ⚠️ 시안은 「신청 접수 후 2~3시간 이내 발급」이었는데 **랜딩 FAQ 와 어긋나서**
                   FAQ 문구(평일 09:00~18:00 접수 기준 당일 안)로 맞췄다 — 두 화면이 다른
                   시간을 약속하면 지키지 못하는 쪽이 생긴다.
                🔴 라벨은 12차에 화면 6곳을 통일한 「운송관리 계정 신청」 그대로다. */}
            {/* 🔴 `flexWrap: "nowrap"` 이다 — `wrap` 이면 왼쪽 글줄과 버튼의 **기본 폭 합이
                카드 폭(352px)을 넘는 순간 버튼이 아래 줄로 떨어진다**(flex 는 줄을 나눈 뒤에
                줄여서, 왼쪽이 줄어들 수 있어도 먼저 줄바꿈이 일어난다). 시안은 글줄 왼쪽 ·
                버튼 오른쪽 한 줄이고, 사용자가 "버튼의 위치가 다르다"로 신고한 것이 이것이다.
                🔴 대신 왼쪽에 `flex: 1 1 auto` + `minWidth: 0` 을 줘서 **글줄이 줄바꿈되게**
                   했다 — 시안 문구(「2~3시간 이내 발급」)보다 우리 문구가 길기 때문이다.
                   ⚠️ 짧게 줄이려고 운영시간을 빼지 말 것: 그러면 주말 접수 건에도 「당일
                   발급」을 약속하는 문장이 된다(31차 ⑨(a) 가 FAQ 와 맞춘 이유).
                ⚠️ 700px 이하는 `app/landing.css` 가 버튼을 전체 폭으로 되돌린다. */}
            <div
              className="landing-login-foot"
              style={{ display: "flex", flexWrap: "nowrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 32, paddingTop: 26, borderTop: "1px solid #E7E6E1" }}
            >
              <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>계정이 없으신가요?</div>
                <div style={{ marginTop: 5, fontSize: 12.8, lineHeight: 1.5, color: "#8B8A85", wordBreak: "keep-all" }}>
                  {COMPANY_SUPPORT_HOURS} 접수 기준 당일 발급
                </div>
              </div>
              <Link
                href="/apply"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", padding: "14px 24px", background: "#FFD834", color: "#0E0F12", borderRadius: 999, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}
              >
                운송관리 계정 신청
              </Link>
            </div>
          </div>

          {/* 🔴 헤더 로고와 동작이 다르다 — 로고는 홈 맨 위로, 이 링크는 **왔던 자리로**
              되돌아간다(13차 리뷰). `BackToHomeLink` 주석 참고. */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <BackToHomeLink />
          </div>
        </div>
      </main>

      <footer style={{ padding: "28px 56px 40px", textAlign: "center", fontSize: 12.5, lineHeight: 2, color: "#9C9B95" }}>
        <div>
          고객센터 {COMPANY_SUPPORT_PHONE} · {COMPANY_SUPPORT_HOURS} (주말·공휴일 휴무)
        </div>
        <div>© {new Date().getFullYear()} {COMPANY_LEGAL_NAME}. All rights reserved.</div>
      </footer>
    </div>
  );
}
