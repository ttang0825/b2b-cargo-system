// 화주포털 정산 요약 — **홈과 「정산·결제내역」이 같은 수를 말하게 하는 한 곳**
//
// 🔴 **왜 함수로 뺐나**(2026-09-23 · 화주포털 개편 A장).
//    홈의 「금액 요약」 카드와 정산 화면의 요약 카드 셋이 **같은 숫자**여야 한다.
//    화면마다 따로 더하면 조용히 갈린다 — 36차 C장의 미수금 신고가 정확히 그
//    모양이었고, 원칙 51번이 말하는 자리다(같은 규칙을 두 곳에서 더하지 말 것).
//
// 🔴 **기간 판정의 기준 날짜는 「운송완료일」이다**(사용자 확정 2026-09-23 · ② 물음).
//    `invoices.settlement_reference_date` 가 그 값이고 `lib/autoCreateInvoice.ts` 가
//    운송완료 시점을 넣는다. 🔴 **새 컬럼을 만들지 말 것** — 이미 있다(원칙 27번).
//    ⚠️ 손으로 등록한 옛 정산 건은 그 칸이 빌 수 있어 `created_at` 으로 떨어진다.
//
// ⚠️ **현장 추가비는 더하지 않는다** — 지금 정산 화면의 요약 카드도 더하지 않고
//    (행에만 따로 그린다) 실측상 `dispatch_extra_charges` 가 0행이다. 🔴 더하기로
//    정하면 **홈·정산·월별 통계 세 곳을 함께** 고칠 것(원칙 47·51번).

import {
  isInPortalPeriod,
  PORTAL_PERIOD_ALL,
  type PortalPeriod,
} from "@/components/pv2/Pv2PeriodFilter";

/** 요약에 필요한 칸만. 🔴 화면마다 `select` 문자열이 달라도 이 모양이면 된다. */
export type PortalInvoiceLike = {
  customer_charge_total: number | null;
  payment_received: boolean | null;
  tax_invoice_issued: boolean | null;
  tax_invoice_date?: string | null;
  settlement_reference_date?: string | null;
  created_at: string;
};

/**
 * 기간 판정에 쓸 ISO 문자열. 🔴 **`settlement_reference_date` 를 그대로 비교하지 말 것.**
 *
 *    그 칸은 `date`(「2026-09-01」)이고 `isInPortalPeriod()` 의 하한은
 *    **로컬 자정을 ISO 로 바꾼 값**(「2026-08-31T15:00:00.000Z」)이다. 날짜만 있는
 *    문자열을 문자열로 견주면 **같은 날일 때 길이가 짧은 쪽이 작아져** 그 날 건이
 *    통째로 빠진다. 그래서 **로컬 자정 ISO 로 올려서** 비교한다.
 */
export function portalInvoiceDateIso(i: PortalInvoiceLike): string {
  const d = i.settlement_reference_date;
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day).toISOString();
  }
  return i.created_at;
}

export type PortalInvoiceSummary = {
  /** 고른 기간 안의 청구 합계(공급가액) */
  billedTotal: number;
  billedCount: number;
  /**
   * 🔴 **미결제 잔액은 기간을 보지 않는다 — 누적이다**(사용자 확정 2026-09-23).
   *    기간을 걸면 **지난달 미납이 카드에서 사라져** 화주가 「낼 게 없구나」로 읽는다.
   *    🔴 **다른 둘처럼 기간을 걸지 말 것.**
   */
  unpaidTotal: number;
  unpaidCount: number;
  /** 그중 고른 기간에 든 것 — 카드의 작은 글씨용(사용자 확정 ⓒ) */
  unpaidInPeriodTotal: number;
  unpaidInPeriodCount: number;
  /** 고른 기간 안에 발행된 세금계산서 */
  taxCount: number;
  latestTaxDate: string | null;
};

export function summarizePortalInvoices(
  invoices: PortalInvoiceLike[],
  period: PortalPeriod = PORTAL_PERIOD_ALL
): PortalInvoiceSummary {
  let billedTotal = 0;
  let billedCount = 0;
  let unpaidTotal = 0;
  let unpaidCount = 0;
  let unpaidInPeriodTotal = 0;
  let unpaidInPeriodCount = 0;
  let taxCount = 0;
  let latestTaxDate: string | null = null;

  invoices.forEach((i) => {
    const amount = i.customer_charge_total || 0;
    const inPeriod = isInPortalPeriod(period, portalInvoiceDateIso(i));

    if (inPeriod) {
      billedTotal += amount;
      billedCount += 1;
      // 🔴 세금계산서도 **기간 안 발행분**만 센다 — 「최근 발행일」도 그 안에서 고른다.
      if (i.tax_invoice_issued) {
        taxCount += 1;
        if (i.tax_invoice_date && (!latestTaxDate || i.tax_invoice_date > latestTaxDate)) {
          latestTaxDate = i.tax_invoice_date;
        }
      }
    }

    if (!i.payment_received) {
      unpaidTotal += amount;
      unpaidCount += 1;
      if (inPeriod) {
        unpaidInPeriodTotal += amount;
        unpaidInPeriodCount += 1;
      }
    }
  });

  return {
    billedTotal,
    billedCount,
    unpaidTotal,
    unpaidCount,
    unpaidInPeriodTotal,
    unpaidInPeriodCount,
    taxCount,
    latestTaxDate,
  };
}

/** 카드 라벨 앞에 붙일 기간 이름. 🔴 「전체」일 때는 붙이지 않는다(라벨이 길어질 뿐이다). */
export function portalPeriodLabel(period: PortalPeriod): string {
  if (period.preset === "today") return "오늘 ";
  if (period.preset === "week") return "이번주 ";
  if (period.preset === "month") return "이번 달 ";
  if (period.preset === "custom") {
    const short = (v: string) => (v ? v.slice(5).replace("-", "/") : "");
    if (period.from && period.to) return `${short(period.from)}~${short(period.to)} `;
    if (period.from) return `${short(period.from)}부터 `;
    if (period.to) return `${short(period.to)}까지 `;
  }
  return "";
}
