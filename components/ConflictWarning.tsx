"use client";

export default function ConflictWarning({
  onReload,
  onForceSave,
  saving,
}: {
  onReload: () => void;
  onForceSave: () => void;
  saving?: boolean;
}) {
  return (
    <div
      style={{
        background: "#fff1e2",
        color: "#92400e",
        border: "1px solid #fcd9a8",
        borderRadius: "var(--radius)",
        padding: "12px 14px",
        marginBottom: 14,
        fontSize: 13,
      }}
    >
      다른 직원이 방금 이 정보를 수정했습니다. 화면을 새로고침해서 최신 내용을 먼저
      확인하시는 걸 권장합니다.
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          className="btn"
          style={{ padding: "6px 12px", fontSize: 12.5 }}
          onClick={onReload}
        >
          새로고침
        </button>
        <button
          className="btn-ghost"
          style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }}
          onClick={onForceSave}
          disabled={saving}
        >
          {saving ? "저장 중..." : "그래도 내 변경사항으로 덮어쓰기"}
        </button>
      </div>
    </div>
  );
}
