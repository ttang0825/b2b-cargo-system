"use client";

import { useEffect, useState } from "react";
import { supabaseAdminAuth } from "@/lib/supabaseAdminAuthClient";
import { getCurrentStaffInfo, refreshCurrentStaffCache } from "@/lib/currentStaff";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import PasswordInput from "@/components/PasswordInput";

const ROLE_LABELS: Record<string, string> = { admin: "관리자", staff: "직원" };

export default function MyAccountPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabaseAdminAuth.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setEmail(user.email || "");
      const info = await getCurrentStaffInfo();
      setName(info?.name || "");
      setRole(info?.role || null);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);
    setNameSaved(false);
    if (!name.trim()) {
      setNameError("이름을 입력해주세요.");
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/admin/my-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(data.error || "이름 저장에 실패했습니다.");
        setSavingName(false);
        return;
      }
      await refreshCurrentStaffCache();
      setName(data.name || name.trim());
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 1500);
    } catch {
      setNameError("이름 저장 중 오류가 발생했습니다.");
    }
    setSavingName(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    // 복사-붙여넣기 시 실수로 딸려온 앞뒤 공백만 제거 (중간 공백은 그대로 유지)
    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedCurrent) {
      setPasswordError("현재 비밀번호를 입력해주세요.");
      return;
    }
    if (trimmedNew.length < 8) {
      setPasswordError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setPasswordError("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setChangingPassword(true);

    const { error: verifyError } = await supabaseAdminAuth.auth.signInWithPassword({
      email,
      password: trimmedCurrent,
    });
    if (verifyError) {
      setChangingPassword(false);
      setPasswordError("현재 비밀번호가 올바르지 않습니다.");
      return;
    }

    const { error: updateError } = await supabaseAdminAuth.auth.updateUser({
      password: trimmedNew,
    });
    if (updateError) {
      setChangingPassword(false);
      setPasswordError(updateError.message);
      return;
    }

    setChangingPassword(false);
    setPasswordSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSaved(false), 2000);
  }

  if (loading) {
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
          <h1 className="page-title">내 계정</h1>
          <p className="page-desc">본인 정보와 비밀번호를 관리합니다.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20, maxWidth: 480 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>기본 정보</h3>
        <form onSubmit={handleSaveName} onKeyDown={handleFormKeyDown}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>이름</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>이메일 (로그인 아이디)</label>
            <input value={email} disabled />
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
              이메일 변경이 필요하면 관리자에게 문의해주세요.
            </p>
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>역할</label>
            <input value={role ? ROLE_LABELS[role] || role : "-"} disabled />
          </div>
          {nameError && <div className="error-box" style={{ marginBottom: 12 }}>{nameError}</div>}
          <button className="btn" type="submit" disabled={savingName}>
            {savingName ? "저장 중..." : nameSaved ? "저장 완료 ✓" : "이름 저장"}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 20, maxWidth: 480 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>비밀번호 변경</h3>
        <form onSubmit={handleChangePassword} onKeyDown={handleFormKeyDown}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>현재 비밀번호</label>
            <PasswordInput value={currentPassword} onChange={setCurrentPassword} />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>새 비밀번호 (8자 이상)</label>
            <PasswordInput value={newPassword} onChange={setNewPassword} />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>새 비밀번호 확인</label>
            <PasswordInput value={confirmPassword} onChange={setConfirmPassword} />
          </div>
          {passwordError && <div className="error-box" style={{ marginBottom: 12 }}>{passwordError}</div>}
          <button className="btn" type="submit" disabled={changingPassword}>
            {changingPassword ? "변경 중..." : passwordSaved ? "변경 완료 ✓" : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </main>
  );
}
