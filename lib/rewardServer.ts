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

export type RewardCampaign = {
  id: string;
  name: string;
  start_date: string;
  earn_end_date: string;
  use_end_date: string;
  earn_rate: number;
  minimum_use_amount: number;
  active: boolean;
};

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

/**
 * 지금 살아 있는 캠페인 한 행.
 *
 * 🔴 **요율·기간을 코드에 적지 말 것** — 여기가 유일한 출처다.
 * 🔴 **`error` 를 삼키지 말 것**(원칙 55번) — 조회 실패를 「캠페인 없음」으로 두면
 *    적립이 조용히 0건이 되고 아무도 원인을 모른다.
 */
export async function loadActiveCampaign(
  admin: NonNullable<ReturnType<typeof rewardAdminClient>>
): Promise<{ campaign: RewardCampaign | null; error: string | null }> {
  const { data, error } = await admin
    .from("reward_campaigns")
    .select("id,name,start_date,earn_end_date,use_end_date,earn_rate,minimum_use_amount,active")
    .eq("active", true)
    .order("start_date", { ascending: false })
    .limit(1);
  if (error) return { campaign: null, error: error.message };
  const row = (data || [])[0] as RewardCampaign | undefined;
  return { campaign: row ? { ...row, earn_rate: Number(row.earn_rate) } : null, error: null };
}
