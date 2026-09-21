// 기업고객 리워드 — 적립 안내 문자의 **유일한 정의처** (2차, 2026-09-21 · 서버 전용)
//
// 🔴 **부르는 곳은 `lib/rewardAccrue.ts` 한 곳이다.** 적립이 나는 경로가 셋이라
//    (건별 입금확인 · 월정산 묶음 · 수동) 화면이나 라우트에서 부르면 한쪽만 나간다
//    (원칙 53번 — 38차 웹 푸시·PR #154 자동 담기와 같은 자리).
//
// 🔴 **한 번의 적립에 한 통이다.** 월정산 묶음은 13건이 한꺼번에 적립되는데 건별로
//    보내면 **문자가 13통** 나간다. 금액은 합쳐서 한 줄로 적는다.
//
// 🔴 **소급 적립(backfill)에서는 부르지 않는다** — 그 버튼은 한 번에 최대 100건을
//    적립하므로, 켜 두면 담당자가 버튼 한 번에 **몇 달 치 문자를 한꺼번에** 보낸다.
//    호출부가 `notify` 를 넘기지 않으면 조용히 안 보내는 것이 **기본값**이다.
//
// 🔴 **던지지 않는다.** 문자가 실패해도 적립과 입금확인은 이미 끝난 일이다.
//    (`sendSmsWithLog` 자체도 안 던지지만, 그 앞의 조회가 던질 수 있다.)

import { sendSmsWithLog } from "./sendSms";
import { rewardEarnedMessage } from "./sms/templates";

export type RewardNotifyInput = {
  admin: any;
  campaignId: string;
  companyId: string;
  /** 이번 적립의 합계(양수) */
  amount: number;
  /** `sms_logs.related_id` 로 남길 원장 줄 하나 — 🔴 이력에서 되짚는 열쇠다 */
  ledgerId: string;
};

/**
 * 🔴 **`sms_notification_enabled` 가 켜진 화주에게만** 보낸다. 그 칸이 1차에서
 *    「저장만 되고 아무도 안 읽는」 상태였던 것을 여기서 처음 읽는다.
 *
 * 🔴 **받는 번호는 `companies.contact_mobile`(담당자 휴대폰)이다** — `phone`(대표번호)은
 *    유선일 수 있어 문자가 조용히 실패한다. 배차확정 고객 문자가 같은 칸을 쓴다.
 *    ⚠️ 번호가 비면 `sendSmsWithLog` 가 `status: "skipped"` 로 이력을 남긴다 —
 *    🔴 그 앞에서 `return` 해서 **이력조차 안 남게 만들지 말 것**(담당자가 왜 안 갔는지
 *    알 길이 그 줄뿐이다).
 *
 * 🔴 **잔액은 보내기 직전에 다시 센다** — 적립 결과만으로 더하면 그 사이의 수동 조정이
 *    빠져서 문자와 포털 화면이 다른 숫자를 말한다(잔액은 표시 시점 계산이다).
 */
export async function notifyRewardEarned(input: RewardNotifyInput): Promise<void> {
  try {
    const { admin, campaignId, companyId, amount, ledgerId } = input;
    if (!(amount > 0)) return;

    const { data: memberships, error: mErr } = await admin
      .from("reward_memberships")
      .select("sms_notification_enabled")
      .eq("company_id", companyId)
      .eq("campaign_id", campaignId)
      .limit(1);
    // 🔴 조회에 실패하면 **안 보낸다** — 안 보낸 것은 나중에 보낼 수 있지만,
    //    꺼 둔 화주에게 보낸 문자는 되돌릴 수 없다.
    if (mErr || !(memberships || [])[0]?.sms_notification_enabled) return;

    const { data: company, error: cErr } = await admin
      .from("companies")
      .select("contact_mobile")
      .eq("id", companyId)
      .maybeSingle();
    if (cErr) return;

    const { data: ledger, error: lErr } = await admin
      .from("reward_ledger")
      .select("amount")
      .eq("company_id", companyId)
      .eq("campaign_id", campaignId);
    if (lErr) return;
    const balance = (ledger || []).reduce(
      (sum: number, r: any) => sum + Math.round(r.amount || 0),
      0
    );

    await sendSmsWithLog({
      relatedType: "reward",
      relatedId: ledgerId,
      templateType: "reward_earned",
      recipientType: "customer",
      recipientPhone: company?.contact_mobile || null,
      message: rewardEarnedMessage({ amount, balance }),
      // 🔴 **발신번호를 넘기지 않는다** — 담당자 세션이 없는 자동 발송이라 대표
      //    발신번호로 나간다. 🔴 클라이언트가 보낸 번호를 넘기지 말 것(35차).
      // 🔴 `sentBy` 도 비운다 — 수동 재발송이 아니라 자동 발송이다.
    });
  } catch {
    // 🔴 적립·입금확인은 이미 끝난 일이다 — 문자 때문에 그것을 되돌리지 않는다.
  }
}
