"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = ["검토중", "승인됨", "거절", "보류"];
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  검토중: { bg: "#fff1e2", text: "#d9730d" },
  승인됨: { bg: "#e6f7ec", text: "#1b9c57" },
  거절: { bg: "var(--danger-soft)", text: "var(--danger)" },
  보류: { bg: "#f2f4f6", text: "#8b95a1" },
};

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("검토중");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [issuedCredentials, setIssuedCredentials] = useState<{
    email: string;
    password: string;
    companyName: string;
    contactName: string;
  } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

  async function loadItems(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications");
      const data = await res.json();
      if (!res.ok) {
        if (!silent) setError(data.error || "불러오기에 실패했습니다.");
        setLoading(false);
        return;
      }
      setItems(data.data || []);
    } catch {
      if (!silent) setError("불러오는 중 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
    // 실시간 구독이 안 되는 테이블이라, 15초마다 자동으로 조용히 새로고침
    const interval = setInterval(() => loadItems(true), 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleApprove(item: any) {
    let email = item.contact_email;
    if (!email) {
      const entered = window.prompt(
        "이 신청에는 담당자 이메일이 없습니다. 포털 계정 로그인용 이메일을 입력해주세요."
      );
      if (!entered) return;
      email = entered;
    }
    const processedBy = window.prompt("처리자 이름을 입력해주세요 (기록용)");
    if (processedBy === null) return;

    const confirmed = window.confirm(
      `"${item.company_name}"을(를) 승인하시겠습니까?\n화주 회사가 등록되고, ${email}로 포털 계정이 즉시 발급됩니다.`
    );
    if (!confirmed) return;

    setProcessingId(item.id);
    setError(null);
    setIssuedCredentials(null);
    setEmailSent(false);
    try {
      const res = await fetch("/api/admin/approve-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: item.id, portal_email: email, processed_by: processedBy }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "승인 처리에 실패했습니다.");
        setProcessingId(null);
        return;
      }
      setIssuedCredentials({
        email: data.email,
        password: data.password,
        companyName: item.company_name,
        contactName: item.contact_name,
      });
      loadItems();
    } catch {
      setError("승인 처리 중 오류가 발생했습니다.");
    }
    setProcessingId(null);
  }

  async function handleSendCredentialsEmail() {
    if (!issuedCredentials) return;
    setSendingEmail(true);
    setError(null);
    try {
      const portalUrl = `${window.location.origin}/customer/login`;
      const res = await fetch("/api/admin/send-portal-credentials-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: issuedCredentials.email,
          password: issuedCredentials.password,
          companyName: issuedCredentials.companyName,
          contactName: issuedCredentials.contactName,
          portalUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "이메일 발송에 실패했습니다.");
        setSendingEmail(false);
        return;
      }
      setEmailSent(true);
    } catch {
      setError("이메일 발송 중 오류가 발생했습니다.");
    }
    setSendingEmail(false);
  }

  async function handleStatusChange(item: any, status: "거절" | "보류") {
    const reason = window.prompt(`${status} 사유를 입력해주세요 (선택사항)`);
    if (reason === null) return;
    const processedBy = window.prompt("처리자 이름을 입력해주세요 (기록용)");
    if (processedBy === null) return;

    setProcessingId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status, staff_note: reason, processed_by: processedBy }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "처리에 실패했습니다.");
        setProcessingId(null);
        return;
      }
      loadItems();
    } catch {
      setError("처리 중 오류가 발생했습니다.");
    }
    setProcessingId(null);
  }

  async function handleDelete(item: any) {
    if (!window.confirm(`"${item.company_name}"의 신청 기록을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    setProcessingId(item.id);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: item.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "삭제에 실패했습니다.");
        setProcessingId(null);
        return;
      }
      loadItems();
    } catch {
      setError("삭제 중 오류가 발생했습니다.");
    }
    setProcessingId(null);
  }

  async function handleBulkCleanup() {
    if (
      !window.confirm(
        "90일이 지난 '거절'/'보류' 상태 신청을 전부 삭제하시겠습니까? 되돌릴 수 없습니다."
      )
    )
      return;
    setCleaningUp(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_cleanup", days: 90 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "일괄 정리에 실패했습니다.");
        setCleaningUp(false);
        return;
      }
      alert(`${data.deletedCount}건을 정리했습니다.`);
      loadItems();
    } catch {
      setError("일괄 정리 중 오류가 발생했습니다.");
    }
    setCleaningUp(false);
  }

  const filtered = items.filter((i) => filter === "전체" || i.status === filter);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">화주 등록 신청</h1>
          <p className="page-desc">
            랜딩페이지·견적문의를 통해 접수된 정식 화주 등록 신청입니다. 15초마다 자동 갱신됩니다.
          </p>
        </div>
        <button
          className="btn-ghost"
          style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}
          onClick={handleBulkCleanup}
          disabled={cleaningUp}
        >
          {cleaningUp ? "정리 중..." : "오래된 거절·보류건 일괄정리"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["검토중", "승인됨", "거절", "보류", "전체"].map((s) => (
          <button
            key={s}
            className={filter === s ? "btn" : "btn btn-ghost"}
            style={{ fontSize: 12.5, padding: "7px 12px" }}
            onClick={() => setFilter(s)}
          >
            {s} ({s === "전체" ? items.length : items.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {issuedCredentials && (
        <div
          className="card"
          style={{ padding: 16, marginBottom: 16, background: "var(--accent-soft)", border: "none" }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--accent)" }}>
            승인 완료 — 아래 정보를 화주에게 전달해주세요 (한 번만 표시됩니다)
          </div>
          <div>이메일: <span className="num">{issuedCredentials.email}</span></div>
          <div>임시 비밀번호: <span className="num">{issuedCredentials.password}</span></div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn"
              style={{ padding: "7px 14px", fontSize: 12.5 }}
              onClick={handleSendCredentialsEmail}
              disabled={sendingEmail || emailSent}
            >
              {emailSent ? "메일 발송 완료 ✓" : sendingEmail ? "발송 중..." : "이 정보를 메일로 자동 발송"}
            </button>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              놓치셨어도 화주 상세페이지에서 언제든 "비밀번호 재설정"이 가능합니다.
            </span>
          </div>
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">해당하는 신청이 없습니다.</div>
        ) : (
          <table style={{ minWidth: 1020 }}>
            <thead>
              <tr>
                <th>회사명</th>
                <th>담당자</th>
                <th>연락처</th>
                <th>구간</th>
                <th>월예상건수</th>
                <th>접수일</th>
                <th>상태</th>
                <th style={{ minWidth: 210 }}>처리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="cell-nowrap">
                    {item.company_id ? (
                      <a
                        href={`/admin/companies/${item.company_id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/admin/companies/${item.company_id}`);
                        }}
                        style={{ textDecoration: "underline" }}
                      >
                        {item.company_name}
                      </a>
                    ) : (
                      item.company_name
                    )}
                  </td>
                  <td className="cell-nowrap">{item.contact_name}</td>
                  <td className="cell-nowrap">
                    <div className="num">{item.contact_phone}</div>
                    {item.contact_email && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.contact_email}</div>
                    )}
                  </td>
                  <td>
                    {item.main_origin || item.main_destination
                      ? `${item.main_origin || "-"} → ${item.main_destination || "-"}`
                      : "-"}
                  </td>
                  <td className="cell-nowrap">{item.monthly_volume_estimate || "-"}</td>
                  <td className="cell-nowrap">
                    <span className="num">{new Date(item.created_at).toLocaleDateString("ko-KR")}</span>
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
                      {item.status}
                    </span>
                    {item.staff_note && (
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 3, maxWidth: 140 }}>
                        {item.staff_note}
                      </div>
                    )}
                  </td>
                  <td style={{ minWidth: 210 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {item.status === "검토중" && (
                        <>
                          <button
                            className="btn"
                            style={{ padding: "5px 10px", fontSize: 11.5 }}
                            disabled={processingId === item.id}
                            onClick={() => handleApprove(item)}
                          >
                            승인
                          </button>
                          <button
                            className="btn-danger"
                            style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                            disabled={processingId === item.id}
                            onClick={() => handleStatusChange(item, "거절")}
                          >
                            거절
                          </button>
                          <button
                            className="btn-ghost"
                            style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                            disabled={processingId === item.id}
                            onClick={() => handleStatusChange(item, "보류")}
                          >
                            보류
                          </button>
                        </>
                      )}
                      <button
                        className="btn-danger"
                        style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                        disabled={processingId === item.id}
                        onClick={() => handleDelete(item)}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
