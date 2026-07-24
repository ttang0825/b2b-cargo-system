"use client";

import { useState } from "react";
import ProcessedByFooter from "@/components/ProcessedByFooter";

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
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

export function formatDate(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

function formatDateTime(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatDate(value)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 13 }}>
      <div style={{ width: 110, flexShrink: 0, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ flex: 1, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", margin: "16px 0 4px" }}>
      {children}
    </div>
  );
}

type ResultData =
  | { kind: "approve"; email: string; password: string }
  | { kind: "decision"; type: "거절" | "보류"; email: string; companyName: string; contactName: string; reason: string };

export default function ApplicationDetailModal({
  item,
  allItems,
  onClose,
  onChanged,
}: {
  item: any;
  allItems?: any[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [step, setStep] = useState<"view" | "reject" | "hold" | "approve" | "result">("view");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [reason, setReason] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [decisionProcessedBy, setDecisionProcessedBy] = useState("");

  const [approveEmail, setApproveEmail] = useState(item.contact_email || "");
  const [approveProcessedBy, setApproveProcessedBy] = useState("");

  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  function openDecisionStep(type: "거절" | "보류") {
    setReason("");
    setCustomNote("");
    setDecisionProcessedBy("");
    setLocalError(null);
    setStep(type === "거절" ? "reject" : "hold");
  }

  function openApproveStep() {
    setApproveEmail(item.contact_email || "");
    setApproveProcessedBy("");
    setLocalError(null);
    setStep("approve");
  }

  async function submitDecision(type: "거절" | "보류") {
    const reasonText = reason === "기타 (직접 입력)" ? customNote : reason;
    if (!decisionProcessedBy.trim()) {
      setLocalError("처리자 이름을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status: type,
          staff_note: reasonText || null,
          processed_by: decisionProcessedBy,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLocalError(data.error || "처리에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      onChanged();
      if (item.contact_email) {
        setResultData({
          kind: "decision",
          type,
          email: item.contact_email,
          companyName: item.company_name,
          contactName: item.contact_name,
          reason: reasonText,
        });
        setStep("result");
      } else {
        onClose();
      }
    } catch {
      setLocalError("처리 중 오류가 발생했습니다.");
    }
    setSubmitting(false);
  }

  async function submitApprove() {
    const email = approveEmail.trim();
    if (!email) {
      setLocalError("포털 계정 로그인용 이메일을 입력해주세요.");
      return;
    }
    if (!approveProcessedBy.trim()) {
      setLocalError("처리자 이름을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/admin/approve-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: item.id, portal_email: email, processed_by: approveProcessedBy }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLocalError(data.error || "승인 처리에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      onChanged();
      setResultData({ kind: "approve", email: data.email, password: data.password });
      setStep("result");
    } catch {
      setLocalError("승인 처리 중 오류가 발생했습니다.");
    }
    setSubmitting(false);
  }

  async function handleSendResultEmail() {
    if (!resultData) return;
    setSendingEmail(true);
    setLocalError(null);
    try {
      if (resultData.kind === "approve") {
        const portalUrl = `${window.location.origin}/customer/login`;
        const res = await fetch("/api/admin/send-portal-credentials-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: resultData.email,
            password: resultData.password,
            companyName: item.company_name,
            contactName: item.contact_name,
            portalUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setLocalError(data.error || "이메일 발송에 실패했습니다.");
          setSendingEmail(false);
          return;
        }
      } else {
        const res = await fetch("/api/admin/send-application-status-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: resultData.email,
            companyName: resultData.companyName,
            contactName: resultData.contactName,
            status: resultData.type,
            reason: resultData.reason,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setLocalError(data.error || "이메일 발송에 실패했습니다.");
          setSendingEmail(false);
          return;
        }
      }
      setEmailSent(true);
    } catch {
      setLocalError("이메일 발송 중 오류가 발생했습니다.");
    }
    setSendingEmail(false);
  }

  async function handleDelete() {
    if (!window.confirm(`"${item.company_name}"의 신청 기록을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: item.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLocalError(data.error || "삭제에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      onChanged();
      onClose();
    } catch {
      setLocalError("삭제 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  const statusColor: { bg?: string; text?: string } = STATUS_COLORS[item.status] || {};

  // 같은 업체(이메일 또는 사업자등록번호 기준)의 다른 신청 건 — 재신청 판단 시 참고용
  const relatedHistory = (allItems || [])
    .filter(
      (i) =>
        i.id !== item.id &&
        ((item.contact_email && i.contact_email === item.contact_email) ||
          (item.business_reg_no && i.business_reg_no === item.business_reg_no))
    )
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
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
      onClick={onClose}
    >
      <div
        className="card"
        style={{ padding: 24, maxWidth: 460, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {step === "view" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>화주등록신청 상세</h3>
              <button
                className="btn-ghost"
                style={{ padding: "4px 8px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                onClick={onClose}
              >
                ✕
              </button>
            </div>

            <SectionTitle>기본정보</SectionTitle>
            <DetailRow label="회사명" value={item.company_name || "-"} />
            <DetailRow label="사업자등록번호" value={item.business_reg_no || "미입력"} />
            <DetailRow label="담당자명" value={item.contact_name || "-"} />
            <DetailRow label="담당자 연락처" value={item.contact_phone || "-"} />
            <DetailRow label="담당자 이메일" value={item.contact_email || "미입력"} />

            <SectionTitle>운송정보</SectionTitle>
            <DetailRow label="주요 출발지" value={item.main_origin || "미입력"} />
            <DetailRow label="주요 도착지" value={item.main_destination || "미입력"} />
            <DetailRow label="월 예상 운송건수" value={item.monthly_volume_estimate || "미입력"} />
            <DetailRow label="업종" value={item.industry || "미입력"} />
            <DetailRow label="이용 지역" value={item.preferred_regions || "미입력"} />
            <DetailRow label="이용 차량" value={item.preferred_vehicle || "미입력"} />
            <DetailRow label="메모" value={item.notes || "미입력"} />

            <SectionTitle>신청정보</SectionTitle>
            <DetailRow label="신청일" value={item.created_at ? formatDateTime(item.created_at) : "-"} />
            <div style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 13, alignItems: "center" }}>
              <div style={{ width: 110, flexShrink: 0, color: "var(--text-muted)" }}>현재 상태</div>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  background: statusColor.bg,
                  color: statusColor.text,
                }}
              >
                {item.status}
              </span>
            </div>

            {item.status !== "검토중" && (
              <>
                <SectionTitle>처리 이력</SectionTitle>
                <DetailRow label="처리자" value={item.processed_by || "-"} />
                <DetailRow label="사유" value={item.staff_note || "-"} />
              </>
            )}

            {relatedHistory.length > 0 && (
              <>
                <SectionTitle>이전 신청 이력</SectionTitle>
                {relatedHistory.map((h) => (
                  <div key={h.id} style={{ fontSize: 12.5, padding: "3px 0", color: "var(--text-muted)" }}>
                    {h.created_at ? formatDate(h.created_at) : "-"} {h.status}
                    {h.staff_note ? ` (사유: ${h.staff_note})` : ""}
                  </div>
                ))}
              </>
            )}

            <ProcessedByFooter
              createdBy={item.created_by}
              createdAt={item.created_at}
              updatedBy={item.updated_by}
              updatedAt={item.updated_at}
            />

            {localError && <div className="error-box" style={{ marginTop: 14 }}>{localError}</div>}

            {item.status === "검토중" && (
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <button
                  className="btn-danger"
                  style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}
                  onClick={() => openDecisionStep("거절")}
                >
                  거절
                </button>
                <button
                  className="btn-ghost"
                  style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}
                  onClick={() => openDecisionStep("보류")}
                >
                  보류
                </button>
                <button
                  className="btn"
                  style={{ padding: "8px 14px", fontSize: 12.5, marginLeft: "auto" }}
                  onClick={openApproveStep}
                >
                  승인
                </button>
              </div>
            )}

            <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
              <button
                onClick={handleDelete}
                disabled={submitting}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--danger)",
                  fontSize: 11.5,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                이 신청 기록 삭제
              </button>
            </div>
          </>
        )}

        {(step === "reject" || step === "hold") && (
          <>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>
              "{item.company_name}" {step === "reject" ? "거절" : "보류"} 처리
            </h3>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>사유 선택</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">선택해주세요</option>
                {(step === "reject" ? REJECT_REASONS : HOLD_REASONS).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            {reason === "기타 (직접 입력)" && (
              <div className="field" style={{ marginBottom: 12 }}>
                <label>사유 직접 입력</label>
                <textarea rows={2} value={customNote} onChange={(e) => setCustomNote(e.target.value)} />
              </div>
            )}
            <div className="field" style={{ marginBottom: 18 }}>
              <label>처리자 이름</label>
              <input value={decisionProcessedBy} onChange={(e) => setDecisionProcessedBy(e.target.value)} />
            </div>
            {localError && <div className="error-box" style={{ marginBottom: 12 }}>{localError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => submitDecision(step === "reject" ? "거절" : "보류")} disabled={submitting}>
                {step === "reject" ? "거절" : "보류"} 처리
              </button>
              <button className="btn btn-ghost" onClick={() => setStep("view")}>
                취소
              </button>
            </div>
          </>
        )}

        {step === "approve" && (
          <>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>"{item.company_name}" 승인 처리</h3>
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
            {localError && <div className="error-box" style={{ marginBottom: 12 }}>{localError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={submitApprove} disabled={submitting}>
                승인
              </button>
              <button className="btn btn-ghost" onClick={() => setStep("view")}>
                취소
              </button>
            </div>
          </>
        )}

        {step === "result" && resultData && (
          <>
            {resultData.kind === "approve" ? (
              <>
                <h3 style={{ marginTop: 0, fontSize: 15 }}>승인 완료</h3>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 10 }}>
                  아래 정보를 화주에게 전달해주세요 (한 번만 표시됩니다)
                </p>
                <div>이메일: <span className="num">{resultData.email}</span></div>
                <div>임시 비밀번호: <span className="num">{resultData.password}</span></div>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0, fontSize: 15 }}>처리 완료</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  담당자 이메일({resultData.email})로 사유를 안내하는 메일을 보낼까요?
                </p>
              </>
            )}
            {localError && <div className="error-box" style={{ margin: "12px 0" }}>{localError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={handleSendResultEmail} disabled={sendingEmail || emailSent}>
                {emailSent ? "발송 완료 ✓" : sendingEmail ? "발송 중..." : "메일 발송"}
              </button>
              <button className="btn btn-ghost" onClick={onClose}>
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
