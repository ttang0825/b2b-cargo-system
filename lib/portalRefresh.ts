"use client";

// ─────────────────────────────────────────────────────────────────────────────
// 화주포털 「지금 화면을 다시 받아온다」 — 신호의 유일 정의처 (2026-09-17)
//
// 사용자 신고: *「배차취소를 하고 화주포털에 알림이 와서 들어갔는데 … 바로 상태가
// 바뀌어 있지 않다」*
//
// 🔴 **화주포털에는 되풀이 폴링이 없다**(38차가 새 타이머를 0개로 유지했다). 화면이
//    스스로 갱신되는 길은 **Realtime 하나뿐**이고, 그 길은 두 경우에 조용히 끊긴다 —
//
//    ① **탭이 뒤로 갔다가 돌아왔을 때.** 모바일 브라우저는 백그라운드 탭의 웹소켓을
//       끊고, 다시 붙어도 **그 사이에 놓친 이벤트를 다시 보내주지 않는다.**
//       화면은 들어올 때 받은 값을 계속 보여준다.
//    ② **알림을 눌렀는데 이미 그 화면이 열려 있을 때.** 서비스워커가 `client.navigate()`
//       로 옮기는데 주소가 같으면 **아무 일도 일어나지 않는다**(PR #162 가 배너에서
//       겪은 그 자리다). 리액트가 다시 마운트되지 않으니 조회도 다시 돌지 않는다.
//
// 🔴 **Realtime 을 대체하는 것이 아니다** — 그 길이 살아 있으면 이 신호는 한 번 더
//    받아오는 것뿐이다(조회 한 번은 싸다). 🔴 **되풀이 타이머를 만들지 말 것.**
//
// 🔴 **화면마다 따로 적지 말 것** — 한 화면만 고치면 「배차는 새로 뜨는데 정산은 옛
//    값인」 상태가 된다.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";

/** 🔴 셸이 서비스워커 쪽지를 받으면 이 이름으로 창에 알린다 — 문자열을 화면에 적지 말 것. */
export const PORTAL_REFRESH_EVENT = "wecarry-portal-refresh";

/** 셸 전용. 🔴 서버 렌더에서 부르지 말 것(`window` 가 없다). */
export function emitPortalRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PORTAL_REFRESH_EVENT));
}

/**
 * 화면이 다시 보이거나 알림을 눌러 들어왔을 때 `reload()` 를 한 번 부른다.
 *
 * 🔴 **ref 로 최신 함수를 잡는다** — 의존성 배열에 `reload` 를 넣으면 화면이 그릴
 *    때마다 리스너가 붙었다 떨어지고, 안 넣으면 **첫 렌더의 옛 함수**를 계속 부른다.
 */
export function usePortalRefresh(reload: () => void) {
  const ref = useRef(reload);
  ref.current = reload;

  useEffect(() => {
    function run() {
      ref.current();
    }
    function onVisible() {
      // 🔴 숨겨질 때는 부르지 않는다 — 안 보이는 화면을 받아올 이유가 없다.
      if (document.visibilityState === "visible") run();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(PORTAL_REFRESH_EVENT, run);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(PORTAL_REFRESH_EVENT, run);
    };
  }, []);
}
