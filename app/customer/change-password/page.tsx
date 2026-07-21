"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import PasswordInput from "@/components/PasswordInput";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [isForced, setIsForced] = useState(false); // 최초 로그인 강제변경인지 여부
  const [checking, setChecking] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setChecking(false);
        return;
      }
      const { data: account } = await supabase
        .from("customer_accounts")
        .select("must_change_password")
        .eq("auth_user_id", session.user.id)
        .single();
      setIsForced(!!account?.must_change_password);
      setChecking(false);
    }
    check();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isForced && !currentPassword) {
      setError("기존 비밀번호를 입력해주세요.");
      return;
    }
    if (password.length < 8) {
      setError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user.email) {
      setLoading(false);
      setError("로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.");
      return;
    }

    // 최초 로그인(강제변경)이 아닐 때만 기존 비밀번호를 재확인합니다.
    // 최초 로그인 상황은 방금 그 비밀번호로 로그인에 이미 성공한 직후라 다시 물어볼 필요가 없습니다.
    if (!isForced) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      if (verifyError) {
        setLoading(false);
        setError("기존 비밀번호가 올바르지 않습니다.");
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    const res = await fetch("/api/customer/confirm-password-change", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      setLoading(false);
      setError("비밀번호는 변경되었지만, 완료 처리 중 오류가 발생했습니다. 다시 로그인해주세요.");
      return;
    }

    setLoading(false);
    router.push("/customer");
    router.refresh();
  }

  if (checking) {
    return (
      <main className="container" style={{ maxWidth: 420, paddingTop: 60 }}>
        <div className="empty-state">확인 중...</div>
      </main>
    );
  }

  return (
    <main className="container" style={{ maxWidth: 420, paddingTop: 60 }}>
      <div className="card" style={{ padding: 32 }}>
        <h1 style={{ fontSize: 19, fontWeight: 800, marginTop: 0, marginBottom: 6 }}>
          비밀번호 변경
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0, marginBottom: 20 }}>
          {isForced
            ? "최초 로그인입니다. 계속하려면 새 비밀번호를 설정해주세요."
            : "기존 비밀번호 확인 후 새 비밀번호를 설정해주세요."}
        </p>
        <form onSubmit={handleSubmit}>
          {!isForced && (
            <div className="field" style={{ marginBottom: 12 }}>
              <label>기존 비밀번호</label>
              <PasswordInput value={currentPassword} onChange={setCurrentPassword} autoFocus />
            </div>
          )}
          <div className="field" style={{ marginBottom: 12 }}>
            <label>새 비밀번호 (8자 이상)</label>
            <PasswordInput value={password} onChange={setPassword} autoFocus={isForced} />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>새 비밀번호 확인</label>
            <PasswordInput value={confirm} onChange={setConfirm} />
          </div>
          {error && <div className="error-box">{error}</div>}
          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </main>
  );
}
