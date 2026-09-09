"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";
import InstallAppButton from "@/components/InstallAppButton";

const ERROR_MESSAGES: Record<string, string> = {
  inactive: "이 계정은 비활성화되어 있습니다. 관리자에게 문의해주세요.",
};

// 🔴 저장 키를 새로 만든다 — 옛 키에는 **이메일**이 들어 있어서, 그대로 읽으면
//    아이디 칸에 이메일이 채워진 채로 뜬다. 옛 키는 첫 로그인 때 지운다.
const SAVED_LOGIN_ID_KEY = "wecarry_admin_saved_login_id";
const LEGACY_SAVED_EMAIL_KEY = "wecarry_admin_saved_email";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";
  const urlError = searchParams.get("error");

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLoginId, setRememberLoginId] = useState(false);
  const [error, setError] = useState<string | null>(urlError ? ERROR_MESSAGES[urlError] || null : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_SAVED_EMAIL_KEY);
    const saved = window.localStorage.getItem(SAVED_LOGIN_ID_KEY);
    if (saved) {
      setLoginId(saved);
      setRememberLoginId(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const trimmedId = loginId.trim().toLowerCase();
      if (rememberLoginId) {
        window.localStorage.setItem(SAVED_LOGIN_ID_KEY, trimmedId);
      } else {
        window.localStorage.removeItem(SAVED_LOGIN_ID_KEY);
      }
      // 🔴 이 화면은 Supabase Auth 를 직접 부르지 않는다(32차). 아이디로 로그인하려면
      //    아이디→이메일을 먼저 찾아야 하는데 그 조회는 service_role 로만 되고,
      //    실패 사유를 가르지 않는 것도 서버에서만 보장할 수 있다.
      //    (완료조건 5번이 이 파일에서 Auth 직접 호출 0건을 요구한다.)
      const res = await fetch("/api/admin/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: trimmedId, password: password.trim() }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error || "아이디 또는 비밀번호가 올바르지 않습니다.");
        setLoading(false);
        return;
      }
      // 🔴 임시 비밀번호로 들어온 사람은 어디로 가려 했든 비밀번호 변경으로 보낸다.
      //    (middleware 도 같은 판정을 하지만, 여기서 바로 보내면 화면이 한 번 덜 튄다.)
      router.push(json.must_change_password ? "/admin/change-password" : from);
      // 🔴 setLoading(false) 를 성공 경로에서 부르지 말 것 — 단추가 「로그인」으로
      //    되돌아갔다 이동해서 「안 눌린다」로 읽힌다(PR #129 에서 겪은 것).
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
          내부 관리자 전용 화면입니다. 아이디로 로그인해주세요.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>아이디</label>
            {/* 🔴 `type="email"` 로 되돌리지 말 것 — 아이디에는 @ 가 없어서 브라우저가
                「올바른 주소를 입력하세요」로 제출 자체를 막는다.
                🔴 `autoComplete="username"` 을 빼지 말 것 — 비밀번호 관리자가 이 칸을
                아이디로 알아야 저장·자동채우기가 붙는다(PR #129 와 같은 이유). */}
            <input
              id="admin-login-id"
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
              checked={rememberLoginId}
              onChange={(e) => setRememberLoginId(e.target.checked)}
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
