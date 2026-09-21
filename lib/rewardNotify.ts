// 기업고객 리워드 — 적립 안내 문자 **미리보기**의 유일한 정의처 (2차, 2026-09-21 · 서버 전용)
//
// 🚨 **이 파일은 문자를 보내지 않는다.** 문구·수신번호만 만들어 돌려주고, 실제 발송은
//    담당자가 `components/SmsConfirmModal.tsx` 에서 **[발송]을 눌러야** 일어난다
//    (`/api/admin/send-sms`). 다른 문자 여섯 종과 **같은 자세**다.
//
//    ⚠️ **처음에는 서버에서 바로 보내는 구조였고 사용자가 뒤집었다**(2026-09-21 —
//       *"merge하면 문자가 확인절차 없이 자동으로 바로 나가나?"* → 「확인창을 붙인다」).
//       그때 이 시스템에서 **사람 확인 없이 나가는 유일한 문자**가 될 뻔했다.
//    🔴 **`sendSmsWithLog` 를 이 파일에 다시 들이지 말 것** — 들이는 순간 확인창이
//       무의미해진다(창은 뜨는데 문자는 이미 나간 뒤가 된다).
//
// 🔴 **부르는 곳은 `lib/rewardAccrue.ts` 한 곳이다.** 적립이 나는 경로가 셋이라
//    (건별 입금확인 · 월정산 묶음 · 수동) 화면이나 라우트에서 부르면 한쪽만 뜬다
//    (원칙 53번 — 38차 웹 푸시·PR #154 자동 담기와 같은 자리).
//
// 🔴 **한 번의 적립에 창 하나다.** 월정산 묶음은 13건이 한꺼번에 적립되는데 건별로
//    만들면 담당자가 **확인창을 13번** 눌러야 한다. 금액은 합쳐서 한 줄로 적는다.
//
// 🔴 **소급 적립(backfill)에서는 만들지 않는다** — 한 번에 최대 100건이라 창이
//    100번 뜬다. 호출부가 안 넘기면 조용히 안 만드는 것이 **기본값**이다.
//
// 🔴 **던지지 않는다.** 미리보기를 못 만들어도 적립과 입금확인은 이미 끝난 일이다.

import { rewardEarnedMessage } from "./sms/templates";
import { resolveSmsSender, contactPhoneForBody } from "./smsSenderPhone";
import type { SmsPreview } from "@/components/SmsConfirmModal";

export type RewardNotifyInput = {
  admin: any;
  campaignId: string;
  companyId: string;
  /** 이번 적립의 합계(양수) */
  amount: number;
  /** `sms_logs.related_id` 로 남을 원장 줄 하나 — 🔴 이력에서 되짚는 열쇠다 */
  ledgerId: string;
};

/**
 * 🔴 **`sms_notification_enabled` 가 켜진 화주에게만** 만든다. 그 칸이 1차에서
 *    「저장만 되고 아무도 안 읽는」 상태였던 것을 여기서 처음 읽는다.
 *    ⚠️ 꺼져 있으면 `null` 이고, 그러면 **확인창 자체가 안 뜬다**(건너뛸 것도 없다).
 *
 * 🔴 **받는 번호는 `companies.contact_mobile`(담당자 휴대폰)이다** — `phone`(대표번호)은
 *    유선일 수 있어 문자가 조용히 실패한다. 배차확정 고객 문자가 같은 칸을 쓴다.
 *    ⚠️ 번호가 비어도 **미리보기는 만든다** — 확인창이 수신번호 칸을 비워 띄우므로
 *    담당자가 그 자리에서 채워 보낼 수 있다. 🔴 여기서 `return null` 로 막지 말 것.
 *
 * 🔴 **잔액은 만들기 직전에 다시 센다** — 적립 결과만으로 더하면 그 사이의 수동 조정이
 *    빠져서 문자와 포털 화면이 다른 숫자를 말한다(잔액은 표시 시점 계산이다).
 *
 * 🔴 **발신번호·안내번호는 담당자 것이다**(`resolveSmsSender`) — 다른 문자 여섯 종과
 *    같다. 화주가 회신하면 그 건을 처리한 담당자에게 바로 닿아야 한다.
 *    ⚠️ 자동 발송이던 때는 대표 발신번호였다 — 확인창을 붙이면서 바뀐 것이다.
 */
export async function buildRewardSmsPreview(
  input: RewardNotifyInput
): Promise<SmsPreview | null> {
  try {
    const { admin, campaignId, companyId, amount, ledgerId } = input;
    if (!(amount > 0)) return null;

    const { data: memberships, error: mErr } = await admin
      .from("reward_memberships")
      .select("sms_notification_enabled")
      .eq("company_id", companyId)
      .eq("campaign_id", campaignId)
      .limit(1);
    // 🔴 조회에 실패하면 **안 만든다** — 못 띄운 창은 나중에 띄울 수 있지만,
    //    꺼 둔 화주에게 보낸 문자는 되돌릴 수 없다.
    if (mErr || !(memberships || [])[0]?.sms_notification_enabled) return null;

    const { data: company, error: cErr } = await admin
      .from("companies")
      .select("contact_mobile")
      .eq("id", companyId)
      .maybeSingle();
    if (cErr) return null;

    const { data: ledger, error: lErr } = await admin
      .from("reward_ledger")
      .select("amount")
      .eq("company_id", companyId)
      .eq("campaign_id", campaignId);
    if (lErr) return null;
    const balance = (ledger || []).reduce(
      (sum: number, r: any) => sum + Math.round(r.amount || 0),
      0
    );

    // 🔴 **발신번호 조회가 실패해도 미리보기를 버리지 않는다.** 이 함수 전체가
    //    try/catch 안이라, 여기서 던지면 **창이 통째로 안 뜨고** 담당자는 문자가
    //    나갈 차례였다는 것조차 모른다(조용한 실패). 안내번호만 대표번호로 떨어뜨린다.
    //    ⚠️ 실제로 시험 하네스에서 이 자리가 먼저 터져 미리보기가 0개가 됐다.
    let sender: Awaited<ReturnType<typeof resolveSmsSender>> | null = null;
    try {
      sender = await resolveSmsSender();
    } catch {
      sender = null;
    }

    return {
      relatedType: "reward",
      relatedId: ledgerId,
      templateType: "reward_earned",
      recipientType: "customer",
      recipientPhone: company?.contact_mobile || null,
      message: rewardEarnedMessage({
        amount,
        balance,
        // 🔴 안내번호가 없으면 문구가 스스로 대표번호로 떨어진다(`contact()`)
        contactPhone: sender ? contactPhoneForBody(sender) : null,
        staffName: sender?.staffName ?? null,
      }),
      senderDisplay: sender?.display ?? null,
      senderStaffName: sender?.staffName ?? null,
      senderIsStaffPhone: sender?.isStaffPhone ?? false,
    };
  } catch {
    // 🔴 적립·입금확인은 이미 끝난 일이다 — 미리보기 때문에 그것을 되돌리지 않는다.
    return null;
  }
}
