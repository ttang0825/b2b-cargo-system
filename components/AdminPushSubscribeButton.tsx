"use client";

import PushSubscribeButton from "@/components/PushSubscribeButton";

/**
 * 내부관리 「이 기기로 알림 받기」 (38차 B장).
 *
 * 🔴 **절차는 `components/PushSubscribeButton.tsx` 한 곳이다** — 화주포털 B장이
 *    같은 것을 쓰게 되면서 뽑아냈다(2026-09-16). 여기에는 **관리자 쪽 값만** 있다.
 *    🔴 **되돌려 여기에 절차를 다시 적지 말 것**(두 벌이 되면 한쪽만 고쳐진다).
 *
 * 🔴 **인증을 넘기지 않는다** — 관리자는 **쿠키 세션**이라 `fetch` 가 알아서 실어
 *    보낸다. 여기에 `Authorization` 을 더하지 말 것.
 */
export default function AdminPushSubscribeButton() {
  return (
    <PushSubscribeButton
      // 🔴 끝 슬래시 없음(PR #127)
      scope="/admin"
      apiPath="/api/admin/push-subscription"
      hint="브라우저를 닫아도 새 접수 알림을 받습니다"
    />
  );
}
