"use client";

export type DatePreset = "today" | "week" | "month" | "all" | "custom";

/** 직접지정 구간. 값은 `<input type="date">` 가 쓰는 "YYYY-MM-DD" 문자열이다(빈 값 = 안 정함). */
export type CustomDateRange = { from: string; to: string };

export const EMPTY_CUSTOM_RANGE: CustomDateRange = { from: "", to: "" };

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "week", label: "이번주" },
  { key: "month", label: "이번달" },
  { key: "all", label: "전체" },
  { key: "custom", label: "직접지정" },
];

/** "YYYY-MM-DD" 를 **로컬** 자정으로 읽는다. 🔴 `new Date("2026-09-17")` 은 UTC 라 KST 에서 하루가 밀린다. */
function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 오늘을 "YYYY-MM-DD" 로. (`toISOString()` 은 UTC 라 저녁에 어제가 나온다) */
export function toDateInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 직접지정을 처음 켤 때 채워 넣는 기본값 — 이번달 1일 ~ 오늘. */
export function defaultCustomRange(): CustomDateRange {
  const now = new Date();
  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInputValue(now),
  };
}

/**
 * preset 에 해당하는 조회 구간을 ISO 문자열로 반환한다.
 *
 * 🔴 `to` 는 **그 날을 포함하는 상한(다음 날 자정, 미포함 비교용)** 이다 —
 *    호출부는 반드시 `.lt(col, to)` 로 쓸 것. `.lte(col, 그 날 자정)` 으로 바꾸면
 *    **끝날 00:00 이후에 생긴 건이 통째로 빠진다**(화주포털 `Pv2PeriodFilter` 가 겪은 자리).
 * 🔴 프리셋 계산은 예전 그대로다 — 화주포털·관리자가 같은 뜻이어야 한다.
 */
export function getDateRange(
  preset: DatePreset,
  custom?: CustomDateRange
): { from: string | null; to: string | null } {
  if (preset === "all") return { from: null, to: null };

  if (preset === "custom") {
    const fromDate = parseLocalDate(custom?.from || "");
    const toDate = parseLocalDate(custom?.to || "");
    return {
      from: fromDate ? fromDate.toISOString() : null,
      // 끝날 그 자체를 포함하려면 다음 날 자정이 상한이어야 한다.
      to: toDate
        ? new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1).toISOString()
        : null,
    };
  }

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

  return { from: from.toISOString(), to: null };
}

export default function DateRangeFilter({
  value,
  onChange,
  custom = EMPTY_CUSTOM_RANGE,
  onCustomChange,
}: {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
  /** 직접지정 구간. 넘기지 않으면 「직접지정」 버튼 자체를 그리지 않는다(옛 호출부 호환). */
  custom?: CustomDateRange;
  onCustomChange?: (range: CustomDateRange) => void;
}) {
  const supportsCustom = typeof onCustomChange === "function";
  const presets = supportsCustom ? PRESETS : PRESETS.filter((p) => p.key !== "custom");

  function handlePreset(key: DatePreset) {
    // 직접지정을 처음 켜면 이번달 1일~오늘로 채운다 — 빈 구간이면 「전체」와 구분이 안 된다.
    if (key === "custom" && onCustomChange && !custom.from && !custom.to) {
      onCustomChange(defaultCustomRange());
    }
    onChange(key);
  }

  return (
    <div className="date-range">
      <div className="date-range-presets">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            className={value === p.key ? "btn" : "btn btn-ghost"}
            style={{ fontSize: 12.5, padding: "6px 12px" }}
            onClick={() => handlePreset(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {supportsCustom && value === "custom" && (
        <div className="date-range-custom">
          <input
            type="date"
            className="date-range-date"
            value={custom.from}
            max={custom.to || undefined}
            aria-label="조회 시작일"
            onChange={(e) => onCustomChange!({ ...custom, from: e.target.value })}
          />
          <span className="date-range-tilde" aria-hidden>
            ~
          </span>
          <input
            type="date"
            className="date-range-date"
            value={custom.to}
            min={custom.from || undefined}
            aria-label="조회 종료일"
            onChange={(e) => onCustomChange!({ ...custom, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
