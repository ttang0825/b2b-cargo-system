"use client";

import { useEffect, useState } from "react";

/**
 * 페이지가 최상단에서 벗어났는지 여부를 알려주는 훅.
 *
 * 스티키 헤더가 "스크롤 중일 때만" 아래쪽 그림자를 갖도록 하는 데 쓴다
 * (최상단에서는 그림자가 없어야 본문과 헤더 경계가 과하지 않음).
 *
 * 공개 화면 헤더가 두 종류(`LandingHeader`, `PublicPageHeader`)라 같은 리스너를
 * 두 번 적지 않으려고 훅으로 분리함 — 새 헤더가 생겨도 이걸 그대로 쓸 것.
 *
 * @param threshold 이 값을 넘으면 true (기본 0 — 조금이라도 내리면 바로 반응)
 */
export function useScrolled(threshold = 0): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > threshold);
    }
    // 새로고침으로 중간 위치에서 시작하는 경우가 있어 최초 1회도 확인
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
