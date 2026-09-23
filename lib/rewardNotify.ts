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

import {
  rewardEarnedMessage,
  rewardDeductedMessage,
  rewardStatusMessage,
  rewardIntroMessage,
} from "./sms/templates";
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
  /**
   * 아직 입금이 확인되지 않은 건의 **예상 적립** — 3차(2026-09-21).
   *
   * 🔴 **여기서 세지 않고 받아 온다.** `previewRewards` 는 `lib/rewardAccrue.ts` 에
   *    있고 그 파일이 이 파일을 import 하므로, 여기서 가져오면 **순환 import** 가 된다.
   *    부르는 쪽(`accrueReward`)이 캠페인을 이미 들고 있으니 거기서 세는 것이 맞다.
   * 🔴 **못 셌으면 `null` 이고 그러면 문구에 줄이 안 붙는다** — 0 으로 때우지 말 것.
   */
  pendingAmount?: number | null;
  pendingCount?: number | null;
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
      // 🚨 `portal_visible` 도 읽는다(2026-09-21) — 꺼진 화주에게 「운송관리에서
      //    확인하실 수 있습니다」를 보내면 **없는 화면을 찾아가라는 말**이 된다.
      .select("sms_notification_enabled,portal_visible")
      .eq("company_id", companyId)
      .eq("campaign_id", campaignId)
      .limit(1);
    // 🔴 조회에 실패하면 **안 만든다** — 못 띄운 창은 나중에 띄울 수 있지만,
    //    꺼 둔 화주에게 보낸 문자는 되돌릴 수 없다.
    if (mErr || !(memberships || [])[0]?.sms_notification_enabled) return null;
    const portalVisible = (memberships || [])[0]?.portal_visible === true;

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
        // 🔴 **잔액에 더하지 않는다** — 문구가 두 줄로 나눠 적는다(입금이 확인돼야
        //    적립되므로 「예정」과 「적립됨」은 다른 돈이다).
        pendingAmount: input.pendingAmount ?? null,
        pendingCount: input.pendingCount ?? null,
        portalVisible,
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

// ── 차감(적립금 사용) 안내 — 3차, 2026-09-21 ────────────────────────────────
//
// 사용자 요청 — *"적립금을 차감했을때도 문자가 발송되어야 한다. 얼마 차감됐고,
// 어떻게 사용됐고 얼마 남았는지..."*
//
// 🔴 **적립과 같은 자세다 — 여기서 보내지 않는다.** 담당자가 수동 조정을 저장하면
//    확인창이 뜨고 [발송]을 눌러야 나간다.
// 🔴 **차감(음수)일 때만 만든다** — 양수 조정은 적립을 늘리는 것이라 이 문구가
//    거짓이 된다(「차감되었습니다」).
// 🚨 **「어떻게 사용됐는지」는 `customer_note` 다 — `description` 을 쓰지 말 것.**
//    그 칸은 담당자의 내부 메모이고 2차에 화주 비공개로 못박았다.
//
// 🔴 **부르는 곳은 `/api/admin/reward/adjust` 하나다.** 지금 차감이 나는 경로가
//    그것뿐이라 적립처럼 정의처를 따로 두지 않았다 — ⚠️ **경로가 늘면 그때는
//    `accrueReward` 처럼 한 곳으로 모을 것**(원칙 53번).

export type RewardDeductNotifyInput = {
  admin: any;
  campaignId: string;
  companyId: string;
  /** 차감액 — 부호는 상관없다(문구가 절대값을 쓴다) */
  amount: number;
  /** `sms_logs.related_id` 로 남을 원장 줄 */
  ledgerId: string;
  /** 🔴 화주에게 보이는 한 줄 — 없으면 문구에서 그 줄이 빠진다 */
  customerNote?: string | null;
};

export async function buildRewardDeductedSmsPreview(
  input: RewardDeductNotifyInput
): Promise<SmsPreview | null> {
  try {
    const { admin, campaignId, companyId, amount, ledgerId } = input;
    // 🔴 **차감이 아니면 안 만든다**(0원 조정도 마찬가지다)
    if (!(amount < 0)) return null;

    const { data: memberships, error: mErr } = await admin
      .from("reward_memberships")
      // 🚨 `portal_visible` 도 읽는다 — 위 적립 미리보기와 같은 이유다.
      .select("sms_notification_enabled,portal_visible")
      .eq("company_id", companyId)
      .eq("campaign_id", campaignId)
      .limit(1);
    // 🔴 꺼 둔 화주에게 보낸 문자는 되돌릴 수 없다 — 조회 실패도 「안 만듦」이다.
    if (mErr || !(memberships || [])[0]?.sms_notification_enabled) return null;
    const portalVisible = (memberships || [])[0]?.portal_visible === true;

    const { data: company, error: cErr } = await admin
      .from("companies")
      .select("contact_mobile")
      .eq("id", companyId)
      .maybeSingle();
    if (cErr) return null;

    // 🔴 **잔액은 지금 다시 센다** — 방금 넣은 차감 줄까지 포함된 값이라야
    //    문자의 「남은 적립금」과 포털 화면이 같은 숫자를 말한다.
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

    // 🔴 적립 미리보기와 **같은 이유**로 발신번호 실패를 따로 잡는다 — 여기서
    //    던지면 창이 통째로 안 뜨고 담당자는 문자 차례였다는 것조차 모른다.
    let sender: Awaited<ReturnType<typeof resolveSmsSender>> | null = null;
    try {
      sender = await resolveSmsSender();
    } catch {
      sender = null;
    }

    return {
      relatedType: "reward",
      relatedId: ledgerId,
      templateType: "reward_deducted",
      recipientType: "customer",
      recipientPhone: company?.contact_mobile || null,
      message: rewardDeductedMessage({
        amount,
        balance,
        note: input.customerNote ?? null,
        portalVisible,
        contactPhone: sender ? contactPhoneForBody(sender) : null,
        staffName: sender?.staffName ?? null,
      }),
      senderDisplay: sender?.display ?? null,
      senderStaffName: sender?.staffName ?? null,
      senderIsStaffPhone: sender?.isStaffPhone ?? false,
    };
  } catch {
    // 🔴 조정은 이미 저장됐다 — 미리보기 때문에 그것을 되돌리지 않는다.
    return null;
  }
}

// ── 적립 «현황» 안내 — 3차 후속, 2026-09-21 ─────────────────────────────────
//
// 🚨 **사용자 확정이 채널의 주종을 뒤집었다** — *"기본적으로 화주포털에는 리워드
//    상황을 노출안하는 경우가 많을 것 같다. … 그래서 문자로 현 리워드 상황을
//    알려주는게 중요하다. 월정산건도 한건의 운송이 완료되면 예상 적립금을 알려주고
//    얼마가 쌓이고 있는지 확인이 문자메세지로 필요한거다."*
//
//    🔴 그래서 이 문자는 **포털이 꺼져 있어도 나간다.** 오히려 꺼진 화주에게
//       **더 중요하다**(그 화주는 이 문자 말고는 볼 길이 없다).
//       🔴 **`portal_visible` 로 막지 말 것.** 막는 것은 `sms_notification_enabled` 뿐이다.
//
// 🔴 **`reward_earned`(쌓였다)와 다른 종류다** — 이것은 **아직 안 쌓인 예상**이다.
//    한 종류로 묶으면 이력에서 둘을 구분할 수 없다.
//
// 🔴 **두 자리에서 쓴다**(원칙 53번 — 정의처는 이 함수 하나):
//      ① 수동    화주 상세 리워드 패널의 「적립 안내 문자」
//      ② 운송완료 배차가 `운송완료` 로 바뀔 때 확인창(`thisInvoiceId` 를 준다)
//
// 🚨 **그 둘을 따로 끌 수 있다**(2026-09-22 · 사용자 *"운송완료 확인창만 따로 끄는
//    스위치 만들어줘"*). `reward_memberships.sms_on_delivery_enabled` 가 **②만**
//    막는다 — ①(수동 버튼)은 그 칸을 보지 않는다. 담당자가 끈 뒤에도 원할 때는
//    같은 문자를 보낼 수 있어야 하기 때문이다.
//    🔴 **그래서 `trigger` 가 필수 인자다** — 선택 인자로 두면 새 호출부가 그것을
//       빠뜨렸을 때 **조용히 「수동」으로 떨어져** 꺼 둔 확인창이 되살아난다
//       (PR #180 의 `collectionMethod` 와 같은 자리).
//
// 🔴 **여기서 보내지 않는다** — 담당자가 [발송]을 눌러야 나간다(다른 리워드 문자와 같다).

export type RewardStatusNotifyInput = {
  admin: any;
  /**
   * 🔴 **누가 이 문자를 띄우는가** — `delivery` 일 때만 `sms_on_delivery_enabled`
   *    를 본다. 🔴 **화면이 정하지 않는다** — 서버(`/api/admin/reward/notify`)가
   *    `dispatch_id` 가 왔는지로 판정한다(원칙 53번 · 화면 값을 믿지 않는다).
   */
  trigger: "manual" | "delivery";
  campaign: { id: string; start_date: string; earn_end_date: string; earn_rate: number };
  companyId: string;
  /**
   * 🔴 **운송완료 안내일 때만** 준다 — 그 한 건의 예상 적립을 첫 줄에 적는다.
   *    수동 버튼에서는 주지 않는다(「이번 운송」이 없다).
   */
  thisInvoiceId?: string | null;
  /** `sms_logs.related_id` — 🔴 원장 줄이 없으므로 **화주 id** 를 쓴다(아래 참고) */
  relatedId: string;
};

export async function buildRewardStatusSmsPreview(
  input: RewardStatusNotifyInput
): Promise<SmsPreview | null> {
  try {
    const { admin, campaign, companyId, thisInvoiceId } = input;

    const { data: memberships, error: mErr } = await admin
      .from("reward_memberships")
      .select("enabled,sms_notification_enabled,sms_on_delivery_enabled,portal_visible")
      .eq("company_id", companyId)
      .eq("campaign_id", campaign.id)
      .limit(1);
    if (mErr) return null;
    const m = (memberships || [])[0];
    // 🔴 **참여하지 않는 화주에게는 만들지 않는다** — `enabled` 가 꺼진 것은
    //    「신규 적립 중단」이라 「앞으로 쌓입니다」가 거짓이 된다.
    //    ⚠️ 적립 안내(`reward_earned`)는 `enabled` 를 안 보는데, 그쪽은 **이미
    //       쌓인 것**을 알리는 문자라 중단 뒤에도 사실이기 때문이다.
    if (!m || m.enabled !== true || m.sms_notification_enabled !== true) return null;

    // 🚨 **운송완료 확인창만 끄는 자식 스위치**(2026-09-22) — 부모
    //    (`sms_notification_enabled`)가 켜져 있어도 이 칸이 꺼져 있으면 **운송완료
    //    자리에서는 창을 만들지 않는다.** 적립(`reward_earned`)·차감
    //    (`reward_deducted`)은 그대로 나가고, 화주 상세의 **수동 버튼도 그대로**다.
    // 🔴 **`trigger` 를 안 보고 무조건 막지 말 것** — 그러면 수동 버튼까지 죽어
    //    담당자가 끈 화주에게는 영영 이 문자를 보낼 수 없게 된다.
    // 🔴 **`!== false` 로 쓰지 말 것** — 칸이 없는(마이그레이션 전) DB 에서는
    //    `undefined` 가 와서 「꺼짐」으로 읽혀야 하는 게 아니라, 애초에 DB 가
    //    먼저라 그 상황이 오면 위 `select` 가 실패해 여기까지 오지 않는다.
    if (input.trigger === "delivery" && m.sms_on_delivery_enabled !== true) return null;

    const portalVisible = m.portal_visible === true;

    const { data: company, error: cErr } = await admin
      .from("companies")
      .select("contact_mobile")
      .eq("id", companyId)
      .maybeSingle();
    if (cErr) return null;

    // 🔴 **잔액은 표시 시점 계산이다**(원장 합계) — 저장 컬럼을 만들지 말 것.
    const { data: ledger, error: lErr } = await admin
      .from("reward_ledger")
      .select("amount")
      .eq("company_id", companyId)
      .eq("campaign_id", campaign.id);
    if (lErr) return null;
    const balance = (ledger || []).reduce(
      (sum: number, r: any) => sum + Math.round(r.amount || 0),
      0
    );

    // 🔴 **판정·금액은 실제 적립과 같은 `previewRewards`(→ `evaluateReward`) 다** —
    //    갈라 적으면 문자가 약속한 예상액과 실제로 쌓이는 금액이 어긋난다.
    //    ⚠️ 순환 import 를 피하려고 **함수 안에서** 늦게 가져온다
    //       (`lib/rewardAccrue.ts` 가 이 파일을 맨 위에서 import 한다).
    const { previewRewards } = await import("./rewardAccrue");

    let pendingAmount: number | null = null;
    let pendingCount: number | null = null;
    try {
      const pre = await previewRewards({ admin, campaign: campaign as any, companyId });
      if (!pre.error) {
        const eligible = pre.rows.filter((r) => !r.reason);
        pendingAmount = eligible.reduce((sum, r) => sum + r.amount, 0);
        pendingCount = eligible.length;
      }
    } catch {
      /* 곁다리다 — 현재 적립금만이라도 알린다 */
    }

    // 이번 운송 한 건 — 🔴 **입금 여부와 무관하게** 그 건만 계산한다
    //    (`previewRewards` 는 `invoiceId` 를 주면 거르지 않는다).
    let thisAmount: number | null = null;
    if (thisInvoiceId) {
      try {
        const one = await previewRewards({ admin, campaign: campaign as any, invoiceId: thisInvoiceId });
        if (!one.error) {
          const row = (one.rows || [])[0];
          // 🔴 대상이 아니면(`reason`) **0 이 아니라 `null`** 이다 — 「0원 적립될
          //    예정」이라는 줄이 나가면 안 된다.
          thisAmount = row && !row.reason ? row.amount : null;
        }
      } catch {
        /* 곁다리다 */
      }
    }

    // 🔴 **아무 숫자도 못 낸 경우엔 만들지 않는다** — 「현재 적립금 0원」만 적힌
    //    문자는 받는 사람에게 아무 뜻이 없다(그 화주는 아직 아무 일도 없다).
    if (!thisAmount && !pendingAmount && balance === 0) return null;

    // 🔴 발신번호 실패를 따로 잡는다 — 여기서 던지면 **창이 통째로 안 뜨고**
    //    담당자는 문자 차례였다는 것조차 모른다(2차에 실제로 겪었다).
    let sender: Awaited<ReturnType<typeof resolveSmsSender>> | null = null;
    try {
      sender = await resolveSmsSender();
    } catch {
      sender = null;
    }

    return {
      relatedType: "reward",
      // 🔴 원장에 새 줄이 생기지 않는 문자다(예상은 기록하지 않는다) — 그래서
      //    열쇠가 **화주 id** 다. ⚠️ `sms_logs.related_id` 에는 FK 가 없다(다형 참조).
      relatedId: input.relatedId,
      templateType: "reward_status",
      recipientType: "customer",
      recipientPhone: company?.contact_mobile || null,
      message: rewardStatusMessage({
        thisAmount,
        pendingAmount,
        pendingCount,
        balance,
        portalVisible,
        contactPhone: sender ? contactPhoneForBody(sender) : null,
        staffName: sender?.staffName ?? null,
      }),
      senderDisplay: sender?.display ?? null,
      senderStaffName: sender?.staffName ?? null,
      senderIsStaffPhone: sender?.isStaffPhone ?? false,
    };
  } catch {
    return null;
  }
}

// ── 「리워드 이용 안내」 (2026-09-22 · 사용자 요청) ─────────────────────────────
//
// 사용자 원문: *"포인트 지급 안내 메세지를 보내고 싶다. 고객 첫거래후 전화로 계정등록을
//   유도할 생각이다. 계정등록후 계정정보 안내 문자를 보낸후 이벤트 포인트 사용안내
//   문자도 보내고 싶다. 위치는 화주 상세 기업고객 리워드에 문자보내기 기능이 있으면
//   되고 간단한 내용으로 전달하면 될것 같다."*
//
// 🔴 **`buildRewardStatusSmsPreview` 와 합치지 말 것.** 저쪽은 **금액**을 알리고
//    (그래서 알릴 숫자가 하나도 없으면 안 만든다), 이것은 **제도**를 알린다 —
//    계정 발급 직후라 보통 아직 쌓인 것이 0 인데, 그 조건으로 막으면 **정작 보내야
//    할 때 안 나간다.** 두 문자의 「안 만드는 조건」이 정반대다.
//
// 🔴 **관문이 둘뿐이다** — 참여(`enabled`)와 문자 안내(`sms_notification_enabled`).
//    🔴 `sms_on_delivery_enabled` 는 **보지 않는다**(그 칸은 운송완료 자리 전용이고,
//       이 문자는 담당자가 손으로 누르는 자리다 · 2026-09-22 확정과 같은 자세).
//    🔴 잔액·예상은 **아예 세지 않는다**(위 주석 — 금액을 적지 않는 문자다).

export type RewardIntroNotifyInput = {
  admin: any;
  campaign: {
    id: string;
    earn_rate: number;
    minimum_use_amount: number;
    use_end_date: string;
  };
  companyId: string;
  /** `sms_logs.related_id` — 원장에 줄이 생기지 않으므로 화주 id 다 */
  relatedId: string;
};

export async function buildRewardIntroSmsPreview(
  input: RewardIntroNotifyInput
): Promise<SmsPreview | null> {
  try {
    const { admin, campaign, companyId } = input;

    const { data: memberships, error: mErr } = await admin
      .from("reward_memberships")
      .select("enabled,sms_notification_enabled,portal_visible")
      .eq("company_id", companyId)
      .eq("campaign_id", campaign.id)
      .limit(1);
    if (mErr) return null;
    const m = (memberships || [])[0];
    // 🚨 **멤버십이 없으면 만들지 않는다** — 리워드는 **선택된 기업만** 참여하는
    //    프로모션이다(표시광고법 제3조 · HANDOFF §5-3). 참여하지 않는 화주에게
    //    제도를 소개하면 **신청하면 되는 것으로 읽힌다.**
    // 🔴 `enabled` 가 꺼진 것은 「신규 적립 중단」이라, 「이만큼 쌓입니다」를 새로
    //    안내하는 이 문자는 그때도 만들지 않는다.
    if (!m || m.enabled !== true || m.sms_notification_enabled !== true) return null;

    const { data: company, error: cErr } = await admin
      .from("companies")
      .select("name,contact_mobile")
      .eq("id", companyId)
      .maybeSingle();
    if (cErr) return null;

    // 🔴 발신번호 실패를 따로 잡는다(2차에 실제로 겪었다 — 던지면 창이 통째로 안 뜬다)
    let sender: Awaited<ReturnType<typeof resolveSmsSender>> | null = null;
    try {
      sender = await resolveSmsSender();
    } catch {
      sender = null;
    }

    return {
      relatedType: "reward",
      relatedId: input.relatedId,
      templateType: "reward_intro",
      recipientType: "customer",
      recipientPhone: company?.contact_mobile || null,
      message: rewardIntroMessage({
        companyName: company?.name ?? null,
        // 🔴 **캠페인에서 읽는다 — 리터럴을 적지 말 것**(원칙 40번과 같은 결)
        // 🚨 **`earn_rate` 는 분수다**(`numeric(6,4)` · CHECK `> 0 and <= 1` ·
        //    실제 값 `0.0500`). 그대로 넘기면 문자에 **「0.05%」**가 찍힌다.
        //    화면 둘도 `* 100` 해서 그린다(`/admin/reward` · `CompanyRewardPanel`).
        //    🔴 **이 곱을 빼지 말 것.**
        earnRatePercent: Number(campaign.earn_rate) * 100,
        minimumUseAmount: campaign.minimum_use_amount,
        useEndDate: campaign.use_end_date,
        portalVisible: m.portal_visible === true,
        // 🔴 **문의 줄은 담당자 번호·이름이다**(사용자 확정 2026-09-23) — 같은 파일의
        //    다른 세 미리보기와 같다. 🔴 대표번호로 고정하지 말 것.
        contactPhone: sender ? contactPhoneForBody(sender) : null,
        staffName: sender?.staffName ?? null,
      }),
      senderDisplay: sender?.display ?? null,
      senderStaffName: sender?.staffName ?? null,
      senderIsStaffPhone: sender?.isStaffPhone ?? false,
    };
  } catch {
    return null;
  }
}
