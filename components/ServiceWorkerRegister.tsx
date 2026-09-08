"use client";

import { useEffect } from "react";

/**
 * 설치형 앱(PWA)의 서비스워커를 등록한다. 화면에는 아무것도 그리지 않는다.
 *
 * 🔴 **`scriptUrl` 의 위치가 곧 그 서비스워커가 맡는 구역이다.** `/customer/sw.js` 는
 *    `/customer/` 아래만, `/admin/sw.js` 는 `/admin/` 아래만 맡는다. 루트(`/sw.js`)로
 *    옮기면 **한 서비스워커가 두 앱과 랜딩까지 전부 삼킨다** — 옮기지 말 것.
 *    (`scope` 옵션으로 스크립트 위치보다 넓은 구역을 잡을 수는 없다.)
 *
 * 🔴 **등록 실패를 조용히 넘긴다.** 서비스워커는 부가 기능이라, 브라우저가 지원하지
 *    않거나(사파리 사생활 보호 모드 등) 등록이 막혀도 화면은 그대로 동작해야 한다.
 */
export default function ServiceWorkerRegister({ scriptUrl }: { scriptUrl: string }) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // 등록은 첫 화면 그리기와 경쟁시키지 않는다.
    const id = window.setTimeout(() => {
      navigator.serviceWorker.register(scriptUrl).catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [scriptUrl]);

  return null;
}
