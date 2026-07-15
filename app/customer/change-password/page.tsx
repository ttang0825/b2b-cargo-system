"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    if (session) {
      await supabase
        .from("customer_accounts")
        .update({ must_change_password: false })
        .eq("auth_user_id", session.user.id);
    }

    setLoading(false);
    router.push("/customer");
    router.refresh();
  }

  return (
    <main className="container" style={{ maxWidth: 420, paddingTop: 60 }}>
      <div className="card" style={{ padding: 32 }}>
        <h1 style={{ fontSize: 19, fontWeight: 800, marginTop: 0, marginBottom: 6 }}>
          비밀번호 변경
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0, marginBottom: 20 }}>
          최초 로그인입니다. 계속하려면 새 비밀번호를 설정해주세요.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>새 비밀번호 (8자 이상)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>새 비밀번호 확인</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && <div className="error-box">{error}</div>}
          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? "변경 중..." : "비밀번호 변경하고 시작하기"}
          </button>
        </form>
      </div>
    </main>
  );
}
