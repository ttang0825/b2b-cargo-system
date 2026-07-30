// 정산 확정(잠금) 표시 — MixableBadge와 같은 패턴의 작은 배지 컴포넌트.
// 정산관리 목록/상세에서 invoice.locked === true인 건에 재사용
export default function LockedBadge() {
  return (
    <span
      className="badge"
      style={{
        display: "inline-block",
        background: "#1E293B",
        color: "#F8FAFC",
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 999,
      }}
    >
      🔒 정산확정
    </span>
  );
}
