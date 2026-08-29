"use client";

import Pv2DispatchCalendar from "@/components/pv2/Pv2DispatchCalendar";

/**
 * 🔴 이 라우트는 메뉴에서 빠져 있지만 살아 있어야 한다(53차·54차 확정) —
 *    "안 쓰는 라우트"로 보고 지우지 말 것. 캘린더의 정식 진입 경로는 29차부터
 *    **월별 통계 화면 하단**이고, 그 화면과 이 라우트가 **같은 컴포넌트**를 쓴다.
 *    여기에 캘린더를 다시 그리면 두 곳이 조용히 갈린다.
 */
export default function PortalCalendarPage() {
  return (
    <main className="container">
      <Pv2DispatchCalendar />
    </main>
  );
}
