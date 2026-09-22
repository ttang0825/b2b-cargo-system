// 기업고객 리워드 — 서버 전용 공용부 (A장, 2026-09-20)
//
// 🔴 **이 파일은 서버 라우트에서만 import 한다** — service_role 키를 다룬다.
//    화면(`app/**/page.tsx`)에서 부르지 말 것.
//
// 🔴 **리워드 표 셋은 RLS on + 정책 0개**라 service_role 말고는 닿지 않는다.
//    그래서 관리자 화면도 여기를 거치는 서버 라우트로만 읽고 쓴다(2-2·2-3).
//    🔴 **「관리자가 못 읽으니 정책을 열자」로 되돌아가지 말 것** — 화주포털 계정과
//       직원 계정이 **둘 다 `authenticated`** 라, 정책을 여는 순간 화주가 남의 회사
//       적립금을 읽는다(19·21차).

import { NextResponse } from "next/server";
import { createServiceClient } from "./supabaseServiceClient";
import { getCurrentStaff } from "./getCurrentStaff";

// 🔴 **캠페인 조회는 `lib/rewardCampaign.ts` 로 옮겼다**(3차, 2026-09-21) — 이 파일은
//    `getCurrentStaff()` 를 들이므로, 그것을 import 하는 모듈은 무엇이든 **직원 세션
//    코드를 함께 끌고 간다.** 화주포털 라우트가 `previewRewards`(읽기 전용)를 쓰려면
//    그 고리를 끊어야 했다. 🔴 **여기로 되돌리지 말 것** · 🟢 옛 이름은 아래 재수출로
//    그대로 쓸 수 있다(호출부 변경 0).
export { loadActiveCampaign } from "./rewardCampaign";
export type { RewardCampaign } from "./rewardCampaign";

export function rewardAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createServiceClient(url, serviceKey);
}

/**
 * 모든 리워드 라우트가 맨 앞에서 부른다 — **직원 확인 + service_role 클라이언트**.
 *
 * 🔴 `requireAdmin` 을 주면 `role === "admin"` 까지 본다(원칙 25번 — 화면이 버튼을
 *    감추는 것과 **한 벌**이다. 화면만으로는 콘솔에서 우회된다).
 */
export async function rewardGuard(opts?: { requireAdmin?: boolean }) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  if (opts?.requireAdmin && staff.role !== "admin") {
    return { error: NextResponse.json({ error: "관리자만 할 수 있습니다." }, { status: 403 }) };
  }
  const admin = rewardAdminClient();
  if (!admin) {
    return {
      error: NextResponse.json(
        { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
        { status: 500 }
      ),
    };
  }
  return { staff, admin };
}
