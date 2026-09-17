"use client";

import { supabase } from "@/lib/supabaseClient";

// ─────────────────────────────────────────────────────────────────────────────
// 직원 id → 이름 — 화면 전체가 같이 쓰는 캐시 (2026-09-17 분리)
//
// ⚠️ **새로 만든 것이 아니라 `components/ProcessedByFooter.tsx` 안에 있던 것을 그대로
//    꺼낸 것이다** — 수정 이력 패널이 같은 조회를 해야 하는데, 컴포넌트 안에 있으면
//    캐시가 둘이 되어 **같은 화면에서 `staff_accounts` 를 두 번 읽는다.**
//
// 🔴 **모듈 수준 캐시다 — 화면을 옮겨도 다시 읽지 않는다.** 직원 이름이 바뀌는 일은
//    드물고, 바뀌어도 새로고침하면 따라온다.
// 🔴 **조회 실패를 삼키지 않는다** — 빈 map 을 돌려주되 **캐시에 남기지 않아서**
//    다음 호출이 다시 시도한다(빈 map 을 캐시하면 그 세션 내내 「알 수 없음」이다).
// ─────────────────────────────────────────────────────────────────────────────

let staffNameCache: Record<string, string> | null = null;
let staffNameCachePromise: Promise<Record<string, string>> | null = null;

export async function loadStaffNames(): Promise<Record<string, string>> {
  if (staffNameCache) return staffNameCache;
  if (!staffNameCachePromise) {
    staffNameCachePromise = (async () => {
      const { data, error } = await supabase.from("staff_accounts").select("id,name");
      const map: Record<string, string> = {};
      (data || []).forEach((s: any) => {
        map[s.id] = s.name;
      });
      // 🔴 실패했으면 캐시하지 않는다 — 다음 호출이 다시 시도해야 한다.
      if (error) {
        staffNameCachePromise = null;
        return map;
      }
      staffNameCache = map;
      return map;
    })();
  }
  return staffNameCachePromise;
}
