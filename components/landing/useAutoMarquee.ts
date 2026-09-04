"use client";

import { useEffect, type RefObject } from "react";

/**
 * 가로 스크롤 목록을 **우 → 좌**로 천천히 자동 이동시킨다(모바일 차량 형태).
 *
 * 🔴 **목록이 가로로 넘칠 때만 움직인다** — 데스크탑에서는 같은 요소가 그리드라
 *    `scrollWidth === clientWidth` 이고, 그 경우 매 프레임 아무 것도 하지 않는다.
 *    화면 폭이 바뀌면 다음 프레임에 저절로 켜지고 꺼진다(resize 리스너 불필요).
 *
 * 🔴 **`cycleIndex` 번째 자식의 `offsetLeft` 를 한 바퀴로 삼는다.** 호출부가 목록을
 *    두 벌 이어 붙여 두었기 때문에, 그 지점에서 되감으면 **같은 그림이 이어져
 *    끊김이 보이지 않는다.** 사본 없이 0 으로 되돌리면 한 바퀴마다 화면이 튄다.
 *
 * 🔴 **사용자가 만지는 동안에는 멈춘다.** 64차가 겪은 「덜덜거림」이 브라우저 자체
 *    스크롤과 코드가 미는 `scrollLeft` 가 겹쳐서 난 것이라, 여기서는 둘이 절대
 *    동시에 움직이지 않게 했다 — 손을 떼고 2.2초 뒤에 다시 흐른다.
 * 🔴 `scroll` 이벤트를 듣지 않는다 — 우리가 쓴 `scrollLeft` 가 다시 이벤트를 만들어
 *    되먹임이 생긴다.
 *
 * 🟢 `prefers-reduced-motion: reduce` 면 아무 것도 하지 않는다(손으로는 넘길 수 있다).
 */
export function useAutoMarquee(
  ref: RefObject<HTMLElement | null>,
  cycleIndex: number,
  speedPxPerSec = 22
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let prev = 0;
    let holding = false;
    let holdUntil = 0;
    // 🔴 **위치를 코드가 따로 들고 있어야 한다** — 한 프레임에 움직이는 거리가 0.4px
    //    남짓인데 `el.scrollLeft` 를 읽어서 더하면 브라우저가 정수로 반올림해 돌려주는
    //    바람에 **더한 값이 매번 사라져 목록이 1px 에서 멈춘다**(실측으로 잡았다).
    //    그래서 `pos` 에 소수까지 누적하고 쓰기만 한다.
    //    ⚠️ 사용자가 손으로 옮기면 `pos` 와 실제가 크게 벌어지므로 그때만 다시 맞춘다.
    let pos = -1;

    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      const last = prev;
      prev = t;
      if (!last) return;
      // 가로로 넘치지 않으면(= 데스크탑 그리드) 손대지 않는다.
      if (el.scrollWidth <= el.clientWidth + 4) return;
      if (holding || t < holdUntil) {
        pos = -1; // 손을 뗀 자리에서 이어가도록 다음 프레임에 다시 맞춘다
        return;
      }

      const marker = el.children[cycleIndex] as HTMLElement | undefined;
      const cycle = marker ? marker.offsetLeft : 0;
      if (cycle <= 0) return;

      if (pos < 0 || Math.abs(el.scrollLeft - pos) > 2) pos = el.scrollLeft;
      const dt = Math.min(t - last, 50);
      pos = (pos + (speedPxPerSec * dt) / 1000) % cycle;
      el.scrollLeft = pos;
    };
    raf = requestAnimationFrame(step);

    const pause = () => {
      holding = true;
    };
    const release = () => {
      holding = false;
      holdUntil = performance.now() + 2200;
    };

    el.addEventListener("pointerdown", pause, { passive: true });
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("wheel", release, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    window.addEventListener("touchend", release, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("wheel", release);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("touchend", release);
    };
  }, [ref, cycleIndex, speedPxPerSec]);
}
