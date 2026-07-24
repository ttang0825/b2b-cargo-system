"use client";

import { useEffect, useState } from "react";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "#e6f7ec", text: "#1b9c57" },
  inactive: { bg: "#f2f4f6", text: "#8b95a1" },
};
const STATUS_LABELS: Record<string, string> = { active: "재직중", inactive: "퇴사" };
const ROLE_LABELS: Record<string, string> = { admin: "관리자", staff: "직원" };

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
  const [inviting, setInviting] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<{ email: string; password: string } | null>(null);

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
        body: JSON.stringify({ action: "invite", name: inviteName, email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "직원 계정 생성에 실패했습니다.");
        setInviting(false);
        return;
      }
      setIssuedCredentials({ email: data.email, password: data.password });
      setInviteName("");
      setInviteEmail("");
      setInviteRole("staff");
      loadItems();
    } catch {
      setError("직원 계정 생성 중 오류가 발생했습니다.");
    }
    setInviting(false);
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
    } catch {
      setError("역할 변경 중 오류가 발생했습니다.");
    }
    setProcessingId(null);
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
        <form onSubmit={handleInvite}>
          <div className="form-grid" style={{ padding: 0, marginBottom: 4 }}>
            <div className="field">
              <label>이름</label>
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
            </div>
            <div className="field">
              <label>이메일 (로그인 아이디)</label>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>역할</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "admin" | "staff")}>
                <option value="staff">직원</option>
                <option value="admin">관리자</option>
              </select>
            </div>
          </div>
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
          <div>이메일: <span className="num">{issuedCredentials.email}</span></div>
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
                  <th>이메일</th>
                  <th style={{ width: 110 }}>역할</th>
                  <th style={{ width: 100 }}>상태</th>
                  <th style={{ width: 90 }}>가입일</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-nowrap" style={{ fontWeight: 700 }}>{item.name}</td>
                    <td className="cell-nowrap">{item.email}</td>
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
                      <button
                        className={item.status === "active" ? "btn-danger" : "btn-ghost"}
                        style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                        disabled={processingId === item.id}
                        onClick={() => handleStatusToggle(item)}
                      >
                        {item.status === "active" ? "퇴사 처리" : "재직 전환"}
                      </button>
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
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">이메일</span>
                    <span>{item.email}</span>
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
                  <button
                    className={item.status === "active" ? "btn-danger" : "btn-ghost"}
                    style={{ marginTop: 8, padding: "6px 14px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                    disabled={processingId === item.id}
                    onClick={() => handleStatusToggle(item)}
                  >
                    {item.status === "active" ? "퇴사 처리" : "재직 전환"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
