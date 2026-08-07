"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import PasswordInput from "@/components/PasswordInput";
import { syntheticLoginEmail } from "@/lib/portalAccountCredentials";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";

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
    <main
      style={{
        minHeight: "100vh",
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
          화주 포털
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0, marginBottom: 24 }}>
          견적, 배차, 정산 현황을 확인하세요.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>아이디</label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>비밀번호</label>
            <PasswordInput value={password} onChange={setPassword} />
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
              checked={rememberId}
              onChange={(e) => setRememberId(e.target.checked)}
            />
            아이디 저장
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
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 18, marginBottom: 0, textAlign: "center" }}>
          비밀번호를 잊으셨나요? 위캐리로 문의해주세요 (
          <a href={`tel:${COMPANY_SUPPORT_PHONE}`} style={{ color: "var(--text-muted)" }}>
            {COMPANY_SUPPORT_PHONE}
          </a>
          )
        </p>
      </div>
    </main>
  );
}
