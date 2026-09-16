"use client";

// ─────────────────────────────────────────────────────────────────────────────
// 화주포털 **페이지 내 업데이트 표시** — 「이번에 들어오기 직전까지 본 시각」 (2026-09-16)
//
// 🔴 **사용자 지시다** — *「화주포털에서 알림배너와 별개로 업데이트된 견적상황이나
//    배차상황은 페이지내 알림표시가 있어야 한다」*. 배너는 같은 날 저녁에 크게
//    좁혔으므로(`lib/portalAlert.ts`) **무엇이 바뀌었는지는 목록이 말해야 한다.**
//    🔴 그래서 이 표시는 **넓다** — `updated_at` 이 바뀌었으면 전부 표시한다.
//    배너와 같은 상태 목록으로 좁히지 말 것(그러면 「별개로」가 성립하지 않는다).
//
// 🔴 **왜 훅이 필요한가 — 셸이 「마지막으로 본 시각」을 덮어쓰기 때문이다.**
//    `CustomerPortalShell` 은 그 화면에 들어온 순간 `markSeen(key)` 로 값을 **지금**으로
//    민다(배지를 0으로 만들기 위해서다). 목록이 그 뒤에 `getLastSeen()` 을 읽으면
//    **언제나 「바뀐 것 없음」**이 된다. 그래서 **밀리기 전 값을 붙잡아 둔다.**
//
// 🟢 **순서는 React 가 보장한다** — 자식(페이지)의 effect 가 부모(셸)의 effect 보다
//    먼저 돈다. 게다가 셸은 `markSeen` 전에 세션·계정을 `await` 하므로 두 겹으로 안전하다.
//    🔴 **`useState` 초기화 함수로 읽지 말 것** — 그 코드는 서버 렌더에서도 돌아
//    `null` 을 잡고, 하이드레이션에서 값이 달라진다.
//
// 🔴 **첫 방문에는 아무것도 표시하지 않는다** — 저장된 값이 없으면 전부 「업데이트」가
//    되어 처음 로그인한 화주의 목록이 통째로 표시된다. 배너의 「첫 조회에는 울리지
//    않는다」(`lib/alertCore.ts` 규칙 ①)와 같은 결이다.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { getLastSeen } from "@/lib/portalNotifications";

/**
 * 그 화면에 들어오기 **직전**의 「마지막으로 본 시각」. 없으면 `null`(= 표시 안 함).
 * @param key `getLastSeen` 과 같은 키 — `"quotes"` · `"dispatches"`
 */
export function usePortalSeenAt(key: string): string | null {
  const [seenAt, setSeenAt] = useState<string | null>(null);
  useEffect(() => {
    setSeenAt(getLastSeen(key));
    // 🔴 한 번만 잡는다 — 화면에 머무는 동안 값을 다시 읽으면 셸이 민 「지금」을
    //    읽게 되어 표시가 조용히 사라진다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return seenAt;
}

/**
 * 그때 이후에 바뀐 것인가.
 *
 * 🔴 **문자열로 비교하지 말 것.** Postgres 는 `…+00:00`(마이크로초까지), `toISOString()`
 *    은 `…Z`(밀리초까지)라 **형식이 다르다.** 형식이 다르면 사전순은 못 믿는다 —
 *    실측: `"2026-09-16T12:00:00.500+00:00" > "2026-09-16T12:00:00Z"` 가 **false** 다
 *    (`.` 가 `Z` 보다 작다). 실제로는 500ms 뒤인데 「안 바뀌었다」가 된다.
 *
 * ⚠️ **밀리초 아래는 `Date.parse` 가 버린다** — 같은 밀리초 안의 차이는 표시되지 않는다.
 *    셸이 미는 기준값과 같은 밀리초에 바뀐 건 하나뿐인데, 그 건은 **화주 본인이 방금
 *    일으킨 것**이라 실무에서 문제가 되지 않는다. 🔴 이것을 고치겠다고 문자열 비교로
 *    되돌리지 말 것(위 함정이 훨씬 자주 걸린다).
 */
export function isUpdatedSince(
  updatedAt: string | null | undefined,
  seenAt: string | null
): boolean {
  if (!updatedAt || !seenAt) return false;
  const a = Date.parse(updatedAt);
  const b = Date.parse(seenAt);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return a > b;
}
