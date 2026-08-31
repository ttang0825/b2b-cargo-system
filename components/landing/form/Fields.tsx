"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* 공개 폼 3화면(`/quote` · `/apply` · `/customer/login`) 공용 컨트롤 — 31차.
   시안(디자인팀 Next 변환본)의 `components/landing/form/Fields.tsx` 를 옮긴 것이다.

   🔴 **네이티브 `<select>`·`<input type="date">` 를 쓰지 않는다**(원칙 57번). 펼친 목록과
      달력은 브라우저·OS 가 그려서 항목 높이·모서리·hover 색을 CSS 로 바꿀 수 없다.
   🔴 **`components/pv2/` 부품을 가져다 쓰지 않는다** — 저쪽은 `--pv2-*` 변수 33개가
      `.portal-v2` 안에서만 정의돼 색·배경이 통째로 무효가 된다(28차 §7-2).
   🔴 **접근성을 직접 넣었다 — 지우지 말 것.** 네이티브를 버리면 브라우저가 주던 키보드
      조작이 사라진다(`role="listbox"` · `aria-expanded` · ↑↓ · Enter · Esc · Home · End).
   🔴 **열림은 화면 전체에서 하나뿐이다**(`useOpenKey`) — 드롭다운과 달력이 같은 레지스트리를
      써야 한다. 따로 두면 달력을 여는 순간 드롭다운이 열린 채 남아 겹친다(26차와 같은 이유). */

const trigger = (hasValue: boolean, pad: string): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  padding: pad,
  border: "1px solid #EBEAE7",
  borderRadius: 12,
  background: "#FFFFFF",
  fontSize: 15,
  textAlign: "left",
  cursor: "pointer",
  color: hasValue ? "#1A1A1A" : "#888378",
  fontFamily: "inherit",
});

const menu: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  marginTop: 4,
  zIndex: 10,
  maxHeight: 240,
  overflowY: "auto",
  padding: "6px 0",
  background: "#FFFFFF",
  border: "1px solid #EBEAE7",
  borderRadius: 14,
  boxShadow: "0 4px 12px rgba(26,26,26,0.08)",
};

const menuItem = (active: boolean, selected: boolean): CSSProperties => ({
  display: "block",
  width: "100%",
  textAlign: "left",
  border: "none",
  background: active ? "#FAF9F5" : "none",
  padding: "9px 14px",
  fontSize: 14.5,
  fontWeight: selected ? 700 : 400,
  color: "#1A1A1A",
  cursor: "pointer",
  fontFamily: "inherit",
});

/** 폼 라벨. 시안 값 그대로다. */
export const fieldLabel: CSSProperties = { display: "block", fontSize: 14, fontWeight: 600, color: "#6B6759" };

/** 입력창. 시안 값 그대로다. */
// 🔴 **입력창 글자는 16px 이다 — 시안의 15px 을 그대로 쓰지 말 것.**
// iOS Safari 는 16px 미만 입력창에 포커스하면 화면을 자동으로 확대하고, 그러면 뷰포트가
// 페이지보다 좁아져 좌우로 밀리는 것처럼 보인다(26차에 사용자가 「커지고 밀린다」로
// 신고한 것이 이것이다). 전역 `.public-form` 규칙이 16px 을 주지만 **인라인 style 이
// 그 CSS 를 이기므로** 값 자체를 올려둔다.
export const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "15px 16px",
  border: "1px solid #EBEAE7",
  borderRadius: 12,
  background: "#FFFFFF",
  fontFamily: "inherit",
  fontSize: 16,
  color: "#1A1A1A",
};

/** 카드(흰 블록). */
export const cardStyle: CSSProperties = {
  padding: 32,
  background: "#FFFFFF",
  border: "1px solid #EFEEEA",
  borderRadius: 22,
};

export const cardTitleStyle: CSSProperties = { fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em" };

export const optionChipStyle: CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "#F4F3EF",
  fontSize: 12,
  fontWeight: 600,
  color: "#8B8A85",
};

export const searchBtnStyle: CSSProperties = {
  padding: "14px 18px",
  border: "none",
  whiteSpace: "nowrap",
  borderRadius: 12,
  background: "#EBEAE7",
  fontSize: 14,
  fontWeight: 600,
  color: "#4A4945",
  cursor: "pointer",
  fontFamily: "inherit",
};

/** 열려 있는 드롭다운/달력 키를 **하나만** 유지한다. 바깥 클릭·Esc 로 닫힌다. */
export function useOpenKey() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest?.("[data-dd]")) setOpenKey(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenKey(null);
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return { openKey, setOpenKey };
}

export function Dropdown({
  label,
  value,
  placeholder,
  options,
  onPick,
  openKey,
  setOpenKey,
  ddKey,
  pad = "15px 16px",
}: {
  label?: string;
  value?: string;
  placeholder: string;
  options: readonly string[];
  onPick: (v: string) => void;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
  ddKey: string;
  pad?: string;
}) {
  const open = openKey === ddKey;
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const i = value ? options.indexOf(value) : -1;
    setActive(i >= 0 ? i : 0);
  }, [open, value, options]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpenKey(ddKey);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const v = options[active];
      if (v !== undefined) {
        onPick(v);
        setOpenKey(null);
      }
    }
  }

  return (
    <div data-dd={ddKey} style={{ position: "relative" }}>
      {label && <label style={fieldLabel}>{label}</label>}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onKeyDown={onKeyDown}
        onClick={(e) => {
          e.stopPropagation();
          setOpenKey(open ? null : ddKey);
        }}
        style={{ ...trigger(!!value, pad), marginTop: label ? 8 : 0 }}
      >
        <span>{value || placeholder}</span>
        <span aria-hidden style={{ fontSize: 11, lineHeight: 1, color: "#8B8A85" }}>▼</span>
      </button>
      {open && (
        <div role="listbox" ref={listRef} style={menu}>
          {options.map((o, i) => (
            <button
              key={o}
              type="button"
              role="option"
              aria-selected={o === value}
              onMouseEnter={() => setActive(i)}
              onClick={(e) => {
                e.stopPropagation();
                onPick(o);
                setOpenKey(null);
              }}
              style={menuItem(i === active, o === value)}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const dateLabel = (k: string) => {
  const p = k.split("-");
  return `${p[0]}. ${p[1]}. ${p[2]}.`;
};

const WEEKDAYS = [
  { d: "일", c: "#C05B54" },
  { d: "월", c: "#888378" },
  { d: "화", c: "#888378" },
  { d: "수", c: "#888378" },
  { d: "목", c: "#888378" },
  { d: "금", c: "#888378" },
  { d: "토", c: "#4C6FBF" },
];

/** 오늘(또는 `minKey`) 이전은 고를 수 없는 달력.
 *  🔴 하한을 빼지 말 것 — 과거 날짜로 접수되면 담당자가 되물어야 한다(원칙 6번). */
export function DatePicker({
  value,
  onPick,
  minKey,
  openKey,
  setOpenKey,
  ddKey,
  quick,
}: {
  value?: string;
  onPick: (v: string) => void;
  minKey?: string | null;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
  ddKey: string;
  quick?: ReactNode;
}) {
  const [monthOff, setMonthOff] = useState(0);
  const open = openKey === ddKey;

  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + monthOff, 1);
  const y = base.getFullYear();
  const m = base.getMonth();
  const todayK = dateKey(now);
  const floor = minKey && minKey > todayK ? minKey : todayK;
  const firstDay = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();

  return (
    <div data-dd={ddKey} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpenKey(open ? null : ddKey);
        }}
        style={trigger(!!value, "14px 15px")}
      >
        <span>{value ? dateLabel(value) : "날짜 선택"}</span>
        <span aria-hidden style={{ fontSize: 11, lineHeight: 1, color: "#8B8A85" }}>▼</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            zIndex: 11,
            width: 252,
            padding: 12,
            background: "#FFFFFF",
            border: "1px solid #EBEAE7",
            borderRadius: 14,
            boxShadow: "0 4px 12px rgba(26,26,26,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <button
              type="button"
              aria-label="이전 달"
              onClick={(e) => {
                e.stopPropagation();
                setMonthOff((v) => v - 1);
              }}
              style={{ border: "none", borderRadius: 8, background: "#F4F3EF", padding: "4px 9px", fontSize: 13.5, cursor: "pointer", opacity: monthOff <= 0 ? 0.35 : 1, fontFamily: "inherit" }}
            >
              ←
            </button>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>
              {y}. {pad2(m + 1)}
            </span>
            <button
              type="button"
              aria-label="다음 달"
              onClick={(e) => {
                e.stopPropagation();
                setMonthOff((v) => v + 1);
              }}
              style={{ border: "none", borderRadius: 8, background: "#F4F3EF", padding: "4px 9px", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}
            >
              →
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginTop: 8 }}>
            {WEEKDAYS.map((w) => (
              <span key={w.d} style={{ textAlign: "center", padding: "3px 0", fontSize: 12, fontWeight: 600, color: w.c }}>
                {w.d}
              </span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginTop: 2 }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const d = i + 1;
              const k = `${y}-${pad2(m + 1)}-${pad2(d)}`;
              const disabled = k < floor;
              const selected = k === value;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPick(k);
                    setOpenKey(null);
                  }}
                  style={{
                    height: 28,
                    border: "none",
                    padding: 0,
                    borderRadius: "50%",
                    fontSize: 13.5,
                    cursor: disabled ? "default" : "pointer",
                    color: disabled ? "#EBEAE7" : "#1A1A1A",
                    background: selected ? "#FFD833" : "transparent",
                    fontWeight: selected ? 800 : 500,
                    fontFamily: "inherit",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {quick}
    </div>
  );
}

/** 06:00 ~ 22:00, 30분 간격.
 *  🔴 **`HH:mm` 이다** — 시안은 「오전 06:00」이지만 이 저장소의 관리자 화면·문자가 전부
 *     24시간 표기라 여기만 바꾸면 같은 건이 화면마다 다르게 보인다(26차 확정). */
export function timeSlots() {
  const out: string[] = [];
  for (let m = 6 * 60; m <= 22 * 60; m += 30) out.push(`${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`);
  return out;
}

/** 날짜(YYYY-MM-DD) + 시각(HH:mm) → `DateTimePicker` 와 같은 로컬 입력 문자열.
 *  🔴 저장할 때는 반드시 `localInputToISOString()` 을 거칠 것(원칙 41번). */
export function joinDateTime(dateK?: string, timeLabel?: string) {
  if (!dateK) return "";
  return `${dateK}T${timeLabel || "00:00"}`;
}

export function quickDateButtons(onPick: (k: string) => void, extra?: string) {
  const jump = (n: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const d = new Date();
    d.setDate(d.getDate() + n);
    onPick(dateKey(d));
  };
  const chip: CSSProperties = {
    border: "none",
    padding: "5px 12px",
    borderRadius: 999,
    background: "#F4F3EF",
    fontSize: 13,
    fontWeight: 600,
    color: "#4A4945",
    cursor: "pointer",
    fontFamily: "inherit",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
      <button type="button" onClick={jump(0)} style={chip}>오늘</button>
      <button type="button" onClick={jump(1)} style={chip}>내일</button>
      {extra && <span style={{ fontSize: 13, color: "#9C9B95" }}>{extra}</span>}
    </div>
  );
}
