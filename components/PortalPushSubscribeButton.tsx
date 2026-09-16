"use client";

import PushSubscribeButton from "@/components/PushSubscribeButton";
import { supabaseCustomer } from "@/lib/supabaseCustomerClient";

/**
 * 화주포털 「이 기기로 알림 받기」 (화주포털 B장).
 *
 * 🔴 **절차는 `components/PushSubscribeButton.tsx` 한 곳이다** — 여기에는 포털 쪽
 *    값과 **인증 방식**만 있다.
 *
 * 🔴 **관리자와 세션 방식이 다르다** — 포털은 `localStorage` 세션이라 서버가 쿠키로
 *    사람을 알아볼 수 없다. 그래서 매 요청에 `Authorization: Bearer` 를 싣는다
 *    (`/api/customer/approve-quote`·`order-request` 가 쓰는 그 방식 그대로다).
 *    🔴 **토큰을 컴포넌트 밖에 보관하지 말 것** — 만료된 값을 보내게 된다.
 */
export default function PortalPushSubscribeButton() {
  return (
    <PushSubscribeButton
      // 🔴 끝 슬래시 없음(PR #127)
      scope="/customer"
      apiPath="/api/customer/push-subscription"
      hint="브라우저를 닫아도 견적·배차·정산 알림을 받습니다"
      authHeaders={async () => {
        const {
          data: { session },
        } = await supabaseCustomer.auth.getSession();
        if (!session) return null;
        return { Authorization: `Bearer ${session.access_token}` };
      }}
    />
  );
}
