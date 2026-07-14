"use client";

// 쉼표로 구분된 문자열(value)을 여러 개 클릭해서 켜고 끌 수 있는 태그 선택기
export default function MultiSelectTags({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string; // "서울, 경기" 형태로 저장/전달
  onChange: (v: string) => void;
}) {
  const selected = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
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
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 12,
              cursor: "pointer",
              border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
              background: active ? "var(--accent-soft)" : "var(--surface)",
              color: active ? "var(--accent)" : "var(--text)",
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
