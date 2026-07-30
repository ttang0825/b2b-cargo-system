"use client";

import { useState } from "react";

// 확정(잠금)된 레코드를 관리자가 예외적으로 수정할 때 사유 입력을 강제하는
// 공용 모달 — SettlementTypeChangeModal과 같은 톤앤매너(원칙 39번 패턴).
// 정산 마감·확정·잠금(로드맵 ①)에서 첫 사례로 도입
export default function AmendmentReasonModal({
  title = "확정된 건 수정",
  description = "이미 확정된 건을 수정하려면 사유를 남겨야 합니다.",
  onCancel,
  onConfirm,
  saving,
}: {
  title?: string;
  description?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  saving?: boolean;
}) {
  const [reason, setReason] = useState("");
  const canSubmit = reason.trim().length > 0;

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
      onClick={onCancel}
    >
      <div
        className="card"
        style={{ padding: 24, maxWidth: 420, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>{title}</h3>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
          {description}
        </p>
        <div className="field" style={{ marginBottom: 18 }}>
          <label>수정 사유 *</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="수정 사유를 입력해주세요"
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn"
            disabled={!canSubmit || saving}
            onClick={() => onConfirm(reason.trim())}
          >
            {saving ? "저장 중..." : "사유 저장하고 계속"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}
            onClick={onCancel}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
