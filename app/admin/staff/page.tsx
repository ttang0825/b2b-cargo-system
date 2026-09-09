"use client";

import { useEffect, useState } from "react";
import { getCurrentStaffId, refreshCurrentStaffCache } from "@/lib/currentStaff";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import { formatPhoneNumber } from "@/lib/constants";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "#e6f7ec", text: "#1b9c57" },
  inactive: { bg: "#f2f4f6", text: "#8b95a1" },
};
const STATUS_LABELS: Record<string, string> = { active: "재직중", inactive: "퇴사" };
const ROLE_LABELS: Record<string, string> = { admin: "관리자", staff: "직원" };

// 🔴 아이디는 **관리자가 자유롭게 정한다**(32차 확정) — 시스템이 규칙으로 만들지 않는다.
//    ⚠️ 「we 로 시작하지 말 것」이라고 적지 말 것: 실제 운영 아이디 넷이 전부 `we` 로
//    시작한다(사용자 확정 2026-09-09). 화주포털 아이디는 `we` + **숫자 8자리** 형태라
//    거기에 맞춰 만들지 않는 것이 요점이다.
const LOGIN_ID_HELP =
  "영문 소문자와 숫자만 · 4~20자 · 첫 글자는 영문. 화주포털 아이디(we+숫자 8자리)와 같은 형태로는 만들지 마세요.";

function formatDate(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export default function AdminStaffPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "staff">("staff");
  const [inviteSenderPhone, setInviteSenderPhone] = useState("");
  const [inviteLoginId, setInviteLoginId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<
    { loginId: string | null; email: string; password: string } | null
  >(null);

  // 비밀번호 재설정 — 확인 창 → 임시 비밀번호를 한 번만 보여준다.
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [editItem, setEditItem] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSenderPhone, setEditSenderPhone] = useState("");
  const [editLoginId, setEditLoginId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "불러오기에 실패했습니다.");
        setLoading(false);
        return;
      }
      setItems(data.data || []);
    } catch {
      setError("불러오는 중 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setError("이름과 이메일을 입력해주세요.");
      return;
    }
    setInviting(true);
    setError(null);
    setIssuedCredentials(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          name: inviteName,
          email: inviteEmail,
          role: inviteRole,
          sms_sender_phone: inviteSenderPhone,
          login_id: inviteLoginId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "직원 계정 생성에 실패했습니다.");
        setInviting(false);
        return;
      }
      setIssuedCredentials({
        loginId: data.login_id || null,
        email: data.email,
        password: data.password,
      });
      setInviteName("");
      setInviteEmail("");
      setInviteSenderPhone("");
      setInviteLoginId("");
      setInviteRole("staff");
      loadItems();
    } catch {
      setError("직원 계정 생성 중 오류가 발생했습니다.");
    }
    setInviting(false);
  }

  function openEditModal(item: any) {
    setEditItem(item);
    setEditName(item.name);
    setEditEmail(item.email);
    // DB에는 숫자만 저장되어 있으므로 화면에서만 하이픈을 붙여 보여준다
    setEditSenderPhone(formatPhoneNumber(item.sms_sender_phone || ""));
    setEditLoginId(item.login_id || "");
    setEditError(null);
  }

  async function handleSaveProfile() {
    if (!editItem) return;
    if (!editName.trim() || !editEmail.trim()) {
      setEditError("이름과 이메일을 모두 입력해주세요.");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          id: editItem.id,
          name: editName,
          email: editEmail,
          sms_sender_phone: editSenderPhone,
          login_id: editLoginId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "정보 수정에 실패했습니다.");
        setSavingEdit(false);
        return;
      }
      setEditItem(null);
      loadItems();
      // 지금 로그인한 본인의 행을 수정한 경우, 상단메뉴 등이 참조하는 캐시도 갱신
      if ((await getCurrentStaffId()) === editItem.id) {
        await refreshCurrentStaffCache();
      }
    } catch {
      setEditError("정보 수정 중 오류가 발생했습니다.");
    }
    setSavingEdit(false);
  }

  async function handleRoleChange(id: string, role: string) {
    if (!window.confirm(`역할을 "${ROLE_LABELS[role]}"로 변경하시겠습니까?`)) return;
    setProcessingId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_role", id, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "역할 변경에 실패했습니다.");
        setProcessingId(null);
        return;
      }
      loadItems();
      // 지금 로그인한 본인의 role을 바꾼 경우, 상단메뉴 등이 참조하는 캐시도 갱신
      if ((await getCurrentStaffId()) === id) {
        await refreshCurrentStaffCache();
      }
    } catch {
      setError("역할 변경 중 오류가 발생했습니다.");
    }
    setProcessingId(null);
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch("/api/admin/reset-staff-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: resetTarget.id }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || "비밀번호 재설정에 실패했습니다.");
        setResetting(false);
        return;
      }
      setResetResult({ name: resetTarget.name, password: data.password });
      setResetTarget(null);
      setCopied(false);
      loadItems();
    } catch {
      setResetError("비밀번호 재설정 중 오류가 발생했습니다.");
    }
    setResetting(false);
  }

  async function handleStatusToggle(item: any) {
    const next = item.status === "active" ? "inactive" : "active";
    const confirmMsg =
      next === "inactive"
        ? `"${item.name}"님을 퇴사(비활성화) 처리하시겠습니까? 로그인이 즉시 차단됩니다.`
        : `"${item.name}"님을 재직중(활성화) 상태로 되돌리시겠습니까?`;
    if (!window.confirm(confirmMsg)) return;
    setProcessingId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", id: item.id, status: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "상태 변경에 실패했습니다.");
        setProcessingId(null);
        return;
      }
      loadItems();
    } catch {
      setError("상태 변경 중 오류가 발생했습니다.");
    }
    setProcessingId(null);
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">직원 계정 관리</h1>
          <p className="page-desc">
            관리자만 접근할 수 있는 화면입니다. 새 직원 계정 발급, 역할 지정, 재직 상태 관리를
            할 수 있습니다.
          </p>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 20, maxWidth: 560 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>새 직원 계정 발급</h3>
        <form onSubmit={handleInvite} onKeyDown={handleFormKeyDown}>
          <div className="form-grid" style={{ padding: 0, marginBottom: 4 }}>
            <div className="field">
              <label>이름</label>
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
            </div>
            <div className="field">
              {/* ⚠️ 32차부터 이메일은 **로그인 자격이 아니라 연락처**다 —
                  로그인은 아래 「아이디」로 한다. 라벨을 되돌리지 말 것. */}
              <label>담당자 이메일 (연락용)</label>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>아이디 (로그인용)</label>
              <input
                type="text"
                value={inviteLoginId}
                onChange={(e) => setInviteLoginId(e.target.value.toLowerCase())}
                placeholder="예: wehong"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
            <div className="field">
              <label>역할</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "admin" | "staff")}>
                <option value="staff">직원</option>
                <option value="admin">관리자</option>
              </select>
            </div>
            <div className="field">
              <label>SMS 발신번호 (선택)</label>
              <input
                type="text"
                value={inviteSenderPhone}
                onChange={(e) => setInviteSenderPhone(formatPhoneNumber(e.target.value))}
                placeholder="010-0000-0000"
                autoComplete="off"
              />
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8, marginBottom: 0, lineHeight: 1.7 }}>
            아이디: {LOGIN_ID_HELP}
          </p>
          {/* ⚠️ 솔라피 사전등록 없이는 이 번호로 발송되지 않는다 — 발급 화면에도 안내할 것 */}
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6, marginBottom: 0, lineHeight: 1.7 }}>
            발신번호는 나중에 &quot;수정&quot;에서도 넣을 수 있습니다. 이 번호로 문자가 발송되려면
            솔라피에 발신번호로 사전 등록되어 있어야 하며, 등록되지 않은 번호는 대표 발신번호로
            대체 발송됩니다.
          </p>
          <button className="btn" type="submit" disabled={inviting} style={{ marginTop: 10 }}>
            {inviting ? "생성 중..." : "계정 발급"}
          </button>
        </form>
      </div>

      {issuedCredentials && (
        <div className="card" style={{ padding: 16, marginBottom: 20, maxWidth: 560, background: "var(--accent-soft)", border: "none" }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--accent)" }}>
            계정 발급 완료 — 아래 정보를 해당 직원에게 전달해주세요 (한 번만 표시됩니다)
          </div>
          <div>
            아이디:{" "}
            <span className="num">
              {issuedCredentials.loginId || "(미지정 — 수정에서 넣어주세요. 없으면 로그인할 수 없습니다)"}
            </span>
          </div>
          <div>이메일(연락용): <span className="num">{issuedCredentials.email}</span></div>
          <div>임시 비밀번호: <span className="num">{issuedCredentials.password}</span></div>
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">등록된 직원 계정이 없습니다.</div>
        ) : (
          <>
            <table className="desktop-only">
              <thead>
                <tr>
                  <th>이름</th>
                  <th style={{ width: 120 }}>아이디</th>
                  <th>이메일(연락용)</th>
                  <th style={{ width: 130 }}>발신번호</th>
                  <th style={{ width: 110 }}>역할</th>
                  <th style={{ width: 100 }}>상태</th>
                  <th style={{ width: 90 }}>가입일</th>
                  <th style={{ width: 190 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-nowrap" style={{ fontWeight: 700 }}>{item.name}</td>
                    <td className="cell-nowrap">
                      {item.login_id ? (
                        <span className="num">{item.login_id}</span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--danger, #e03131)" }}>미지정</span>
                      )}
                    </td>
                    <td className="cell-nowrap">{item.email}</td>
                    <td className="cell-nowrap">
                      {item.sms_sender_phone ? (
                        <span className="num">{formatPhoneNumber(item.sms_sender_phone)}</span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>미등록</span>
                      )}
                    </td>
                    <td className="cell-nowrap">
                      <select
                        value={item.role}
                        onChange={(e) => handleRoleChange(item.id, e.target.value)}
                        disabled={processingId === item.id}
                        style={{ fontSize: 12.5, padding: "5px 8px" }}
                      >
                        <option value="staff">직원</option>
                        <option value="admin">관리자</option>
                      </select>
                    </td>
                    <td className="cell-nowrap">
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background: (STATUS_COLORS[item.status] || {}).bg,
                          color: (STATUS_COLORS[item.status] || {}).text,
                        }}
                      >
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="cell-nowrap">
                      <span className="num">{item.created_at ? formatDate(item.created_at) : "-"}</span>
                    </td>
                    <td className="cell-nowrap">
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          className="btn-ghost"
                          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                          onClick={() => openEditModal(item)}
                        >
                          수정
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                          onClick={() => {
                            setResetTarget(item);
                            setResetError(null);
                          }}
                        >
                          비밀번호 재설정
                        </button>
                        <button
                          className={item.status === "active" ? "btn-danger" : "btn-ghost"}
                          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                          disabled={processingId === item.id}
                          onClick={() => handleStatusToggle(item)}
                        >
                          {item.status === "active" ? "퇴사 처리" : "재직 전환"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-only">
              {items.map((item) => (
                <div key={item.id} className="mobile-row-card">
                  <div className="mobile-row-top">
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: (STATUS_COLORS[item.status] || {}).bg,
                        color: (STATUS_COLORS[item.status] || {}).text,
                      }}
                    >
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>
                  {/* 원칙 13번 — 데스크탑 표에 컬럼을 더하면 모바일 카드도 같이 챙길 것 */}
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">아이디</span>
                    {item.login_id ? (
                      <span className="num">{item.login_id}</span>
                    ) : (
                      <span style={{ color: "var(--danger, #e03131)" }}>미지정</span>
                    )}
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">이메일(연락용)</span>
                    <span>{item.email}</span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">발신번호</span>
                    {item.sms_sender_phone ? (
                      <span className="num">{formatPhoneNumber(item.sms_sender_phone)}</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>미등록</span>
                    )}
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">역할</span>
                    <select
                      value={item.role}
                      onChange={(e) => handleRoleChange(item.id, e.target.value)}
                      disabled={processingId === item.id}
                      style={{ fontSize: 12.5, padding: "4px 8px" }}
                    >
                      <option value="staff">직원</option>
                      <option value="admin">관리자</option>
                    </select>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">가입일</span>
                    <span className="num">{item.created_at ? formatDate(item.created_at) : "-"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn-ghost"
                      style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                      onClick={() => openEditModal(item)}
                    >
                      수정
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                      onClick={() => {
                        setResetTarget(item);
                        setResetError(null);
                      }}
                    >
                      비밀번호 재설정
                    </button>
                    <button
                      className={item.status === "active" ? "btn-danger" : "btn-ghost"}
                      style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                      disabled={processingId === item.id}
                      onClick={() => handleStatusToggle(item)}
                    >
                      {item.status === "active" ? "퇴사 처리" : "재직 전환"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {editItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
          onClick={() => !savingEdit && setEditItem(null)}
        >
          <div
            className="card"
            style={{ padding: 24, maxWidth: 400, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, fontSize: 15 }}>직원 정보 수정</h3>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>이름</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 6 }}>
              <label>아이디 (로그인용)</label>
              <input
                type="text"
                value={editLoginId}
                onChange={(e) => setEditLoginId(e.target.value.toLowerCase())}
                placeholder="예: wehong"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 0, marginBottom: 14, lineHeight: 1.7 }}>
              {LOGIN_ID_HELP}
              <br />
              🟢 아이디는 언제든 바꿀 수 있고, 바꿔도 비밀번호는 그대로입니다.
            </p>
            <div className="field" style={{ marginBottom: 6 }}>
              {/* ⚠️ 32차부터 이메일은 로그인 자격이 아니라 연락처다 */}
              <label>담당자 이메일 (연락용)</label>
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 0, marginBottom: 16, lineHeight: 1.7 }}>
              이 주소로는 로그인하지 않습니다. 나중에 비밀번호 찾기를 켤 때 쓰는 연락처입니다.
            </p>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>SMS 발신번호 (선택)</label>
              <input
                type="text"
                value={editSenderPhone}
                onChange={(e) => setEditSenderPhone(formatPhoneNumber(e.target.value))}
                placeholder="010-0000-0000"
                autoComplete="off"
              />
            </div>
            {/* ⚠️ 솔라피 사전등록 없이는 이 번호로 발송되지 않는다 — 화면에서 반드시 안내할 것 */}
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: -6, marginBottom: 16, lineHeight: 1.7 }}>
              이 번호로 문자가 발송되려면 솔라피에 발신번호로 사전 등록되어 있어야 합니다.
              <br />
              등록되지 않은 번호는 대표 발신번호로 대체 발송됩니다.
            </p>
            {editError && <div className="error-box" style={{ marginBottom: 12 }}>{editError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={handleSaveProfile} disabled={savingEdit}>
                {savingEdit ? "저장 중..." : "저장"}
              </button>
              <button className="btn btn-ghost" onClick={() => setEditItem(null)} disabled={savingEdit}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
      {resetTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
          onClick={() => !resetting && setResetTarget(null)}
        >
          <div
            className="card"
            style={{ padding: 24, maxWidth: 400, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, fontSize: 15 }}>비밀번호 재설정</h3>
            <p style={{ fontSize: 13, lineHeight: 1.8, marginTop: 0 }}>
              <strong>{resetTarget.name}</strong>님의 비밀번호를 임시 비밀번호로 바꿉니다.
              지금 쓰던 비밀번호는 <strong>즉시 못 쓰게 됩니다.</strong>
              <br />
              그 직원은 다음 로그인에서 <strong>새 비밀번호를 반드시 정해야</strong> 다른 화면으로
              넘어갈 수 있습니다.
            </p>
            {resetError && <div className="error-box" style={{ marginBottom: 12 }}>{resetError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={handleResetPassword} disabled={resetting}>
                {resetting ? "처리 중..." : "재설정"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setResetTarget(null)}
                disabled={resetting}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {resetResult && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
          onClick={() => setResetResult(null)}
        >
          <div
            className="card"
            style={{ padding: 24, maxWidth: 420, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, fontSize: 15 }}>{resetResult.name}님의 임시 비밀번호</h3>
            {/* 🔴 「닫으면 다시 못 봅니다」를 화면에 반드시 적을 것 — 서버가 비밀번호를
                평문으로 갖고 있지 않아서, 닫으면 정말로 다시 볼 방법이 없다. */}
            <p style={{ fontSize: 12.5, color: "var(--danger, #e03131)", marginTop: 0, lineHeight: 1.7 }}>
              🔴 이 창을 닫으면 <strong>다시 볼 수 없습니다.</strong> 지금 본인에게 전달해주세요.
            </p>
            <div
              className="num"
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textAlign: "center",
                padding: "16px 12px",
                background: "var(--accent-soft)",
                borderRadius: 8,
                marginBottom: 12,
                wordBreak: "break-all",
              }}
            >
              {resetResult.password}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn"
                onClick={() => {
                  navigator.clipboard?.writeText(resetResult.password);
                  setCopied(true);
                }}
              >
                {copied ? "복사됨" : "복사"}
              </button>
              <button className="btn btn-ghost" onClick={() => setResetResult(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
