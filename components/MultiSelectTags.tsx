"use client";

// 쉼표로 구분된 문자열(value)을 여러 개 클릭해서 켜고 끌 수 있는 태그 선택기
// 🔴 31차에 `variant` 가 생겼다 — **저장 형식("서울, 경기" 콤마 문자열)은 그대로이고
// 색만 다르다.** 폼 3화면이 시안으로 바뀌면서 `.portal-theme` 팔레트 밖으로 나갔는데
// (`--accent` 가 파랑으로 돌아간다), 화면이 태그를 따로 그리면 저장 형식이 갈린다.
// 그래서 컴포넌트 안에서 색만 분기했다 — 관리자 4개 화면은 기본값 그대로다.
const PALETTE = {
  portal: {
    on: { border: "1px solid var(--accent)", background: "var(--accent-soft)", color: "var(--accent)" },
    off: { border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" },
    pad: "4px 10px",
    size: 12,
    extra: {} as React.CSSProperties,
  },
  landing: {
    on: { border: "1px solid #FFD834", background: "#FFFCEC", color: "#0E0F12" },
    off: { border: "1px solid #EBEAE7", background: "#FAFAF8", color: "#4A4945" },
    pad: "9px 16px",
    size: 13.5,
    extra: { whiteSpace: "nowrap", fontFamily: "inherit" } as React.CSSProperties,
  },
} as const;

export default function MultiSelectTags({
  options,
  value,
  onChange,
  variant = "portal",
}: {
  options: string[];
  value: string; // "서울, 경기" 형태로 저장/전달
  onChange: (v: string) => void;
  variant?: "portal" | "landing";
}) {
  const palette = PALETTE[variant];
  const selected = value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => options.includes(s)) // 예전 자유입력 텍스트 등 목록에 없는 값은 제외
    : [];

  function toggle(opt: string) {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onChange(next.join(", "));
  }

  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            onClick={() => toggle(opt)}
            style={{
              padding: palette.pad,
              borderRadius: 999,
              fontSize: palette.size,
              cursor: "pointer",
              // 🔴 `extra` 는 landing 에만 있다 — portal(관리자 4개 화면)의 렌더링 값을
              //    31차 이전과 **한 글자도 다르지 않게** 두기 위해서다.
              ...palette.extra,
              ...(active ? palette.on : palette.off),
              fontWeight: active ? 600 : 400,
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
