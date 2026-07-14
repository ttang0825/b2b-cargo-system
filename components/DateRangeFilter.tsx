"use client";

export type DatePreset = "today" | "week" | "month" | "all";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "week", label: "이번주" },
  { key: "month", label: "이번달" },
  { key: "all", label: "전체" },
];

// preset에 해당하는 시작일(from)을 ISO 문자열로 반환. "전체"는 null(필터 없음).
export function getDateRange(preset: DatePreset): { from: string | null } {
  if (preset === "all") return { from: null };

  const now = new Date();
  let from: Date;

  if (preset === "today") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (preset === "week") {
    const day = now.getDay(); // 0=일 ~ 6=토
    const diffToMonday = day === 0 ? 6 : day - 1;
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  } else {
    // month
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { from: from.toISOString() };
}

export default function DateRangeFilter({
  value,
  onChange,
}: {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          className={value === p.key ? "btn" : "btn btn-ghost"}
          style={{ fontSize: 12.5, padding: "6px 12px" }}
          onClick={() => onChange(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
