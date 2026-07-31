"use client";

import { useState } from "react";
import CollectionMethodInput, { CollectionMethodValue } from "@/components/CollectionMethodInput";

// 로드맵 ②-A 신규 정산방식 필드(collection_method/billing_cycle/
// direct_collection_point) 전용 사유입력 변경 모달. 기존
// components/SettlementTypeChangeModal.tsx(구형 settlement_type 전용,
// legacy)와 같은 자리에서 쓰이되 신규 필드 3종을 한 번에 다룬다.
export default function SettlementFieldsChangeModal({
  currentValue,
  onCancel,
  onConfirm,
  saving,
}: {
  currentValue: CollectionMethodValue;
  onCancel: () => void;
  onConfirm: (next: CollectionMethodValue, reason: string) => void;
  saving?: boolean;
}) {
  const [value, setValue] = useState<CollectionMethodValue>(currentValue);
  const [reason, setReason] = useState("");

  const changed =
    value.collection_method !== currentValue.collection_method ||
    value.billing_cycle !== currentValue.billing_cycle ||
    value.direct_collection_point !== currentValue.direct_collection_point;
  const canSubmit = changed && reason.trim().length > 0;

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
        style={{ padding: 24, maxWidth: 460, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>정산방식 변경</h3>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
          이미 확정된 건의 정산방식을 바꾸려면 사유를 남겨야 합니다.
        </p>
        <div style={{ marginBottom: 14 }}>
          <CollectionMethodInput namePrefix="settlement_fields_modal" value={value} onChange={setValue} />
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
            onClick={() => onConfirm(value, reason.trim())}
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
