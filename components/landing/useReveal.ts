"use client";

import { useEffect, type RefObject } from "react";

/**
 * 랜딩 스크롤 진입 리빌 — **관찰자 하나가 랜딩 전체를 본다.**
 *
 * ── 🔴 왜 인라인 스타일이 아니라 클래스인가 (2026-09-07) ──
 * 처음(61차)에는 훅이 요소마다 하나씩 호출되어 **`el.style` 에 직접** opacity·transform·
 * transition 을 썼다. 그 방식은 셋을 못 한다.
 *   ① **CSS 토큰을 못 입힌다** — 인라인이 스타일시트를 이겨서 `--mo-*` 가 안 먹는다
 *   ② **stagger(`--i`)를 못 얹는다** — 지연을 요소마다 JS 로 계산해야 한다
 *   ③ 🔴 **첫 페인트에 내용이 보였다가 JS 가 숨긴다** — 화면이 한 번 깜빡인다
 * 그래서 **마크업이 `.landing-reveal` 을 들고 시작하고**(CSS 가 처음부터 숨긴다)
 * 훅은 보이는 순간 `.is-in` 만 붙인다.
 *
 * 🔴 **관찰자는 하나다 — 요소마다 만들지 말 것.** 리빌 대상이 늘어도 관찰자는 그대로다.
 * 🔴 **한 번 보이면 `unobserve` 한다** — 스크롤을 되돌려도 다시 재생되지 않는다(의도).
 *
 * ── 🔴 JS 실패 대비가 두 겹이다 — 하나만 남기지 말 것 ──
 * 마크업이 숨은 채로 시작하므로 **JS 가 안 돌면 내용이 영영 안 보인다.** 그래서
 *   ① `app/page.tsx` 의 `<noscript>` 가 JS 자체가 꺼진 경우를 막고
 *   ② 아래 `try/catch` 가 **`IntersectionObserver` 가 없거나 던지는 경우**를 막는다
 *      (그때는 전부 즉시 `.is-in` 을 붙여 그냥 보이게 한다)
 *
 * 🟢 `prefers-reduced-motion: reduce` 면 관찰하지 않고 전부 즉시 노출한다.
 *    (`app/landing.css` 맨 끝 블록도 같은 일을 하지만, 둘 다 두는 편이 안전하다)
 */
export const REVEAL_CLASS = "landing-reveal";
const IN_CLASS = "is-in";

export function useRevealAll(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(`.${REVEAL_CLASS}`));
    if (targets.length === 0) return;

    const showAll = () => targets.forEach((t) => t.classList.add(IN_CLASS));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showAll();
      return;
    }

    let obs: IntersectionObserver;
    try {
      obs = new IntersectionObserver(
        (entries, o) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            en.target.classList.add(IN_CLASS);
            o.unobserve(en.target);
          });
        },
        // 🔴 61차가 정한 값이다 — 화면 아래 8% 는 아직 안 친 것으로 본다.
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      targets.forEach((t) => obs.observe(t));
    } catch {
      showAll();
      return;
    }

    return () => obs.disconnect();
  }, [rootRef]);
}
