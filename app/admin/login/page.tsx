"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";
import { supabaseAdminAuth } from "@/lib/supabaseAdminAuthClient";
import InstallAppButton from "@/components/InstallAppButton";

const ERROR_MESSAGES: Record<string, string> = {
  inactive: "이 계정은 비활성화되어 있습니다. 관리자에게 문의해주세요.",
};

const SAVED_EMAIL_KEY = "wecarry_admin_saved_email";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState<string | null>(urlError ? ERROR_MESSAGES[urlError] || null : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(SAVED_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberEmail(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (rememberEmail) {
        window.localStorage.setItem(SAVED_EMAIL_KEY, trimmedEmail);
      } else {
        window.localStorage.removeItem(SAVED_EMAIL_KEY);
      }
      const { error: signInError } = await supabaseAdminAuth.auth.signInWithPassword({
        email: trimmedEmail,
        password: password.trim(),
      });
      if (signInError) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        setLoading(false);
        return;
      }
      router.push(from);
      router.refresh();
    } catch {
      setError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setLoading(false);
    }
  }

  return (
    <main
      className="screen-fit"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 20,
      }}
    >
      <div className="card" style={{ padding: 36, width: 360, maxWidth: "100%" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 21,
            fontWeight: 800,
            marginTop: 0,
            marginBottom: 6,
            letterSpacing: "-0.02em",
          }}
        >
          WeCarry 운송 통합 운영 시스템
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0, marginBottom: 24 }}>
          내부 관리자 전용 화면입니다. 계정으로 로그인해주세요.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>이메일</label>
            <input
              id="admin-login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              name="username"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>비밀번호</label>
            {/* 🔴 `autoComplete`·`name` 을 빼지 말 것 — 비밀번호 저장소가 이 칸을
                비밀번호로 확신해야 저장 제안과 자동 채우기가 뜬다(화주포털과 같은 이유). */}
            <PasswordInput
              value={password}
              onChange={setPassword}
              id="admin-login-password"
              name="password"
              autoComplete="current-password"
            />
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              color: "var(--text-muted)",
              marginBottom: 16,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
            />
            이메일 저장
          </label>
          {error && <div className="error-box">{error}</div>}
          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? "확인 중..." : "로그인"}
          </button>
        </form>

        {/* 설치 가능할 때만 그려진다(이미 설치했거나 방법이 없으면 렌더링 0). */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <InstallAppButton appName="내부관리" className="install-app-btn" />
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
