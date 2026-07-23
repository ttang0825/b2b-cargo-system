"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DateRangeFilter, { DatePreset, getDateRange } from "@/components/DateRangeFilter";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  검토중: { bg: "#fff1e2", text: "#d9730d" },
  승인됨: { bg: "#e6f7ec", text: "#1b9c57" },
  거절: { bg: "var(--danger-soft)", text: "var(--danger)" },
  보류: { bg: "#f2f4f6", text: "#8b95a1" },
};

const REJECT_REASONS = [
  "서비스 권역/노선 불일치",
  "최소 거래조건 미충족 (예상 물량 과소)",
  "취급 불가 품목",
  "사업자 정보 확인 불가",
  "연락 두절",
  "중복 신청",
  "기타 (직접 입력)",
];
const HOLD_REASONS = [
  "추가 확인 필요 (전화 상담 예정)",
  "서류·정보 보완 필요",
  "성수기 등 일시적 사유",
  "내부 검토 중",
  "기타 (직접 입력)",
];

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("검토중");
  const [period, setPeriod] = useState<DatePreset>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);

  const [issuedCredentials, setIssuedCredentials] = useState<{
    email: string;
    password: string;
    companyName: string;
    contactName: string;
  } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // 승인 처리용 모달 상태
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [approveEmail, setApproveEmail] = useState("");
  const [approveProcessedBy, setApproveProcessedBy] = useState("");

  // 거절/보류 처리용 모달 상태
  const [decisionTarget, setDecisionTarget] = useState<{ item: any; type: "거절" | "보류" } | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionCustomNote, setDecisionCustomNote] = useState("");
  const [decisionProcessedBy, setDecisionProcessedBy] = useState("");
  const [decisionResultEmail, setDecisionResultEmail] = useState<{ email: string; companyName: string; contactName: string; status: string; reason: string } | null>(null);
  const [decisionSendingEmail, setDecisionSendingEmail] = useState(false);
  const [decisionEmailSent, setDecisionEmailSent] = useState(false);

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
    const interval = setInterval(() => loadItems(true), 15000);
    return () => clearInterval(interval);
  }, []);

  function openApproveModal(item: any) {
    setApproveTarget(item);
    setApproveEmail(item.contact_email || "");
    setApproveProcessedBy("");
  }

  async function submitApprove() {
    if (!approveTarget) return;
    const email = approveEmail.trim();
    if (!email) {
      alert("포털 계정 로그인용 이메일을 입력해주세요.");
      return;
    }
    if (!approveProcessedBy.trim()) {
      alert("처리자 이름을 입력해주세요.");
      return;
    }

    setProcessingId(approveTarget.id);
    setError(null);
    setIssuedCredentials(null);
    setEmailSent(false);
    try {
      const res = await fetch("/api/admin/approve-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: approveTarget.id, portal_email: email, processed_by: approveProcessedBy }),
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
        companyName: approveTarget.company_name,
        contactName: approveTarget.contact_name,
      });
      setApproveTarget(null);
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
        body: JSON.stringify({ ...issuedCredentials, portalUrl }),
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

  function openDecisionModal(item: any, type: "거절" | "보류") {
    setDecisionTarget({ item, type });
    setDecisionReason("");
    setDecisionCustomNote("");
    setDecisionProcessedBy("");
    setDecisionResultEmail(null);
    setDecisionEmailSent(false);
  }

  async function submitDecision() {
    if (!decisionTarget) return;
    const reasonText = decisionReason === "기타 (직접 입력)" ? decisionCustomNote : decisionReason;
    if (!decisionProcessedBy.trim()) {
      alert("처리자 이름을 입력해주세요.");
      return;
    }

    setProcessingId(decisionTarget.item.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: decisionTarget.item.id,
          status: decisionTarget.type,
          staff_note: reasonText || null,
          processed_by: decisionProcessedBy,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "처리에 실패했습니다.");
        setProcessingId(null);
        return;
      }
      if (decisionTarget.item.contact_email) {
        setDecisionResultEmail({
          email: decisionTarget.item.contact_email,
          companyName: decisionTarget.item.company_name,
          contactName: decisionTarget.item.contact_name,
          status: decisionTarget.type,
          reason: reasonText,
        });
      } else {
        setDecisionTarget(null);
      }
      loadItems();
    } catch {
      setError("처리 중 오류가 발생했습니다.");
    }
    setProcessingId(null);
  }

  async function handleSendDecisionEmail() {
    if (!decisionResultEmail) return;
    setDecisionSendingEmail(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/send-application-status-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: decisionResultEmail.email,
          companyName: decisionResultEmail.companyName,
          contactName: decisionResultEmail.contactName,
          status: decisionResultEmail.status,
          reason: decisionResultEmail.reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "이메일 발송에 실패했습니다.");
        setDecisionSendingEmail(false);
        return;
      }
      setDecisionEmailSent(true);
    } catch {
      setError("이메일 발송 중 오류가 발생했습니다.");
    }
    setDecisionSendingEmail(false);
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
    if (!window.confirm("90일이 지난 '거절'/'보류' 상태 신청을 전부 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;
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

  const periodFiltered = useMemo(() => {
    const { from } = getDateRange(period);
    if (!from) return items;
    return items.filter((i) => new Date(i.created_at) >= new Date(from));
  }, [items, period]);

  const filtered = periodFiltered.filter((i) => filter === "전체" || i.status === filter);

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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["검토중", "승인됨", "거절", "보류", "전체"].map((s) => (
            <button
              key={s}
              className={filter === s ? "btn" : "btn btn-ghost"}
              style={{ fontSize: 12.5, padding: "7px 12px" }}
              onClick={() => setFilter(s)}
            >
              {s} ({s === "전체" ? periodFiltered.length : periodFiltered.filter((i) => i.status === s).length})
            </button>
          ))}
        </div>
        <DateRangeFilter value={period} onChange={setPeriod} />
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {issuedCredentials && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--accent-soft)", border: "none" }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--accent)" }}>
            승인 완료 — 아래 정보를 화주에게 전달해주세요 (한 번만 표시됩니다)
          </div>
          <div>이메일: <span className="num">{issuedCredentials.email}</span></div>
          <div>임시 비밀번호: <span className="num">{issuedCredentials.password}</span></div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
          <table style={{ minWidth: 1080 }}>
            <thead>
              <tr>
                <th>회사명</th>
                <th>담당자</th>
                <th>연락처</th>
                <th>구간</th>
                <th>월예상건수</th>
                <th>접수일</th>
                <th>상태</th>
                <th style={{ minWidth: 160 }}>처리</th>
                <th style={{ width: 70 }}></th>
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
                    {item.contact_email && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.contact_email}</div>}
                  </td>
                  <td>
                    {item.main_origin || item.main_destination ? `${item.main_origin || "-"} → ${item.main_destination || "-"}` : "-"}
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
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 3, maxWidth: 140 }}>{item.staff_note}</div>
                    )}
                  </td>
                  <td style={{ minWidth: 160 }}>
                    {item.status === "검토중" && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          className="btn"
                          style={{ padding: "5px 10px", fontSize: 11.5 }}
                          disabled={processingId === item.id}
                          onClick={() => openApproveModal(item)}
                        >
                          승인
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                          disabled={processingId === item.id}
                          onClick={() => openDecisionModal(item, "거절")}
                        >
                          거절
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                          disabled={processingId === item.id}
                          onClick={() => openDecisionModal(item, "보류")}
                        >
                          보류
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ width: 70 }}>
                    <button
                      className="btn-danger"
                      style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                      disabled={processingId === item.id}
                      onClick={() => handleDelete(item)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 승인 처리 모달 */}
      {approveTarget && (
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
        >
          <div className="card" style={{ padding: 24, maxWidth: 420, width: "100%" }}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>
              "{approveTarget.company_name}" 승인 처리
            </h3>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>
              화주 회사가 등록되고, 아래 이메일로 포털 계정이 즉시 발급됩니다.
            </p>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>포털 계정 로그인용 이메일</label>
              <input value={approveEmail} onChange={(e) => setApproveEmail(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 18 }}>
              <label>처리자 이름</label>
              <input value={approveProcessedBy} onChange={(e) => setApproveProcessedBy(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={submitApprove} disabled={processingId === approveTarget.id}>
                승인
              </button>
              <button className="btn btn-ghost" onClick={() => setApproveTarget(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 거절/보류 처리 모달 */}
      {decisionTarget && (
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
        >
          <div className="card" style={{ padding: 24, maxWidth: 420, width: "100%" }}>
            {!decisionResultEmail ? (
              <>
                <h3 style={{ marginTop: 0, fontSize: 15 }}>
                  "{decisionTarget.item.company_name}" {decisionTarget.type} 처리
                </h3>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>사유 선택</label>
                  <select value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)}>
                    <option value="">선택해주세요</option>
                    {(decisionTarget.type === "거절" ? REJECT_REASONS : HOLD_REASONS).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                {decisionReason === "기타 (직접 입력)" && (
                  <div className="field" style={{ marginBottom: 12 }}>
                    <label>사유 직접 입력</label>
                    <textarea rows={2} value={decisionCustomNote} onChange={(e) => setDecisionCustomNote(e.target.value)} />
                  </div>
                )}
                <div className="field" style={{ marginBottom: 18 }}>
                  <label>처리자 이름</label>
                  <input value={decisionProcessedBy} onChange={(e) => setDecisionProcessedBy(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={submitDecision} disabled={processingId === decisionTarget.item.id}>
                    {decisionTarget.type} 처리
                  </button>
                  <button className="btn btn-ghost" onClick={() => setDecisionTarget(null)}>
                    취소
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0, fontSize: 15 }}>처리 완료</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  담당자 이메일({decisionResultEmail.email})로 사유를 안내하는 메일을 보낼까요?
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={handleSendDecisionEmail} disabled={decisionSendingEmail || decisionEmailSent}>
                    {decisionEmailSent ? "발송 완료 ✓" : decisionSendingEmail ? "발송 중..." : "메일 발송"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setDecisionTarget(null)}>
                    닫기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
