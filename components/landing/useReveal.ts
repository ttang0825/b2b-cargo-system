"use client";

import { useEffect, type RefObject } from "react";

/**
 * 랜딩 스크롤 진입 리빌 — **관찰자 둘이 랜딩 전체를 본다.**
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
 * 🔴 **요소마다 관찰자를 만들지 말 것** — 리빌 대상이 늘어도 관찰자는 둘 그대로다.
 *
 * ── 🔴 재생 규칙은 「멀리 벗어났다 돌아오면 다시」다 (C안, 사용자 확정 2026-09-07) ──
 * 지시서 원칙 2번은 「한 번만 재생」이었고 초안은 첫 등장 뒤 `unobserve` 했는데,
 * 사용자가 *"처음만 적용되는 것인가?"* 로 물어와 **C안으로 확정**했다.
 *   A 한 번만        되돌려도 조용하지만 두 번째부터 화면이 죽어 보인다
 *   B 완전 반복      🔴 **채택 안 함** — 살짝만 되돌려도 34개가 동시에 다시 튀고,
 *                    **읽던 글자가 눈앞에서 사라진다**
 *   C 멀리 벗어나면  ← 지금 이것. 리셋이 **화면 밖 한 화면 거리에서** 일어나므로
 *                    사라지는 장면을 사람이 볼 수 없다
 *
 * 🔴 **그래서 관찰자가 둘이고 둘 다 필요하다 — 하나로 합치지 말 것.**
 *   `enterObs`  좁은 상자(화면 아래 8% 제외)에 들어오면 `.is-in` 을 **붙인다**
 *   `farObs`    **위아래로 한 화면(100%) 넓힌 상자**에서 벗어나면 `.is-in` 을 **뗀다**
 * 두 조건은 절대 동시에 참이 될 수 없다(좁은 상자 안이면 넓힌 상자 안이기도 하다).
 * 🔴 **`farObs` 의 `rootMargin` 을 줄이지 말 것** — 값이 작아질수록 리셋 지점이
 *    화면에 가까워지고, 0 에 가까워지면 그대로 B안(글자가 눈앞에서 사라짐)이 된다.
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

    let enterObs: IntersectionObserver;
    let farObs: IntersectionObserver;
    try {
      enterObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) en.target.classList.add(IN_CLASS);
          });
        },
        // 🔴 61차가 정한 값이다 — 화면 아래 8% 는 아직 안 친 것으로 본다.
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );

      farObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            // 넓힌 상자 **밖**으로 나갔을 때만 되돌린다 — 화면에서 한 화면 이상 떨어진 자리다.
            if (!en.isIntersecting) en.target.classList.remove(IN_CLASS);
          });
        },
        { threshold: 0, rootMargin: "100% 0px 100% 0px" }
      );

      targets.forEach((t) => {
        enterObs.observe(t);
        farObs.observe(t);
      });
    } catch {
      showAll();
      return;
    }

    return () => {
      enterObs.disconnect();
      farObs.disconnect();
    };
  }, [rootRef]);
}
