"use client";

import { useState } from "react";
import { SMS_BYTE_LIMIT, byteLength } from "@/lib/sms/byteLength";

export interface SmsPreview {
  relatedType: "dispatch" | "application" | "portal_account" | "quote";
  relatedId: string;
  templateType: string;
  recipientType: "driver" | "customer" | "applicant";
  recipientPhone: string | null;
  message: string;
}

// 자동발송 이벤트(배차확정·승인 등)도 실제 발송 직전에 문구·수신번호를 확인하고
// 고칠 수 있게 하는 공용 모달(PR #73 리뷰 반영) — 각 트리거 지점은 "그 자리에서"
// 이 모달을 띄우고, 여기서 "발송"을 눌러야만 /api/admin/send-sms가 호출됨.
// "건너뛰기"를 누르면 SMS 없이 넘어감(배차확정 등 원래 액션은 이미 처리된 뒤이므로
// 영향 없음).
export default function SmsConfirmModal({
  preview,
  onSent,
  onSkip,
}: {
  preview: SmsPreview;
  onSent: () => void;
  onSkip: () => void;
}) {
  const [message, setMessage] = useState(preview.message);
  const [phone, setPhone] = useState(preview.recipientPhone || "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!phone.trim()) {
      setError("수신번호를 입력해주세요.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relatedType: preview.relatedType,
          relatedId: preview.relatedId,
          templateType: preview.templateType,
          recipientType: preview.recipientType,
          recipientPhone: phone.trim(),
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "발송에 실패했습니다.");
        return;
      }
      onSent();
    } catch {
      setError("발송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      onClick={onSkip}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ padding: 20, width: "100%", maxWidth: 420 }}
      >
        <h3 style={{ fontSize: 15, margin: "0 0 4px" }}>문자 발송 확인</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px" }}>
          아래 수신번호·문구를 확인하고 필요하면 수정한 뒤 발송해주세요.
        </p>

        <div className="field" style={{ marginBottom: 10 }}>
          <label>수신번호</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
          />
        </div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label>문자 내용</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            style={{ width: "100%", resize: "vertical", fontFamily: "inherit" }}
          />
          <div
            style={{
              fontSize: 11,
              marginTop: 4,
              textAlign: "right",
              color: byteLength(message) > SMS_BYTE_LIMIT ? "var(--danger)" : "var(--text-muted)",
            }}
          >
            {byteLength(message)} / {SMS_BYTE_LIMIT}byte
            {byteLength(message) > SMS_BYTE_LIMIT ? " (SMS 상한 초과 — LMS로 발송됩니다)" : " (SMS)"}
          </div>
        </div>

        {error && <div className="error-box" style={{ marginBottom: 10 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onSkip} disabled={sending}>
            건너뛰기(발송 안 함)
          </button>
          <button className="btn" onClick={handleSend} disabled={sending}>
            {sending ? "발송 중..." : "발송"}
          </button>
        </div>
      </div>
    </div>
  );
}
