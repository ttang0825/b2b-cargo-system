// 월정산 **기간** 계산 — 「정산월 라벨(YYYY-MM)」 ↔ 「실제 기간(period_start ~ period_end)」.
//
// 🔴 **이 파일이 유일한 정의처다.** 그전에는 `components/MonthlyBillingBatchPanel.tsx`
//    안에만 있었는데, 묶음 자동 생성(서버 API)이 **같은 기간을 계산해야** 해서 옮겼다.
//    🔴 화면과 서버가 각자 계산하면 담당자가 손으로 만든 묶음과 자동으로 만들어진
//    묶음의 기간이 하루씩 어긋나 **같은 달에 묶음이 둘**이 된다.
//
// 🔴 **마감은 전 화주 월말이다**(36차 A장) — `companies.billing_cutoff_day` 는 값을
//    비웠고 `null` 이 곧 월말이라는 뜻이다. 그래도 컬럼과 이 분기는 남겨 둔다:
//    **과거 묶음이 그 시절 계산으로 저장돼 있고**, 원칙 46번이 그것을 존중하라고 못박는다.
//
// 🔴 **기존 묶음을 찾을 때 이 함수로 역산한 기간과 「완전히 같은지」 비교하지 말 것**
//    (원칙 46번). 마감일 설정이 묶음 생성 뒤에 바뀌면 영영 못 찾는다. 찾는 기준은
//    **`period_end` 가 그 달력월 안에 있는가**이고 그것이 `monthRangeOf()` 다.

export function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** 정산월 라벨(`YYYY-MM`) + 화주 마감일 → 실제 기간. 마감일이 없으면 달력월(1일~말일). */
export function monthToPeriod(monthInput: string, cutoffDay: number | null) {
  const [y, m] = monthInput.split("-").map(Number);
  if (!cutoffDay) {
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return { period_start: fmtDate(start), period_end: fmtDate(end) };
  }
  const end = new Date(y, m - 1, cutoffDay);
  const start = new Date(y, m - 2, cutoffDay + 1);
  return { period_start: fmtDate(start), period_end: fmtDate(end) };
}

/** 어떤 날짜가 그 화주 기준으로 어느 정산월 라벨에 속하는가 (역산). */
export function monthLabelForDate(dateStr: string, cutoffDay: number | null) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (!cutoffDay) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  let y = d.getFullYear();
  let m = d.getMonth() + 1;
  if (d.getDate() > cutoffDay) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * 정산월 라벨의 **달력월** 범위. 기존 묶음을 찾는 데 쓴다(원칙 46번 — 위 주석).
 * 🔴 `monthToPeriod()` 의 기간과 다르다. 섞어 쓰지 말 것.
 */
export function monthRangeOf(monthInput: string) {
  const [y, m] = monthInput.split("-").map(Number);
  return { start: `${monthInput}-01`, end: fmtDate(new Date(y, m, 0)) };
}
