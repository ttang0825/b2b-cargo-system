"use client";

import { useEffect, type RefObject } from "react";

/**
 * 가로 목록을 **우 → 좌**로 천천히 자동 이동시킨다(모바일 차량 형태).
 *
 * ── 🔴 왜 `scrollLeft` 만으로는 안 되는가 (2026-09-04, 사용자 「덜덜거린다」) ──
 * **브라우저가 `scrollLeft` 를 정수 픽셀로 반올림한다**(실측: 10.25 를 넣으면 10,
 * 10.5 를 넣으면 11 이 되고 카드의 화면 좌표도 정수로만 움직인다). 그래서 한 프레임에
 * 1px 이 안 되는 속도로 밀면 **어떤 프레임은 0px, 어떤 프레임은 1px** 씩 가서
 * 눈에 덜덜거림으로 보인다. 속도를 올려도 정수가 딱 떨어지지 않는 한 그대로다.
 *
 * 🔴 **그래서 위치를 정수부와 소수부로 나눠 싣는다.**
 *    정수부 → `scroller.scrollLeft` (네이티브 스크롤 그대로 — 터치·관성이 공짜다)
 *    소수부 → `track.style.transform` (0~1px, GPU 합성이라 소수까지 그려진다)
 * 🔴 **둘 중 하나만 쓰지 말 것** — transform 만 쓰면 손으로 넘기는 것을 직접 구현해야
 *    하고(64차가 겪은 덜덜거림의 원인), `scrollLeft` 만 쓰면 위 반올림에 걸린다.
 *
 * 🔴 **가로로 넘칠 때만 움직인다** — 데스크탑에서는 같은 요소가 그리드라
 *    `scrollWidth === clientWidth` 이고, 그때는 transform 도 지운다.
 * 🔴 **한 바퀴는 `cycleIndex` 번째 카드까지의 거리다.** 호출부가 목록을 두 벌 이어
 *    붙여 두어서, 그 지점에서 되감으면 같은 그림이 이어져 끊김이 보이지 않는다.
 * 🔴 **사용자가 만지는 동안에는 멈춘다**(손 떼고 2.2초 뒤 재개) — 브라우저 스크롤과
 *    코드가 동시에 움직이면 64차의 덜덜거림이 그대로 재현된다.
 * 🔴 `scroll` 이벤트를 듣지 않는다 — 우리가 쓴 값이 다시 이벤트를 만들어 되먹임이 된다.
 * 🟢 `prefers-reduced-motion: reduce` 면 아무 것도 하지 않는다(손으로는 넘길 수 있다).
 */
export function useAutoMarquee(
  scrollerRef: RefObject<HTMLElement | null>,
  trackRef: RefObject<HTMLElement | null>,
  cycleIndex: number,
  speedPxPerSec = 32
) {
  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let prev = 0;
    let holding = false;
    let holdUntil = 0;
    // 소수까지 코드가 들고 있는 위치. -1 이면 다음 프레임에 실제 값으로 다시 맞춘다.
    let pos = -1;

    const clearShift = () => {
      if (track.style.transform) track.style.transform = "";
    };

    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      const last = prev;
      prev = t;
      if (!last) return;

      if (scroller.scrollWidth <= scroller.clientWidth + 4) {
        clearShift(); // 데스크탑 그리드
        return;
      }
      if (holding || t < holdUntil) {
        pos = -1;
        clearShift();
        return;
      }

      const first = track.children[0] as HTMLElement | undefined;
      const marker = track.children[cycleIndex] as HTMLElement | undefined;
      const cycle = first && marker ? marker.offsetLeft - first.offsetLeft : 0;
      if (cycle <= 0) return;

      if (pos < 0 || Math.abs(scroller.scrollLeft - Math.floor(pos)) > 2) pos = scroller.scrollLeft;
      const dt = Math.min(t - last, 50);
      pos = (pos + (speedPxPerSec * dt) / 1000) % cycle;

      const whole = Math.floor(pos);
      scroller.scrollLeft = whole;
      track.style.transform = `translate3d(${-(pos - whole).toFixed(3)}px,0,0)`;
    };
    raf = requestAnimationFrame(step);

    const pause = () => {
      holding = true;
    };
    const release = () => {
      holding = false;
      holdUntil = performance.now() + 2200;
    };

    scroller.addEventListener("pointerdown", pause, { passive: true });
    scroller.addEventListener("touchstart", pause, { passive: true });
    scroller.addEventListener("wheel", release, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    window.addEventListener("touchend", release, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      clearShift();
      scroller.removeEventListener("pointerdown", pause);
      scroller.removeEventListener("touchstart", pause);
      scroller.removeEventListener("wheel", release);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("touchend", release);
    };
  }, [scrollerRef, trackRef, cycleIndex, speedPxPerSec]);
}
