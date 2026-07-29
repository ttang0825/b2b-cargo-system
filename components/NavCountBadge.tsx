"use client";

// 관리자 TopNav에서 쓰던 숫자 배지를 화주포털에서도 재사용할 수 있도록 공용
// 컴포넌트로 분리함 — 조건부 렌더링이 아니라 `visibility` 토글 방식이라
// count가 0→N으로 바뀌어도 메뉴 레이아웃이 밀리지 않음 (원칙 15번)
export default function NavCountBadge({ count }: { count: number }) {
  return (
    <span
      style={{
        marginLeft: 6,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 16,
        height: 16,
        padding: "0 4px",
        borderRadius: 999,
        background: "var(--danger)",
        color: "#fff",
        fontSize: 10,
        fontWeight: 800,
        visibility: count > 0 ? "visible" : "hidden",
      }}
    >
      {count}
    </span>
  );
}
