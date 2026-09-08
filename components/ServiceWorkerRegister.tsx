"use client";

import { useEffect } from "react";

/**
 * 설치형 앱(PWA)의 서비스워커를 등록한다. 화면에는 아무것도 그리지 않는다.
 *
 * 🔴 **`scriptUrl` 의 위치가 그 서비스워커가 맡을 수 있는 최대 구역을 정한다.**
 *    `/customer/sw.js` 는 `/customer/` 아래까지가 기본이고, 루트(`/sw.js`)로 옮기면
 *    **한 서비스워커가 두 앱과 랜딩까지 전부 삼킨다** — 옮기지 말 것.
 *
 * 🔴 **`scope` 를 슬래시 없이(`/admin`) 주는 것이 핵심이다.** 이 저장소의 홈 주소는
 *    `/admin`·`/customer` 이고 **Next 가 `/admin/` 을 `/admin` 으로 308 리다이렉트한다.**
 *    구역을 `/admin/` 로 두면 정작 **홈 화면이 구역 밖으로 빠져** 서비스워커가 그 화면을
 *    맡지 못하고(오프라인 안내가 안 뜬다), 설치형 앱 창에는 주소 띠가 남는다.
 *    스크립트 위치보다 넓은 구역이라 **서버가 `Service-Worker-Allowed` 헤더로 허락해야
 *    한다** — `next.config.mjs` 의 `headers()` 가 그 역할을 한다. 🔴 **둘은 한 벌이다.**
 *
 * 🔴 **등록 실패를 조용히 넘긴다.** 서비스워커는 부가 기능이라, 브라우저가 지원하지
 *    않거나(사파리 사생활 보호 모드 등) 등록이 막혀도 화면은 그대로 동작해야 한다.
 */
export default function ServiceWorkerRegister({
  scriptUrl,
  scope,
}: {
  scriptUrl: string;
  scope: string;
}) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // 등록은 첫 화면 그리기와 경쟁시키지 않는다.
    const id = window.setTimeout(() => {
      navigator.serviceWorker
        .register(scriptUrl, { scope })
        .then(async () => {
          // 예전에 `/admin/` 처럼 좁은 구역으로 등록됐던 서비스워커를 정리한다.
          // 안 지우면 두 등록이 같이 남아 어느 쪽이 화면을 맡는지 헷갈린다.
          // 🔴 내 세그먼트 안의 것만 건드린다 — 다른 앱의 등록을 지우면 안 된다.
          try {
            const mine = new URL(scope, window.location.origin).href;
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
              regs
                .filter((r) => r.scope !== mine && r.scope.startsWith(mine))
                .map((r) => r.unregister().catch(() => undefined))
            );
          } catch {
            // 정리는 부가 작업이라 실패해도 넘어간다
          }
        })
        .catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [scriptUrl, scope]);

  return null;
}
