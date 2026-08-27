"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// 화주 운송관리 포털 전용 드롭다운 — 26차
//
// 🔴 **네이티브 `<select>` 를 대신한다. 되돌리지 말 것.**
// 시안에는 `<select>` 가 **하나도 없다**(소스 실측). 네이티브 select 의 목록은 OS 가
// 그리는 것이라 항목 높이·모서리·hover 색을 CSS 로 바꿀 수 없다 — 그래서 트리거만
// 시안 모양으로 맞추고 목록은 옛 모양으로 남아 있었고, 그것이 지적 5·6·7번이다.
//
// 🔴 **열림은 한 번에 하나다.** 한 화면에 드롭다운이 십수 개라, 각자 상태를 들고 있으면
//    여러 개가 동시에 펼쳐져 서로를 덮는다. 모듈 수준 구독으로 "내가 열리면 나머지는
//    닫는다"를 강제한다(Provider 를 두지 않은 것은 호출부가 화면 곳곳에 흩어져 있어서다).
//
// 🔴 **접근성은 우리가 직접 넣어야 한다** — 네이티브를 버리면 브라우저가 주던
//    키보드 조작·역할이 통째로 사라진다. `role="listbox"`/`aria-expanded`/
//    ↑↓·Enter·Esc·Home·End 를 여기서 구현한다. 지우지 말 것.

type Listener = (openId: string | null) => void;
const listeners = new Set<Listener>();
function broadcastOpen(id: string | null) {
  listeners.forEach((fn) => fn(id));
}

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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const label = selectedIndex >= 0 ? options[selectedIndex].label : placeholder;
  const isPlaceholder = selectedIndex < 0 || !options[selectedIndex].value;

  // 다른 드롭다운이 열리면 나는 닫힌다
  useEffect(() => {
    const fn: Listener = (openId) => {
      if (openId !== uid) setOpen(false);
    };
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, [uid]);

  // 🔴 화면을 옮기면 전부 닫는다 — 포털은 클라이언트 전환이라 컴포넌트가 살아남을 수 있다
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 바깥 클릭 (원칙 20번과 같은 방식)
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

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
    broadcastOpen(uid);
    setOpen(true);
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
