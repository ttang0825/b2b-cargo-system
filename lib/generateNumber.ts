// ─────────────────────────────────────────────────────────────────────────────
// 견적번호·오더번호 만들기 — `Q-20260916-001` / `O-20260916-001`
//
// 🔴 **「그날 만들어진 행 수 + 1」로 되돌리지 말 것.** 2026-09-16 까지 그 방식이었고
//    실제로 **저장이 통째로 막혔다**(신고: `duplicate key value violates unique
//    constraint "quotes_quote_no_key"`).
//
//      오늘 001·002·003 을 만들고 **002 를 지우면** 건수가 2 라 다음 번호가 003 이 된다.
//      003 은 이미 있으므로 유니크 위반 → 저장 실패. 🔴 **그리고 다시 눌러도 같은 번호를
//      뽑으므로 영영 실패한다** — 담당자에게는 「견적 저장이 아예 안 되는」 상태로 보인다.
//
//    🔴 더 나쁜 것은 **그 실패가 다른 화면으로 번진다**는 것이다. 발주요청은 「견적이
//    저장되는 순간」에 `승인됨` 이 되므로(`app/admin/quotes/page.tsx`), 저장이 실패하면
//    요청이 `대기중` 으로 남아 **「화주요청」 배지가 안 사라진다.** 같은 날 들어온 신고
//    두 건이 이 한 뿌리였다.
//
// 🔴 **그래서 세는 것이 아니라 「그날 최대 번호 + 1」이다.** 지워진 번호는 다시 쓰지
//    않는다(비어 있는 채로 둔다) — 번호는 연속이 아니라 **유일**하기만 하면 된다.
//
// 🔴 **동시 저장은 번호 계산만으로 막을 수 없다.** 두 사람이 같은 순간에 누르면 둘 다
//    같은 최대값을 읽는다(§7 의 「먼저 조회해서 없으면 insert」 함정). 그래서 **DB 유니크
//    제약을 방어선으로 두고, 위반(`23505`)이면 번호를 다시 뽑아 재시도**한다 —
//    `insertWithDailyNumber()` 가 그 한 곳이다. 🔴 **번호만 뽑아 쓰지 말고 그 함수를 쓸 것.**
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabaseClient";

type NumberedTable = "quotes" | "orders";

/** 표마다 번호가 들어가는 컬럼. 🔴 화면에서 다시 적지 말 것. */
const NUMBER_COLUMN: Record<NumberedTable, string> = {
  quotes: "quote_no",
  orders: "order_no",
};

/**
 * 한 번에 훑는 그날 번호의 상한.
 * 🔴 **`limit(1)` + 내림차순 정렬로 바꾸지 말 것** — 번호가 문자열이라 하루 1,000건을
 *    넘는 순간 `"1000" < "999"` 가 되어 **최대값을 잘못 집는다.** 전부 받아 코드에서
 *    숫자로 비교한다(하루 몇 건 수준이라 무게가 없다).
 */
const DAILY_SCAN_LIMIT = 2000;

function todayStamp(now: Date): string {
  return (
    `${now.getFullYear()}` +
    `${String(now.getMonth() + 1).padStart(2, "0")}` +
    `${String(now.getDate()).padStart(2, "0")}`
  );
}

/**
 * 그날 쓰인 번호 중 가장 큰 순번 + 1 로 다음 번호를 만든다.
 *
 * 🔴 **`error` 를 삼키지 말 것**(원칙 55번). 조회가 실패했을 때 `001` 을 돌려주면
 *    **그것이 곧 중복**이라 저장이 실패하고, 화면에는 「중복」이라는 엉뚱한 원인이 뜬다.
 *    실패는 실패로 올린다.
 *
 * ⚠️ `created_at` 이 아니라 **번호 문자열 자체**로 그날을 고른다 — 번호에 박힌 날짜는
 *    로컬 날짜인데 `created_at` 은 `timestamptz` 라, 그 둘을 섞으면 자정 전후에서
 *    어긋난다(원칙 41번과 같은 결).
 */
async function nextDailyNumber(
  table: NumberedTable,
  prefix: string
): Promise<{ no: string | null; error: string | null }> {
  const col = NUMBER_COLUMN[table];
  const dateStr = todayStamp(new Date());
  const head = `${prefix}-${dateStr}-`;

  const { data, error } = await supabase
    .from(table)
    .select(col)
    .like(col, `${head}%`)
    .limit(DAILY_SCAN_LIMIT);
  if (error) return { no: null, error: error.message };

  let max = 0;
  for (const row of (data || []) as any[]) {
    const value = row?.[col];
    if (typeof value !== "string") continue;
    // 🔴 `Number()` 로 바꾸지 말 것 — 형식이 다른 옛 번호가 섞이면 `NaN` 이 최대값을
    //    오염시킨다. 숫자 꼬리만 골라 읽는다.
    const tail = value.slice(head.length);
    if (!/^\d+$/.test(tail)) continue;
    const seq = parseInt(tail, 10);
    if (seq > max) max = seq;
  }

  return { no: `${head}${String(max + 1).padStart(3, "0")}`, error: null };
}

/** 번호가 겹쳐서 난 유니크 위반인가. 다른 제약의 위반까지 재시도하면 안 된다. */
function isDuplicateNumberError(error: any, column: string): boolean {
  if (!error) return false;
  if (error.code === "23505") {
    const detail = `${error.message || ""} ${error.details || ""}`;
    // 🔴 코드만 보고 재시도하지 말 것 — 다른 유니크 컬럼(예: 사업자번호)이 겹친 것이면
    //    몇 번을 다시 해도 같은 실패이고, 그동안 원인 메시지만 가려진다.
    return detail.includes(column);
  }
  return false;
}

/**
 * 몇 번까지 다시 해볼 것인가.
 * 🔴 무한으로 두지 말 것 — 유니크 위반이 번호가 아닌 다른 이유로 계속 나면 화면이 멈춘다.
 */
const MAX_ATTEMPTS = 5;

/**
 * 번호를 붙여 한 행을 넣는다. **견적·오더 등록은 반드시 이 함수를 거친다.**
 *
 * 🔴 **`row` 에 번호 컬럼을 직접 넣지 말 것** — 이 함수가 채운다(넣으면 재시도가
 *    같은 번호를 다시 쓴다).
 *
 * @param selectColumns insert 뒤 돌려받을 컬럼. 기본은 `id` 다.
 */
export async function insertWithDailyNumber(
  table: NumberedTable,
  prefix: string,
  row: Record<string, unknown>,
  selectColumns = "id"
): Promise<{ data: any | null; error: { message: string } | null }> {
  const col = NUMBER_COLUMN[table];
  let lastError: any = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { no, error: numberError } = await nextDailyNumber(table, prefix);
    if (numberError) return { data: null, error: { message: numberError } };

    const { data, error } = await supabase
      .from(table)
      .insert({ ...row, [col]: no })
      .select(selectColumns)
      .single();
    if (!error) return { data, error: null };

    // 🔴 번호 중복이 아니면 **그 자리에서 그대로 올린다** — 삼키면 진짜 원인이 사라진다.
    if (!isDuplicateNumberError(error, col)) return { data: null, error };
    lastError = error;
  }

  // 여기까지 오면 같은 순간에 여럿이 저장 중이거나 번호가 크게 어긋난 것이다.
  return {
    data: null,
    error: {
      message:
        `번호가 계속 중복되어 저장하지 못했습니다(${MAX_ATTEMPTS}회 시도). ` +
        `잠시 후 다시 시도해 주세요. (${lastError?.message || ""})`,
    },
  };
}
