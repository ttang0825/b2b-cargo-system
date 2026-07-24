"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/components/ApplicationDetailModal";
import { notifyBadgeRefresh } from "@/lib/notifyBadgeRefresh";

export const STATUS_OPTIONS = ["신규", "연락완료", "종료"];
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  신규: { bg: "#fff1e2", text: "#d9730d" },
  연락완료: { bg: "#e6f7ec", text: "#1b9c57" },
  종료: { bg: "var(--bg)", text: "var(--text-muted)" },
};

function formatDateTime(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatDate(value)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 13 }}>
      <div style={{ width: 100, flexShrink: 0, color: "var(--text-muted)" }}>{label}</div>
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

export default function PublicQuoteDetailModal({
  item,
  onClose,
  onChanged,
}: {
  item: any;
  onClose: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(item.status);
  const [note, setNote] = useState(item.staff_note || "");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/admin/public-quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action: "update", status, staff_note: note || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLocalError(data.error || "저장에 실패했습니다.");
        setSaving(false);
        return;
      }
      onChanged();
      notifyBadgeRefresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setLocalError("저장 중 오류가 발생했습니다.");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!window.confirm(`"${item.name}"님의 문의를 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    setSaving(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/admin/public-quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action: "delete" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLocalError(data.error || "삭제에 실패했습니다.");
        setSaving(false);
        return;
      }
      onChanged();
      notifyBadgeRefresh();
      onClose();
    } catch {
      setLocalError("삭제 중 오류가 발생했습니다.");
      setSaving(false);
    }
  }

  const originExtra = [item.origin_company, item.origin_contact, item.origin_department].filter(Boolean).join(" / ");
  const destinationExtra = [item.destination_company, item.destination_contact, item.destination_department]
    .filter(Boolean)
    .join(" / ");

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>공개 견적문의 상세</h3>
          <button
            className="btn-ghost"
            style={{ padding: "4px 8px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <SectionTitle>문의자 정보</SectionTitle>
        <DetailRow label="성함/업체명" value={item.name || "-"} />
        <DetailRow label="연락처" value={item.phone || "-"} />
        <DetailRow label="이메일" value={item.email || "미입력"} />

        <SectionTitle>운송정보</SectionTitle>
        <DetailRow label="출발지" value={item.origin || "-"} />
        {originExtra && <DetailRow label="출발지 상세" value={originExtra} />}
        <DetailRow label="도착지" value={item.destination || "-"} />
        {destinationExtra && <DetailRow label="도착지 상세" value={destinationExtra} />}
        <DetailRow label="희망 톤수" value={item.vehicle_type || "-"} />
        <DetailRow label="품목" value={item.item || "미입력"} />
        <DetailRow label="상하차 방법" value={item.loading_method || "미입력"} />
        <DetailRow
          label="희망 상차일시"
          value={item.requested_pickup_at ? formatDateTime(item.requested_pickup_at) : "미입력"}
        />
        <DetailRow label="문의 내용" value={item.notes || "미입력"} />

        <SectionTitle>접수정보</SectionTitle>
        <DetailRow label="접수일" value={item.created_at ? formatDateTime(item.created_at) : "-"} />

        <div style={{ marginTop: 10 }}>
          {item.quote_id ? (
            <button
              className="btn-ghost"
              style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}
              onClick={() => router.push(`/admin/quotes/${item.quote_id}`)}
            >
              연결된 견적 보기 →
            </button>
          ) : (
            <button
              className="btn-ghost"
              style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}
              onClick={() => router.push(`/admin/quotes?from_quote_request=${item.id}`)}
            >
              견적관리로 전환 →
            </button>
          )}
        </div>

        <SectionTitle>답변 작성</SectionTitle>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>상태</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>답변/안내 (고객이 "내 문의 조회"에서 확인할 수 있습니다)</label>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {localError && <div className="error-box" style={{ marginBottom: 12 }}>{localError}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={handleSave} disabled={saving}>
            {saved ? "저장 완료 ✓" : saving ? "저장 중..." : "저장"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            닫기
          </button>
        </div>

        <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
          <button
            onClick={handleDelete}
            disabled={saving}
            style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 11.5, cursor: "pointer", padding: 0 }}
          >
            이 문의 삭제
          </button>
        </div>
      </div>
    </div>
  );
}
