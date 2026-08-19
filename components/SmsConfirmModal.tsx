"use client";

import { useState } from "react";
import { SMS_BYTE_LIMIT, byteLength } from "@/lib/sms/byteLength";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";

export interface SmsPreview {
  relatedType: "dispatch" | "application" | "portal_account" | "quote";
  relatedId: string;
  templateType: string;
  recipientType: "driver" | "customer" | "applicant";
  recipientPhone: string | null;
  message: string;
  /**
   * 발신번호 관련 정보(35차). 서버가 세션으로 결정해 내려주며 **읽기 전용**이다 —
   * 발송 시점에 임의로 바꿀 수 없어야 한다(솔라피에 사전 등록된 번호만 유효).
   * 그래서 모달은 이 값을 보여주기만 하고 /api/admin/send-sms로 되돌려 보내지 않는다.
   */
  senderDisplay?: string | null;
  senderStaffName?: string | null;
  senderIsStaffPhone?: boolean;
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

        {/* 발신번호는 읽기 전용 — 어느 번호로 나가는지 모르고 보내는 상황을 없앤다 */}
        <div className="field" style={{ marginBottom: 10 }}>
          <label>발신번호</label>
          <div
            style={{
              fontSize: 13.5,
              padding: "9px 11px",
              borderRadius: 8,
              background: "var(--bg-subtle, #f7f8f9)",
              color: preview.senderIsStaffPhone ? "inherit" : "var(--text-muted)",
            }}
          >
            {preview.senderDisplay || "대표 발신번호"}
            {preview.senderIsStaffPhone && preview.senderStaffName ? ` (담당 ${preview.senderStaffName})` : ""}
          </div>
          {preview.senderIsStaffPhone === false && (
            <div
              className="error-box"
              style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6 }}
            >
              ⚠️ 발신번호가 등록되지 않아 대표번호({COMPANY_SUPPORT_PHONE})로 발송됩니다.
              <br />
              회신이 담당자에게 오지 않습니다.
            </div>
          )}
        </div>

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
          {/* 35차부터 8종이 전부 LMS다(견적안내의 90byte 압축을 폐기). 그래서 90byte
              초과를 빨간 경고로 띄우면 매번 뜨는 무의미한 경고가 된다 — 종류만 담담히
              보여주고, 한 화면에 안 들어올 만큼 길어질 때(500byte 초과)만 주의를 준다. */}
          <div
            style={{
              fontSize: 11,
              marginTop: 4,
              textAlign: "right",
              color: byteLength(message) > 500 ? "var(--danger)" : "var(--text-muted)",
            }}
          >
            {byteLength(message)}byte
            {byteLength(message) > SMS_BYTE_LIMIT ? " (LMS)" : " (SMS)"}
            {byteLength(message) > 500 ? " · 길어서 한 화면에 안 들어올 수 있습니다" : ""}
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
