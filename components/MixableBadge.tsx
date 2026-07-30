// 혼적가능 오더/배차/정산 건임을 눈에 띄게 표시하는 공용 배지.
// 상태값 배지들이 이미 쓰고 있는 앰버(#FEF3C7/#B45309) 톤과 겹치지 않도록
// 오렌지 계열로 구분함 — 운송오더/배차관리 목록·상세, 정산관리에서 재사용
export default function MixableBadge({ title }: { title?: string }) {
  return (
    <span
      className="badge"
      title={title || "혼적가능 화물 — 혼적 할인이 반영된 운임입니다"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "#FFEDD5",
        color: "#C2410C",
        fontWeight: 700,
      }}
    >
      🔀 혼적가능
    </span>
  );
}
