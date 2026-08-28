"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// 포털 v2 팝오버 공통 동작 — 26차
//
// 🔴 **열림은 화면 전체에서 한 번에 하나다.** 드롭다운과 달력이 한 화면에 십수 개라,
//    각자 상태를 들고 있으면 여러 개가 동시에 펼쳐져 서로를 덮는다. 모듈 수준 구독으로
//    "내가 열리면 나머지는 닫는다"를 강제한다 — 호출부가 화면 곳곳에 흩어져 있어서
//    Provider 를 두지 않았다.
// 🔴 **드롭다운과 달력이 같은 레지스트리를 써야 한다** — 따로 두면 달력을 여는 순간
//    드롭다운이 열린 채로 남아 겹친다.

type Listener = (openId: string | null) => void;
const listeners = new Set<Listener>();

export function usePv2Popover(uid: string) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  function openPop() {
    listeners.forEach((fn) => fn(uid));
    setOpen(true);
  }

  return { open, setOpen, openPop, wrapRef };
}
