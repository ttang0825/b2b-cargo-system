"use client";

import { useEffect, useId, useState } from "react";
import { usePv2Popover } from "./pv2Popover";

// 화주 운송관리 포털 전용 달력 — 26차
//
// 🔴 **`<input type="date">` 를 대신한다. 되돌리지 말 것.**
// "연도-월-일" 이라는 빈칸 표시와 달력 자체를 **브라우저·OS 가 그린다** — CSS 로 바꿀
// 수 없다. 지적 8·9번(빈칸 문구가 다르다 / 달력 모양이 다르다)이 전부 이것이다.
//
// ⚠️ 값 형식은 `"YYYY-MM-DD"` 그대로다. 저장 시 `lib/localDateTime.ts` 를 거치는 규칙
//    (원칙 41번)은 호출부에 그대로 남는다 — 여기서 ISO 로 바꾸지 않는다.
// 🔴 **`min`/`max` 를 반드시 존중한다** — 25차가 만든 하한(오늘)·상한(+30일)이 여기로
//    옮겨온다. 범위 밖 날짜는 **숨기지 않고 흐리게 두고 클릭만 막는다**(시안).

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

/** '2026-09-07' → '2026. 09. 07.' (값이 없으면 '날짜 선택') */
export function formatDateLabel(v: string) {
  if (!v) return "날짜 선택";
  const [y, m, d] = v.split("-");
  if (!y || !m || !d) return v;
  return `${y}. ${m}. ${d}.`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function Pv2DatePicker({
  value,
  onChange,
  min,
  max,
  ariaLabel,
  className = "",
  wrapClassName = "",
  wrapStyle,
}: {
  value: string;
  onChange: (v: string) => void;
  /** "YYYY-MM-DD" — 이 날짜 이전은 고를 수 없다 */
  min?: string;
  /** "YYYY-MM-DD" — 이 날짜 이후는 고를 수 없다 */
  max?: string;
  ariaLabel?: string;
  className?: string;
  wrapClassName?: string;
  wrapStyle?: React.CSSProperties;
}) {
  const uid = useId();
  const { open, setOpen, openPop, wrapRef } = usePv2Popover(uid);

  const base = value || min || ymd(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const [cursor, setCursor] = useState(() => {
    const [y, m] = base.split("-").map(Number);
    return { y, m: (m || 1) - 1 };
  });

  // 열 때마다 선택값(없으면 하한)이 있는 달로 되돌린다 —
  // 지난번에 넘겨둔 달이 남아 있으면 "왜 다른 달이 뜨지" 가 된다.
  useEffect(() => {
    if (!open) return;
    const [y, m] = base.split("-").map(Number);
    setCursor({ y, m: (m || 1) - 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const first = new Date(cursor.y, cursor.m, 1);
  const lead = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();

  // 🔴 이전/다음 달 버튼은 **숨기지 않고 흐리게** 둔다(시안 opacity .35).
  const prevLast = ymd(cursor.y, cursor.m === 0 ? 11 : cursor.m - 1, 1).slice(0, 7);
  const canPrev = !min || prevLast >= min.slice(0, 7);
  const nextFirst = cursor.m === 11 ? `${cursor.y + 1}-01` : `${cursor.y}-${pad(cursor.m + 2)}`;
  const canNext = !max || nextFirst <= max.slice(0, 7);

  function shift(dir: 1 | -1) {
    setCursor((c) => {
      const m = c.m + dir;
      if (m < 0) return { y: c.y - 1, m: 11 };
      if (m > 11) return { y: c.y + 1, m: 0 };
      return { y: c.y, m };
    });
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className={`pv2-selectwrap ${wrapClassName}`.trim()} style={wrapStyle} ref={wrapRef}>
      <button
        type="button"
        className={`pv2-select ${className}`.trim()}
        onClick={() => (open ? setOpen(false) : openPop())}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={value ? "pv2-select-value" : "pv2-select-value is-placeholder"}>
          {formatDateLabel(value)}
        </span>
        <span className="pv2-select-arrow" aria-hidden="true">
          ▼
        </span>
      </button>
      {open && (
        <div className="pv2-cal" role="dialog" aria-label={ariaLabel || "날짜 선택"}>
          <div className="pv2-cal-head">
            <button
              type="button"
              className="pv2-cal-nav"
              onClick={() => shift(-1)}
              disabled={!canPrev}
              aria-label="이전 달"
            >
              ←
            </button>
            <span className="pv2-cal-title" aria-live="polite">
              {cursor.y}. {pad(cursor.m + 1)}
            </span>
            <button
              type="button"
              className="pv2-cal-nav"
              onClick={() => shift(1)}
              disabled={!canNext}
              aria-label="다음 달"
            >
              →
            </button>
          </div>
          <div className="pv2-cal-week">
            {WEEKDAYS.map((w, i) => (
              <span
                key={w}
                className={i === 0 ? "pv2-cal-wd is-sun" : i === 6 ? "pv2-cal-wd is-sat" : "pv2-cal-wd"}
              >
                {w}
              </span>
            ))}
          </div>
          <div className="pv2-cal-grid">
            {cells.map((d, i) => {
              if (d === null) return <span key={`b${i}`} className="pv2-cal-day is-blank" />;
              const ds = ymd(cursor.y, cursor.m, d);
              const out = (min && ds < min) || (max && ds > max);
              const sel = ds === value;
              return (
                <button
                  key={ds}
                  type="button"
                  className={`pv2-cal-day${sel ? " is-sel" : ""}${out ? " is-out" : ""}`}
                  disabled={!!out}
                  aria-pressed={sel}
                  onClick={() => {
                    onChange(ds);
                    setOpen(false);
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
