import { supabase } from "@/lib/supabaseClient";

// 「수주인데 아직 운송오더가 없는 견적」의 유일한 정의처 (34차 리뷰 1라운드).
//
// 🔴 **이 규칙은 `TopNav` 의 「견적 관리」 배지가 세는 것과 같아야 한다.** 27차 리뷰가
//    그 배지를 만들 때 계산식이 `TopNav.tsx` 안에만 있었고, 그래서 배지는 숫자를
//    말하는데 **그 숫자가 어느 건인지 볼 화면이 없었다.** 실사용 리뷰에서
//    *"견적관리 부분에 계속해서 알림 표시 4건이 남아 있다"* 로 나타난 것이 이것이다.
//    화면 세 곳(견적 목록 · 오더 목록 · 오더 상세)이 같은 규칙을 각자 적으면 다시
//    갈리므로 여기 한 곳에 둔다 — 33차 `lib/companyFields.ts` 와 같은 결이다.
//
// 🔴 **판정 기준은 `orders.quote_id` 다.** 오더를 `?from_quote=` 를 거치지 않고 직접
//    등록하면 이 컬럼이 비어서, 오더가 실재해도 배지가 영영 안 사라진다. 실측
//    (2026-09-10): 오더 6건 중 **3건이 `quote_id` 없음**. 그래서 오더 상세에
//    「견적 연결」을 두어 **이미 만든 오더를 뒤늦게 이을 수 있게** 했다 —
//    그 길이 없으면 담당자가 배지를 지우려고 **같은 건의 오더를 또 만들게 된다.**
//
// 🔴 **`status` 문자열 `'수주'` 를 다른 곳에서 다시 적지 말 것** — 아래 상수를 쓴다.

/** 견적이 「오더를 만들어야 하는 상태」임을 뜻하는 값. DB 에 저장되는 문자열이다. */
export const WON_QUOTE_STATUS = "수주";

/** 한 번에 훑는 수주 견적 수 상한 — `TopNav` 배지와 같은 값이어야 한다. */
const WON_QUOTE_SCAN_LIMIT = 300;

export type UnlinkedWonQuote = {
  id: string;
  quote_no: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  final_amount: number | null;
  created_at: string;
  company_id: string | null;
  guest_name: string | null;
  companies?: { name: string | null } | null;
};

/**
 * 「수주인데 운송오더가 없는 견적」을 돌려준다.
 *
 * 🔴 **조회 실패를 빈 배열로 삼키지 말 것**(원칙 55번) — `error` 를 같이 돌려주고
 *    화면이 그것을 띄운다. 단 `TopNav` 배지만은 예외로 0 으로 둔다(배지 하나 때문에
 *    상단메뉴가 통째로 깨지면 안 된다 — 27차 결정).
 *
 * @param companyId 주면 그 화주의 건만. 오더 상세의 「견적 연결」이 쓴다.
 */
export async function fetchUnlinkedWonQuotes(
  companyId?: string | null
): Promise<{ quotes: UnlinkedWonQuote[]; error: string | null }> {
  let wonQuery = supabase
    .from("quotes")
    .select(
      "id,quote_no,origin,destination,vehicle_type,final_amount,created_at,company_id,guest_name,companies(name)"
    )
    .eq("status", WON_QUOTE_STATUS)
    .order("created_at", { ascending: true })
    .limit(WON_QUOTE_SCAN_LIMIT);
  if (companyId) wonQuery = wonQuery.eq("company_id", companyId);

  const { data: won, error: wonError } = await wonQuery;
  if (wonError) return { quotes: [], error: wonError.message };
  if (!won || won.length === 0) return { quotes: [], error: null };

  const { data: ordered, error: orderError } = await supabase
    .from("orders")
    .select("quote_id")
    .in(
      "quote_id",
      won.map((q: any) => q.id)
    );
  if (orderError) return { quotes: [], error: orderError.message };

  const linked = new Set((ordered || []).map((o: any) => o.quote_id));
  return {
    quotes: (won as any as UnlinkedWonQuote[]).filter((q) => !linked.has(q.id)),
    error: null,
  };
}

/** 목록 화면에서 「이 행이 그 건인가」를 O(1) 로 묻기 위한 id 집합. */
export async function fetchUnlinkedWonQuoteIds(): Promise<{
  ids: Set<string>;
  error: string | null;
}> {
  const { quotes, error } = await fetchUnlinkedWonQuotes();
  return { ids: new Set(quotes.map((q) => q.id)), error };
}
