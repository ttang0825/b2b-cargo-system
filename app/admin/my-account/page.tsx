"use client";

import { useEffect, useState } from "react";
import { supabaseAdminAuth } from "@/lib/supabaseAdminAuthClient";
import { getCurrentStaffInfo, refreshCurrentStaffCache } from "@/lib/currentStaff";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import PasswordInput from "@/components/PasswordInput";
import { formatPhoneNumber } from "@/lib/constants";

const ROLE_LABELS: Record<string, string> = { admin: "관리자", staff: "직원" };

export default function MyAccountPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [senderPhone, setSenderPhone] = useState<string | null>(null);
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

      // SMS 발신번호는 이 화면에서만 필요하므로 여기서 따로 조회한다.
      // ⚠️ getCurrentStaffInfo()의 캐시 쿼리에 얹지 말 것 — 그 쿼리는 TopNav 등
      // 사이트 전체가 쓰는 것이라, 한 화면에서만 쓰는 컬럼을 넣으면 모든 페이지가
      // 불필요한 값을 같이 가져오게 된다.
      const { data: senderRow } = await supabaseAdminAuth
        .from("staff_accounts")
        .select("sms_sender_phone")
        .eq("id", user.id)
        .maybeSingle();
      setSenderPhone((senderRow as any)?.sms_sender_phone || null);

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
          <div className="field" style={{ marginBottom: 12 }}>
            <label>역할</label>
            <input value={role ? ROLE_LABELS[role] || role : "-"} disabled />
          </div>
          {/* 내가 보낸 문자가 어느 번호로 나가는지 본인이 확인할 수 있어야 한다.
              ⚠️ 수정은 관리자만 가능하다(`/admin/staff`) — 이 번호는 솔라피 사전등록과
              연동되어 있어서, 임의로 바꾸면 등록되지 않은 번호가 되어 발송이 깨진다. */}
          <div className="field" style={{ marginBottom: 14 }}>
            <label>SMS 발신번호</label>
            <input value={senderPhone ? formatPhoneNumber(senderPhone) : "미등록"} disabled />
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.7 }}>
              {senderPhone
                ? "내가 보내는 문자는 이 번호로 발송되며, 고객 회신도 이 번호로 옵니다. 변경이 필요하면 관리자에게 문의해주세요."
                : "등록된 발신번호가 없어 내가 보내는 문자는 대표번호로 발송되며, 고객 회신이 나에게 오지 않습니다. 등록이 필요하면 관리자에게 문의해주세요."}
            </p>
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
