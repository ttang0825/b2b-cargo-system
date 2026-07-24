"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";
import { supabaseAdminAuth } from "@/lib/supabaseAdminAuthClient";

const ERROR_MESSAGES: Record<string, string> = {
  inactive: "이 계정은 비활성화되어 있습니다. 관리자에게 문의해주세요.",
};

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(urlError ? ERROR_MESSAGES[urlError] || null : null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabaseAdminAuth.auth.signInWithPassword({ email, password });
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
          WeCarry 운송 통합 운영 시스템
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0, marginBottom: 24 }}>
          내부 관리자 전용 화면입니다. 계정으로 로그인해주세요.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>비밀번호</label>
            <PasswordInput value={password} onChange={setPassword} />
          </div>
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
