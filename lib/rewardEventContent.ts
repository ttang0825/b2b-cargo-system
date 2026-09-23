// 「적립 이벤트 안내」 공개 페이지의 **본문 유일 정의처** (2026-09-22)
//
// 사용자가 이벤트 페이지 초안(HTML)을 주며 *"이 페이지 참고해서 페이지 문구를 고치고
// 저장소안에 안내 페이지를 새로 만들자"* 고 했다. 🔴 **초안을 그대로 옮기지 않았다** —
// 아래 「고친 다섯 곳」이 그 이유이고, 전부 **코드를 읽어 실제 동작과 대조한 결과**다.
//
// ══ 🚨 초안에서 고친 다섯 곳 — 되돌리지 말 것 ════════════════════════════════
//
//  ①  「별도 신청 절차 없이 이용 시 자동 적립됩니다」  → **삭제**
//      리워드는 `reward_memberships` 를 담당자가 켠 **선택된 고객사만** 참여한다.
//      누구나 자동 적립으로 읽히면 **표시광고법 제3조**(거짓·과장 광고)에 걸린다.
//      🔴 HANDOFF §5-3 이 「적립·캐시백은 조건·기간을 함께 알려야 한다」로 못박은 자리다.
//      🔴 **이 페이지가 존재하게 된 이유가 바로 이 한 줄이다** — 초안 문구 그대로는
//         링크를 보낼 수 없어서 문자에서 링크를 빼 두었다(2026-09-22).
//
//  ②  「이벤트 종료 후 3개월 동안은 50,000원 미만 잔액도 전액 사용 가능합니다」 → **삭제**
//      `lib/rewardUse.ts` 의 관문에 **그런 예외가 없다** — `below_minimum` 은 사용
//      종료일까지 그대로 막는다. 적어 두면 기간 말에 **못 쓰는 약속**이 된다.
//      🔴 되살리려면 **먼저 관문에 예외를 만들 것**(문구만 고치면 거짓이 된다).
//
//  ③  「소멸 예정 적립금은 사전에 안내됩니다」  → **삭제**
//      원장 유형에 **`expiry` 가 없다**(`RewardTransactionType` 4종). 소멸을 잡아
//      알리는 코드가 0곳이라 **자동으로 안내되지 않는다.**
//      🟢 다만 **사용 종료일이 지나면 못 쓴다는 것은 사실이다**(`use_period_over` 관문).
//         그래서 기한은 적고 「미리 알려 준다」만 뺐다.
//
//  ④  「운임 미납·연체 시 적립금 사용이 정지되며, 정산 완료 시 재개됩니다」 → **삭제**
//      그런 관문이 없다. 🚨 **오히려 반대다** — 할인은 `payment_received` 가 꺼진
//      **입금 전 건에만** 걸 수 있다(입금이 끝난 건에는 소급이 안 된다).
//      사실과 반대인 문장이라 그대로 두면 담당자·화주가 둘 다 헷갈린다.
//
//  ⑤  「운송 취소 시 해당 건의 적립은 취소됩니다」  → **문구 교체**
//      트리거는 운송 취소가 아니라 **입금 확인의 해제**다(`reversal` · 원장에
//      반대 부호로 한 줄이 더 들어가고 원본 줄은 남는다).
//
// ══ 🔴 초안에 없어서 더한 셋 ════════════════════════════════════════════════
//
//   · **선착불 건에는 쓸 수 없다**(`direct_collection` 관문) — 화주가 차주에게 직접
//     내는 건은 위캐리가 끊는 청구서가 없다. 빼 두면 기대했다 못 쓰는 일이 생긴다.
//   · **입금 전에만 적용된다**(위 ④) · **담당자가 적용한다**(화주가 누르는 버튼이 없다).
//   · **적립은 10원 단위 내림**(`REWARD_EARN_UNIT`).
//
// ══ 🔴 숫자를 이 파일에 적지 말 것 ══════════════════════════════════════════
//
//   요율 · 기간 · 최소 사용액 · 사용 종료일은 **전부 `reward_campaigns` 의 값**이고
//   담당자가 바꿀 수 있다(원칙 40번과 같은 결). 🚨 **실측이 그 필요를 증명했다** —
//   초안은 기간 시작을 `2026년 9월 1일` 로 적었는데 **DB 는 2026-08-07** 이다
//   (`2026-09-21_reward_campaign_start.sql` 이 옮겼다). 하드코딩하면 그 오류가 굳는다.

import { REWARD_EARN_UNIT } from "@/lib/rewardCalc";

/** 화면이 그릴 수 있게 캠페인에서 뽑아 온 값 — 🔴 이 파일이 DB 를 읽지 않는다 */
export type RewardEventTerms = {
  /** 적립률 **퍼센트**(5 = 5%) — 🔴 `earn_rate`(분수)를 그대로 넘기지 말 것 */
  earnRatePercent: number;
  /** `YYYY-MM-DD` */
  startDate: string;
  earnEndDate: string;
  useEndDate: string;
  minimumUseAmount: number;
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**
 * `2026-08-07` → `2026년 8월 7일(금)`
 *
 * 🔴 **요일을 글로 적어 두지 말 것** — 초안은 `2026년 9월 1일(화)` 라고 적고 있었고,
 *    날짜가 바뀌면 요일만 조용히 틀린 채로 남는다. 날짜에서 계산한다.
 * 🔴 **`new Date("2026-08-07")` 는 UTC 자정으로 해석된다** — KST 로 그리면 하루가
 *    밀릴 수 있어(원칙 41번과 같은 함정) 숫자를 직접 갈라 `Date.UTC` 로 만든다.
 */
export function formatEventDate(ymd: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((ymd || "").slice(0, 10));
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  const w = WEEKDAY[dt.getUTCDay()];
  return `${Number(y)}년 ${Number(mo)}월 ${Number(d)}일(${w})`;
}

function won(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function ratePercentText(rate: number): string {
  return `${Number.isInteger(rate) ? rate : Number(rate.toFixed(2))}%`;
}

export type RewardEventSection = {
  heading: string;
  /** 굵게 한 줄 — 없으면 안 그린다 */
  lead?: string;
  bullets: string[];
  /** 「예시」 박스 — 줄 단위 */
  example?: string[];
};

/** 히어로 — 🔴 요율을 글자로 적지 말 것(숫자만 크게 그린다) */
export const REWARD_EVENT_EYEBROW = "위캐리 적립 이벤트";

export function rewardEventHeroLines(terms: RewardEventTerms) {
  return {
    before: "매 운송 건마다",
    rate: ratePercentText(terms.earnRatePercent),
    after: "적립",
  };
}

/**
 * 🔴 **「선정된 고객사 한정」을 빼지 말 것** — 위 ① 이다. 이 문장이 페이지 맨 위에서
 *    한 번, 「이벤트 기간」 카드에서 한 번 나온다(둘 다 필요하다 — 히어로만 보고
 *    내려가는 사람과 카드만 읽는 사람이 다르다).
 */
export const REWARD_EVENT_SCOPE_NOTE =
  "담당자와 협의해 적용된 고객사에 한해 운영되는 프로모션입니다.";

export function rewardEventSections(terms: RewardEventTerms): RewardEventSection[] {
  const rate = ratePercentText(terms.earnRatePercent);
  const min = terms.minimumUseAmount;
  const start = formatEventDate(terms.startDate);
  const earnEnd = formatEventDate(terms.earnEndDate);
  const useEnd = formatEventDate(terms.useEndDate);

  // 예시 금액 — 🔴 요율에서 **계산**한다. 초안의 `100,000 → 5,000` 을 글자로 적으면
  //    요율이 바뀌는 날 예시만 틀린 채로 남는다.
  const exBase = 100000;
  const exEarn = Math.floor((exBase * terms.earnRatePercent) / 100 / REWARD_EARN_UNIT) * REWARD_EARN_UNIT;
  // 최소 사용액을 모으는 데 필요한 운송 건수(예시용) — 0 으로 나누지 않는다
  const exCount = exEarn > 0 ? Math.ceil(min / exEarn) : 0;

  return [
    {
      heading: "이벤트 기간",
      lead: start && earnEnd ? `${start} ~ ${earnEnd}` : "담당자에게 문의해 주세요.",
      bullets: [
        "기간 내 운임 입금이 확인된 건이 적립 대상입니다.",
        // 🔴 위 ① — 「자동 적립」으로 되돌리지 말 것
        REWARD_EVENT_SCOPE_NOTE,
      ],
    },
    {
      heading: "적립 방법",
      lead: `운임 공급가액(부가세 제외)의 ${rate}가 적립됩니다.`,
      bullets: [
        "적립은 운임 입금이 확인된 시점에 반영됩니다.",
        `적립 금액은 ${won(REWARD_EARN_UNIT)} 단위로 내림 계산합니다.`,
        // 🔴 포털은 **조건부**다(`portal_visible`) — 「확인 가능합니다」로 단정하면
        //    꺼져 있는 화주가 없는 메뉴를 찾는다(리워드 3차가 문자에서 고친 결함과 같은 자리).
        "적립 내역은 담당자가 문자로 안내드립니다. 운송관리 화면에서 직접 보시려면 담당자에게 말씀해 주세요.",
      ],
      example:
        exEarn > 0
          ? [`운임 ${won(exBase)}(부가세 포함 ${won(Math.round(exBase * 1.1))} 결제) → ${won(exEarn)} 적립`]
          : undefined,
    },
    {
      heading: "사용 방법",
      lead: `적립금이 ${won(min)} 이상 모이면 운임 할인으로 사용할 수 있습니다.`,
      bullets: [
        "다음 운송 건의 운임(부가세 제외)에서 차감됩니다.",
        "부가세는 차감 후 금액을 기준으로 계산됩니다.",
        // 🔴 아래 셋은 초안에 없던 것이고 전부 관문이다(`lib/rewardUse.ts`)
        "아직 입금되지 않은 건에만 적용할 수 있습니다. 이미 입금이 끝난 건에는 소급 적용되지 않습니다.",
        "선착불 건(운임을 기사님께 직접 지급하는 건)에는 사용할 수 없습니다.",
        "적용은 담당자가 처리해 드립니다. 사용을 원하시면 미리 말씀해 주세요.",
      ],
      example:
        exEarn > 0 && exCount > 0
          ? [
              `${won(exBase)} 운송 ${exCount}건 → ${won(exEarn * exCount)} 적립`,
              `다음 운송에서 ${won(min)} 할인 → 운임 ${won(exBase - min)} + 부가세 ${won(
                Math.round((exBase - min) * 0.1)
              )} = ${won(Math.round((exBase - min) * 1.1))} 청구`,
            ]
          : undefined,
    },
    {
      heading: "사용 기한",
      bullets: [
        // 🟢 이것은 사실이다 — `use_period_over` 관문이 그 날 이후를 막는다
        useEnd
          ? `적립금은 ${useEnd}까지 사용할 수 있습니다.`
          : "사용 기한은 담당자에게 문의해 주세요.",
        // 🔴 위 ③ — 「소멸 예정 적립금은 사전에 안내됩니다」를 되살리지 말 것
        "기한이 가까워지면 담당자에게 문의해 주세요. 남은 적립금과 사용 방법을 안내드립니다.",
      ],
    },
    {
      heading: "유의사항",
      bullets: [
        // 🔴 위 ⑤ — 트리거는 운송 취소가 아니라 입금 확인의 해제다
        "입금 확인이 취소되면 그 건의 적립금도 함께 회수됩니다.",
        "이벤트 조건이 바뀌어도 이미 적립된 금액은 그대로 유지됩니다.",
        "적립과 사용은 담당자 확인을 거쳐 처리됩니다.",
      ],
    },
  ];
}

/**
 * 맨 아래 문의 블록 — 🔴 연락처·시간을 여기 적지 말 것(화면이 상수를 읽는다).
 *
 * ⚠️ 초안은 *「더 자세한 내용이 궁금하시면」* 이라고 적고 있었다. 맞춤법이 확실하지
 *    않은 낱말이라 **그 말을 쓰지 않고 다시 썼다** — 고객에게 보이는 글이라
 *    애매한 채로 두지 않는다.
 */
export const REWARD_EVENT_CTA_TEXT =
  "적립금 사용 방법이나 이벤트 내용을 더 알고 싶으시면 담당자 또는 고객센터로 연락해 주세요.";
