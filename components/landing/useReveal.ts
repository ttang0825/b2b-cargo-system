"use client";

import { useEffect, useRef } from "react";

/** 스크롤 진입 시 1회 리빌. prefers-reduced-motion 이면 아무 것도 하지 않음. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(18px) scale(0.982)";
    el.style.transition =
      "opacity 760ms cubic-bezier(0.22,0.61,0.36,1), transform 760ms cubic-bezier(0.22,0.61,0.36,1)";

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const t = en.target as HTMLElement;
          t.style.opacity = "1";
          t.style.transform = "none";
          obs.unobserve(t);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return ref;
}
