"use client";

// 임시 비밀번호를 받은 직원이 첫 로그인에서 반드시 거치는 화면 — 32차.
//
// 🔴 메뉴에 넣지 않는다. 화주포털의 `/customer/change-password` 와 같은 취급이다
//    (라우트는 살아 있고 링크만 없다). 평소의 비밀번호 변경은 `/admin/my-account` 다.
// 🔴 이 라우트를 지우면 재발급을 받은 직원의 첫 로그인이 갇힌다 —
//    middleware 가 여기로 보내는데 화면이 없으면 404 에 갇힌다.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAdminAuth } from "@/lib/supabaseAdminAuthClient";
import PasswordInput from "@/components/PasswordInput";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";

export default function AdminChangePasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [forced, setForced] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabaseAdminAuth.auth.getUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      // 본인 행은 「staff can read own row」 정책으로 읽힌다(auth.uid() = id).
      const { data } = await supabaseAdminAuth
        .from("staff_accounts")
        .select("must_change_password")
        .eq("id", user.id)
        .maybeSingle();
      setForced(!!(data as any)?.must_change_password);
      setChecking(false);
    }
    load();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cur = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!cur) return setError("현재(임시) 비밀번호를 입력해주세요.");
    if (next.length < 8) return setError("새 비밀번호는 8자 이상이어야 합니다.");
    if (next !== confirm) return setError("새 비밀번호가 서로 일치하지 않습니다.");
    // 🔴 임시 비밀번호를 그대로 다시 쓰는 것을 막는다 — 막지 않으면 이 화면이
    //    형식적인 통과 절차가 되고, 재발급의 의미가 사라진다.
    if (next === cur) return setError("임시 비밀번호와 다른 비밀번호를 정해주세요.");

    setSaving(true);

    const { error: verifyError } = await supabaseAdminAuth.auth.signInWithPassword({
      email: (await supabaseAdminAuth.auth.getUser()).data.user?.email || "",
      password: cur,
    });
    if (verifyError) {
      setSaving(false);
      return setError("현재 비밀번호가 올바르지 않습니다.");
    }

    const { error: updateError } = await supabaseAdminAuth.auth.updateUser({ password: next });
    if (updateError) {
      setSaving(false);
      return setError(updateError.message);
    }

    // 🔴 must_change_password 를 클라이언트가 직접 끄지 않는다 — anon 으로 이 표를
    //    쓸 수 있으면 변경하지 않고도 표시만 끌 수 있다. 서버가 세션 토큰을 직접
    //    검증한 뒤에 끈다(화주포털 confirm-password-change 와 같은 구조).
    const {
      data: { session },
    } = await supabaseAdminAuth.auth.getSession();
    const res = await fetch("/api/admin/confirm-password-change", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      cache: "no-store",
    });
    if (!res.ok) {
      setSaving(false);
      return setError("비밀번호는 바뀌었지만 처리에 실패했습니다. 다시 로그인해주세요.");
    }

    router.replace("/admin");
    router.refresh();
  }

  if (checking) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">비밀번호 변경</h1>
          <p className="page-desc">
            {forced
              ? "임시 비밀번호로 로그인하셨습니다. 새 비밀번호를 정해야 다음 화면으로 넘어갑니다."
              : "비밀번호를 변경합니다."}
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 20, maxWidth: 420 }}>
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>현재(임시) 비밀번호</label>
            <PasswordInput
              value={currentPassword}
              onChange={setCurrentPassword}
              name="current-password"
              autoComplete="current-password"
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>새 비밀번호</label>
            {/* 🔴 `new-password` 여야 한다 — `current-password` 로 두면 비밀번호
                관리자가 **옛 비밀번호를 채운다**(PR #129 에서 겪은 것). */}
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              name="new-password"
              autoComplete="new-password"
            />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>새 비밀번호 확인</label>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              name="confirm-password"
              autoComplete="new-password"
            />
          </div>
          {error && <div className="error-box">{error}</div>}
          <button className="btn" type="submit" disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
            {saving ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </main>
  );
}
