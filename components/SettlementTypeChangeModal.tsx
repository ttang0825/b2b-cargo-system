"use client";

import { useState } from "react";
import { SETTLEMENT_TYPES } from "@/lib/constants";

// 오더/배차 확정 이후, 또는 정산 건 정산방식을 바꿀 때 사유 입력을 강제하는 공용 모달.
// (2차 세션: 운임 정산방식 — settlement_type_change_logs와 함께 사용)
export default function SettlementTypeChangeModal({
  currentType,
  onCancel,
  onConfirm,
  saving,
}: {
  currentType: string;
  onCancel: () => void;
  onConfirm: (newType: string, reason: string) => void;
  saving?: boolean;
}) {
  const [newType, setNewType] = useState(currentType);
  const [reason, setReason] = useState("");

  const canSubmit = newType !== currentType && reason.trim().length > 0;

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
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>정산방식 변경</h3>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
          이미 확정된 건의 정산방식을 바꾸려면 사유를 남겨야 합니다.
        </p>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>새 정산방식</label>
          <select value={newType} onChange={(e) => setNewType(e.target.value)}>
            {SETTLEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 18 }}>
          <label>변경 사유 *</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="변경 사유를 입력해주세요"
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn"
            disabled={!canSubmit || saving}
            onClick={() => onConfirm(newType, reason.trim())}
          >
            {saving ? "저장 중..." : "변경 저장"}
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
