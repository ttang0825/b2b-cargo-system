"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePv2Popover } from "./pv2Popover";

// 화주 운송관리 포털 전용 드롭다운 — 26차
//
// 🔴 **네이티브 `<select>` 를 대신한다. 되돌리지 말 것.**
// 시안에는 `<select>` 가 **하나도 없다**(소스 실측). 네이티브 select 의 목록은 OS 가
// 그리는 것이라 항목 높이·모서리·hover 색을 CSS 로 바꿀 수 없다 — 그래서 트리거만
// 시안 모양으로 맞추고 목록은 옛 모양으로 남아 있었고, 그것이 지적 5·6·7번이다.
//
// 🔴 **열림은 한 번에 하나다** — 달력과 같은 레지스트리를 쓴다(`pv2Popover.ts`).
//
// 🔴 **접근성은 우리가 직접 넣어야 한다** — 네이티브를 버리면 브라우저가 주던
//    키보드 조작·역할이 통째로 사라진다. `role="listbox"`/`aria-expanded`/
//    ↑↓·Enter·Esc·Home·End 를 여기서 구현한다. 지우지 말 것.

export type Pv2SelectOption = { value: string; label: string; disabled?: boolean };

export default function Pv2Select({
  value,
  onChange,
  options,
  placeholder = "선택",
  className = "",
  wrapClassName = "",
  wrapStyle,
  ariaLabel,
  id,
  disabled = false,
  /** 시간 목록처럼 긴 목록 — 340px 에서 잘리고 얇은 스크롤바가 붙는다 */
  scroll = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Pv2SelectOption[];
  placeholder?: string;
  className?: string;
  /** 🔴 폭·flex 같은 **바깥 레이아웃**은 래퍼에 준다 — 트리거에 주면 팝오버가 어긋난다 */
  wrapClassName?: string;
  wrapStyle?: React.CSSProperties;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  scroll?: boolean;
}) {
  const uid = useId();
  const { open, setOpen, openPop, wrapRef } = usePv2Popover(uid);
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const label = selectedIndex >= 0 ? options[selectedIndex].label : placeholder;
  const isPlaceholder = selectedIndex < 0 || !options[selectedIndex].value;

  // 열릴 때 선택된 항목을 활성으로 두고 보이는 자리로 스크롤한다
  useEffect(() => {
    if (!open) return;
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    const t = window.setTimeout(() => {
      const el = listRef.current?.querySelector<HTMLElement>('[data-active="1"]');
      el?.scrollIntoView({ block: "nearest" });
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openList() {
    if (disabled) return;
    openPop();
  }

  function choose(i: number) {
    const opt = options[i];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  }

  function step(dir: 1 | -1) {
    const n = options.length;
    if (!n) return;
    let i = active;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!options[i].disabled) break;
    }
    setActive(i);
    window.setTimeout(() => {
      listRef.current?.querySelector<HTMLElement>('[data-active="1"]')?.scrollIntoView({ block: "nearest" });
    }, 0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (open) {
        e.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      step(e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      if (!open) return;
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : options.length - 1);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) openList();
      else choose(active);
    }
  }

  return (
    <div className={`pv2-selectwrap ${wrapClassName}`.trim()} style={wrapStyle} ref={wrapRef}>
      <button
        type="button"
        id={id}
        className={`pv2-select ${className}`.trim()}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={isPlaceholder ? "pv2-select-value is-placeholder" : "pv2-select-value"}>
          {label}
        </span>
        {/* 🔴 화살표는 SVG 가 아니라 글자다(시안 소스). 아이콘으로 바꾸지 말 것 */}
        <span className="pv2-select-arrow" aria-hidden="true">
          ▼
        </span>
      </button>
      {open && (
        <div
          className={scroll ? "pv2-pop pv2-pop-scroll" : "pv2-pop"}
          role="listbox"
          aria-label={ariaLabel}
          ref={listRef}
        >
          {options.map((o, i) => (
            <button
              key={`${o.value}-${i}`}
              type="button"
              role="option"
              aria-selected={o.value === value}
              data-active={i === active ? "1" : undefined}
              className={
                i === active ? "pv2-pop-item is-active" : "pv2-pop-item"
              }
              disabled={o.disabled}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
