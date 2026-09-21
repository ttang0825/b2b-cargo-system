// 기업고객 리워드 — 캠페인 한 행을 읽는다 (3차에 분리, 2026-09-21)
//
// 🔴 **이 파일의 의존성은 0 이다 — 그것이 분리한 이유 전부다.**
//    그전에는 `loadActiveCampaign` 이 `lib/rewardServer.ts` 안에 있었는데 그 파일은
//    `getCurrentStaff()`(직원 쿠키 세션)와 `NextResponse` 를 들인다. 그래서
//    `lib/rewardAccrue.ts` 가 그것을 import 하는 순간, 거기 있는 **읽기 전용 함수
//    (`previewRewards`)를 화주포털 라우트가 쓰려 하면 직원용 인증 코드가 그 경로에
//    통째로 딸려 들어왔다**(원칙 1번과 같은 결 — 화주 경로에 직원 세션을 들이지 않는다).
//
// 🔴 **여기에 `NextResponse`·`getCurrentStaff`·supabase 클라이언트 생성을 들이지 말 것.**
//    받은 `admin` 으로 **읽기만** 한다. 들이면 위 문제가 그대로 돌아오고,
//    `lib/rewardCalc.ts` 머리말이 적은 `next build` 의 *"Failed to collect page data"*
//    도 같은 자리에서 다시 난다(PR #151 · PR #179).
//
// 🟢 옛 이름은 그대로 쓸 수 있다 — `lib/rewardServer.ts` 가 이 둘을 재수출한다.

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

/**
 * 지금 살아 있는 캠페인 한 행.
 *
 * 🔴 **요율·기간을 코드에 적지 말 것** — 여기가 유일한 출처다.
 * 🔴 **`error` 를 삼키지 말 것**(원칙 55번) — 조회 실패를 「캠페인 없음」으로 두면
 *    적립이 조용히 0건이 되고 아무도 원인을 모른다.
 */
export async function loadActiveCampaign(
  admin: any
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
