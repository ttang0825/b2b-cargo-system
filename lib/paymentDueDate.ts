// 월정산 묶음의 **납부기한**(화주가 위캐리에 입금하는 날)을 화주 거래조건에서 계산한다.
//
// 🔴 **이 파일이 유일한 정의처다.** 계산이 필요한 곳이 셋이다 —
//    ① 묶음 자동 생성(`app/api/admin/billing-batches/auto-attach`)
//    ② 묶음 확정(`app/api/admin/billing-batches/confirm`)
//    ③ 묶음 화면의 안내·기본값(`components/MonthlyBillingBatchPanel.tsx`)
//    화면마다 다시 적으면 「화면에 보이는 날짜」와 「저장된 날짜」가 조용히 갈린다.
//
// 🔴 **마감은 전 화주 월말이다**(36차 A장 · 사용자 지시 *"업체마다 정산마감일이
//    상이하면 복잡해질것 같다"*). `companies.billing_cutoff_day` 는 값을 비웠고
//    `null` 이 곧 월말이라는 뜻이다 — 컬럼을 지우지 말 것.
//    그래서 결제일은 **정산월의 익월 며칠**로 표현된다(사용자 지시
//    *"결제일은 (정산 다음달 기준)"*).
//
// 🔴 **`negotiated`(협의)는 계산하지 않는다** — 값이 없는 것이 정상이고, 담당자가
//    묶음 화면에서 손으로 넣는다. 억지로 날짜를 만들면 연체 판정이 그 가짜 날짜를
//    기준으로 돌아 실제로 합의하지 않은 날에 「연체」가 붙는다.
//
// 🔴 **`tax_invoice`(세금계산서 발행일 기준)도 계산하지 않는다** — 기준이 발행일이라
//    마감일만으로는 못 정한다. 지금 화면에서 고를 수 없는 값이지만(36차 리뷰 2라운드)
//    DB CHECK 가 허용하므로 옛 데이터에 남아 있을 수 있다.

export type PaymentDueSetting = {
  payment_due_basis?: string | null;
  /** 익월 며칠. **0 = 익월 말일** (`PAYMENT_DUE_CHOICES` 와 같은 뜻) */
  payment_due_value?: number | null;
};

function lastDayOf(year: number, month1: number) {
  // month1 은 1~12. `new Date(y, m, 0)` 이 그 달의 말일이다.
  return new Date(year, month1, 0).getDate();
}

function fmt(year: number, month1: number, day: number) {
  return `${year}-${String(month1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * 묶음 기간의 끝(= 정산 마감일)과 화주 설정으로 납부기한을 계산한다.
 *
 * 계산할 수 없으면 **`null`** 을 돌려준다(협의 · 미설정 · 세금계산서 기준).
 * 🔴 `null` 을 오늘 날짜 같은 것으로 대신 채우지 말 것 — 「모른다」와 「그 날이다」는 다르다.
 */
export function calcPaymentDueDate(
  periodEnd: string | null | undefined,
  setting: PaymentDueSetting | null | undefined
): string | null {
  if (!periodEnd || !setting) return null;
  const basis = setting.payment_due_basis;
  if (basis === "negotiated" || basis === "tax_invoice") return null;

  const value = setting.payment_due_value;
  if (value === null || value === undefined) return null;

  const [y, m] = periodEnd.split("-").map(Number);
  if (!y || !m) return null;

  // 정산월의 **익월**
  let dueYear = y;
  let dueMonth = m + 1;
  if (dueMonth > 12) {
    dueMonth = 1;
    dueYear += 1;
  }

  const last = lastDayOf(dueYear, dueMonth);
  // 🔴 0 은 「말일」이고, 31 을 고른 화주도 30일·2월에는 그 달 말일로 내려앉는다
  //    (없는 날짜를 만들면 `Date` 가 다음 달로 넘겨버린다).
  const day = value === 0 ? last : Math.min(Math.max(value, 1), last);
  return fmt(dueYear, dueMonth, day);
}

/** 화주 설정을 사람이 읽는 한 줄로. 화면 안내용이며 계산에는 쓰지 않는다. */
export function describePaymentDue(setting: PaymentDueSetting | null | undefined): string {
  if (!setting) return "미정";
  if (setting.payment_due_basis === "negotiated") return "협의";
  if (setting.payment_due_basis === "tax_invoice") return "세금계산서 발행일 기준";
  const value = setting.payment_due_value;
  if (value === null || value === undefined) return "미정";
  return value === 0 ? "익월 말일" : `익월 ${value}일`;
}

/**
 * 오늘(로컬 기준) 날짜를 `YYYY-MM-DD` 로. 마감·납부기한이 지났는지 재는 데 쓴다.
 * 🔴 `new Date().toISOString().slice(0,10)` 을 쓰지 말 것 — UTC 라 한국시간
 *    오전 9시 전에는 **어제 날짜**가 나온다(원칙 41번과 같은 뿌리).
 */
export function todayLocal(): string {
  const d = new Date();
  return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** 마감일(기간 끝)이 지났는가 — 지난 날이면 true. 같은 날은 아직 아니다. */
export function isPeriodClosed(periodEnd: string | null | undefined): boolean {
  if (!periodEnd) return false;
  return periodEnd < todayLocal();
}

/** 납부기한이 지났는가 — 지난 날이면 true. 같은 날은 아직 아니다. */
export function isPastDue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return dueDate < todayLocal();
}
