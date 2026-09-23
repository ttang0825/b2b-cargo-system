// ─────────────────────────────────────────────────────────────────────────────
// 화주 화면에서 **아직 배차가 만들어지지 않은 건**을 어떻게 보여줄지 — 유일 정의처
// (2026-09-18)
//
// 사용자 지시: *「화주포털에서 견적승인을 하면 내부시스템에서 견적이 수주로 바뀌게
// 되어있다. 이때 화주포털 배차,운송조회에 해당 오더가 접수 상태여야 한다.」*
//
// 🚨 **그 「화주 승인」은 2026-09-23(B장)에 없어졌다 — 그런데 이 파일은 거의 그대로다.**
//    이 카드가 보는 신호는 처음부터 **`quotes.status === '수주'`** 였고 **누가 그 값을
//    놓았는지는 보지 않는다.** 이제 그것을 놓는 사람이 담당자(전화 확정 뒤)로 바뀐 것뿐이다.
//    🟢 그래서 카드는 오히려 **더 중요해졌다** — 화주가 직접 누르는 행위가 없어져서,
//    통화 뒤 진행 상황을 보는 자리가 이 카드뿐이다.
//    🔴 **「승인이 없어졌으니 ① 갈래도 필요 없다」로 지우지 말 것.**
//    ⚠️ `approved_by_customer_at`(승인 시각)은 **옛 건에만 있다** — 아래 정렬이 `created_at`
//    으로 떨어지는 갈래가 이제 **보통의 경우**다(그때는 예외였다).
//
// 🔴 **그전에는 화주가 견적을 승인하고 나면 조회 화면이 통째로 비어 있었다.**
//    배차·운송 조회도 홈의 「진행 중인 운송」도 `dispatches` **만** 읽는데, 배차 행은
//    담당자가 오더를 만들고 배차를 등록해야 비로소 생긴다. 그 사이(몇 분에서 몇
//    시간)에 화주는 **자기가 방금 승인한 건이 어디에도 없는 화면**을 본다.
//
// 🔴 **오더를 자동으로 만들어서 메우지 말 것.** 27차가 못박은 것이고 그 이유는
//    `app/api/customer/approve-quote/route.ts` 가 적고 있다 — 같은 견적에 오더가 두 번
//    생길 수 있고, 담당자가 화주 조건을 확인하는 흐름을 화주가 건너뛰게 된다.
//    그래서 **DB 에 아무것도 만들지 않고 화면에만 그리는 「가상 카드」**로 메운다.
//
// 🔴 **아직 배차가 없는 건은 두 갈래다 — 둘 다 세어야 한다.**
//    ① 수주 견적인데 **오더가 아직 없다**  → 화주가 승인한 직후의 자리
//    ② 오더는 있는데 **배차가 아직 없다**  → 담당자가 오더만 만들어 둔 자리
//    ⚠️ 서로 겹치지 않는다 — ①은 「오더가 없는 것」만, ②는 오더 자신을 센다.
//    🔴 **①만 만들지 말 것** — 오더가 생기는 순간 카드가 사라졌다가 배차가 등록되면
//    다시 나타나 화주 눈에는 **건이 없어졌다 돌아온 것**으로 보인다.
//
// 🔴 **②의 상태 조건(`접수`·`배차중`)을 지워서 고치지 말 것** — 관리자 「+ 배차 등록」
//    후보와 **같은 두 단계 판정**이다(PR #167 ⑦). 상태로 좁히고 → 실제 배차가 있는
//    것을 뺀다. 조건을 지우면 운송이 끝난 오더까지 「접수」 카드로 되살아난다.
//
// 🔴 **취소된 배차가 있는 오더는 여기 걸리지 않는다** — 취소도 `dispatches` 행이라
//    ②의 「배차가 있다」에 해당한다. 그 건은 취소 카드가 이미 말하고 있다
//    (`lib/portalCancelledDispatches.ts`). 두 파일을 한쪽으로 합치지 말 것 —
//    저쪽은 「있는 배차를 어떻게 보여줄까」이고 이쪽은 「없는 배차를 어떻게 메울까」다.
//
// 🔴 **화면 둘이 같은 함수를 쓴다**(배차·운송 조회 · 홈) — 한쪽만 고치면 「홈에는
//    뜨는데 조회에는 없는」 상태가 된다(`lib/dispatchStage.ts` 가 세운 규칙과 같은 결).
//
// ⚠️ **알아 둘 구멍 하나** — 담당자가 `?from_quote=` 를 거치지 않고 오더를 직접
//    만들면 `orders.quote_id` 가 비어서 ①이 그 견적을 계속 「오더 없음」으로 본다.
//    그러면 같은 건이 ①의 가상 카드와 ②(또는 진짜 배차 카드)로 **두 번** 보인다.
//    🔴 새 판정 기준을 만들지 말 것 — 관리자 쪽이 이미 같은 기준으로 배지를 띄우고
//    (`lib/unlinkedWonQuotes.ts` · TopNav 「견적 관리」), 오더 상세의 **「견적 연결」**이
//    그것을 뒤늦게 잇는 길이다. 실측(2026-09-18 `_verify.sql` ㉛): 수주 12건 중
//    **오더 없음 0건 · 오더인데 배차 없음 0건** — 지금 어긋나 있는 건은 없다.
// ─────────────────────────────────────────────────────────────────────────────

// 🔴 **`lib/unlinkedWonQuotes.ts` 에서 가져오지 말 것** — 그 파일은 맨 위에서
//    관리자 클라이언트를 import 해서, 포털 번들에 관리자 세션이 딸려 들어간다
//    (원칙 1번). 값의 정의처는 의존성 0 인 아래 파일이다.
import { WON_QUOTE_STATUS } from "@/lib/quoteStatusLabels";

/** 최소한의 질의 인터페이스 — 화면이 쓰는 클라이언트를 그대로 받는다(목으로 갈아끼우기 쉽다). */
type PendingQuery = {
  from: (table: string) => any;
};

/**
 * 🔴 **아직 배차가 없을 수 있는 오더 상태**(관리자 「+ 배차 등록」 후보와 같은 값).
 *    `DISPATCH_TO_ORDER_STATUS["취소"] === "접수"` 라 취소된 건도 `접수` 로 돌아오지만,
 *    그 오더에는 취소 배차 행이 남아 있어 아래 배차 검사에서 걸러진다.
 */
const PRE_DISPATCH_ORDER_STATUSES = ["접수", "배차중"] as const;

/** 한 번에 훑는 상한 — 화주 한 곳의 것만 RLS 가 내려주므로 넉넉하다. */
const PENDING_SCAN_LIMIT = 100;

/**
 * 배차 카드와 **모양이 같은** 가상 행.
 *
 * 🔴 `dispatch_status`·`pickup_confirmed`·`delivery_confirmed` 가 전부 `null` 이라
 *    `getDispatchStage()` 가 **0(접수)** 을 돌려준다 — 화면에서 단계를 따로 정하지 말 것.
 * 🔴 `order_id` 를 채우지 않는다 — `getPortalCancelNotice()` 가 취소 이력을 찾는 열쇠라,
 *    채우면 「배차가 하나도 없는 건」에 취소 배지가 붙을 길이 생긴다.
 * 🔴 `updated_at` 은 언제나 `null` 이다 — 이 카드가 생기는 계기는 **화주 본인의 승인**
 *    이라 「업데이트」 알약을 띄울 일이 아니다(PR #164 가 배너에서 세운 기준과 같다).
 */
export type PortalPendingRow = {
  id: string;
  order_id: null;
  dispatch_status: null;
  cancel_reason: null;
  pickup_confirmed: null;
  delivery_confirmed: null;
  issue_occurred: null;
  issue_reason: null;
  created_at: string | null;
  updated_at: null;
  /** 🔴 오더가 아직 없는 건은 화면이 오더번호 대신 이것을 보여준다. */
  quote_no: string | null;
  orders: {
    order_no: string | null;
    origin: string | null;
    destination: string | null;
    requested_pickup_at: string | null;
    item: string | null;
    vehicle_type: string | null;
    loading_type: string | null;
    collection_method: string | null;
    billing_cycle: string | null;
    direct_collection_point: string | null;
  };
};

const ORDER_COLUMNS =
  "id,order_no,quote_id,status,created_at,origin,destination,requested_pickup_at,item,vehicle_type,loading_type,collection_method,billing_cycle,direct_collection_point";

// 🔴 `quotes.vehicle_type` 은 톤수뿐이다(차량형태는 `selected_options` 안) — 카드가
//    보여주는 것도 톤수이므로 그대로 쓴다. 🔴 `selected_options` 를 여기서 펴지 말 것.
const QUOTE_COLUMNS =
  "id,quote_no,created_at,approved_by_customer_at,origin,destination,requested_pickup_at,item,vehicle_type,loading_type,collection_method,billing_cycle,direct_collection_point";

/**
 * 「아직 배차가 없는 건」을 배차 카드 모양의 가상 행으로 돌려준다.
 *
 * 🔴 조회에 실패하면 **아무 카드도 만들지 않고 사유를 같이 돌려준다**(원칙 55번) —
 *    빈 배열로 삼키면 "승인했는데 여전히 안 보인다"의 원인을 짚을 단서가 없다.
 *    ⚠️ 다만 실패가 **기존 배차 목록을 가리면 안 된다** — 화면은 이 사유를 배너로만
 *    띄우고 진짜 배차 카드는 그대로 그린다.
 */
export async function fetchPortalPendingDispatches(
  client: PendingQuery
): Promise<{ rows: PortalPendingRow[]; error: string | null }> {
  const [orderRes, quoteRes] = await Promise.all([
    (client as any)
      .from("orders")
      .select(ORDER_COLUMNS)
      // 🔴 두 단계 중 첫째다(상태로 좁힌다) — 아래 배차 검사가 둘째다.
      .in("status", PRE_DISPATCH_ORDER_STATUSES as unknown as string[])
      .order("created_at", { ascending: false })
      .limit(PENDING_SCAN_LIMIT),
    (client as any)
      .from("quotes")
      .select(QUOTE_COLUMNS)
      .eq("status", WON_QUOTE_STATUS)
      .order("created_at", { ascending: false })
      .limit(PENDING_SCAN_LIMIT),
  ]);

  if (orderRes?.error) return { rows: [], error: orderRes.error.message };
  if (quoteRes?.error) return { rows: [], error: quoteRes.error.message };

  const orders = (orderRes?.data || []) as any[];
  const quotes = (quoteRes?.data || []) as any[];
  if (orders.length === 0 && quotes.length === 0) return { rows: [], error: null };

  // ② 배차가 붙은 오더 · ① 오더가 붙은 견적 — 둘을 한 번에 물어본다.
  const [dispatchRes, linkRes] = await Promise.all([
    orders.length > 0
      ? (client as any)
          .from("dispatches")
          .select("order_id")
          .in(
            "order_id",
            orders.map((o) => o.id)
          )
      : Promise.resolve({ data: [], error: null }),
    quotes.length > 0
      ? (client as any)
          .from("orders")
          // 🔴 **상태로 좁히지 않는다** — 이미 운송이 끝난 오더도 「그 견적에는 오더가
          //    있다」는 뜻이다. 좁히면 완료된 건의 견적이 다시 「접수」 카드로 뜬다.
          .select("quote_id")
          .in(
            "quote_id",
            quotes.map((q) => q.id)
          )
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (dispatchRes?.error) return { rows: [], error: dispatchRes.error.message };
  if (linkRes?.error) return { rows: [], error: linkRes.error.message };

  const dispatchedOrderIds = new Set(
    ((dispatchRes?.data || []) as any[]).map((d) => d.order_id).filter(Boolean)
  );
  const linkedQuoteIds = new Set(
    ((linkRes?.data || []) as any[]).map((o) => o.quote_id).filter(Boolean)
  );

  const rows: PortalPendingRow[] = [];

  for (const o of orders) {
    if (dispatchedOrderIds.has(o.id)) continue;
    rows.push({
      id: `pending-order:${o.id}`,
      order_id: null,
      dispatch_status: null,
      cancel_reason: null,
      pickup_confirmed: null,
      delivery_confirmed: null,
      issue_occurred: null,
      issue_reason: null,
      created_at: o.created_at ?? null,
      updated_at: null,
      quote_no: null,
      orders: {
        order_no: o.order_no ?? null,
        origin: o.origin ?? null,
        destination: o.destination ?? null,
        requested_pickup_at: o.requested_pickup_at ?? null,
        item: o.item ?? null,
        vehicle_type: o.vehicle_type ?? null,
        loading_type: o.loading_type ?? null,
        collection_method: o.collection_method ?? null,
        billing_cycle: o.billing_cycle ?? null,
        direct_collection_point: o.direct_collection_point ?? null,
      },
    });
  }

  for (const q of quotes) {
    if (linkedQuoteIds.has(q.id)) continue;
    rows.push({
      id: `pending-quote:${q.id}`,
      order_id: null,
      dispatch_status: null,
      cancel_reason: null,
      pickup_confirmed: null,
      delivery_confirmed: null,
      issue_occurred: null,
      issue_reason: null,
      // 🔴 **접수 시각은 화주가 승인한 때다** — `created_at`(견적을 만든 때)으로만
      //    두면 며칠 전에 낸 견적을 오늘 승인한 건이 목록 한참 아래에 묻힌다.
      //    담당자가 직접 「수주」로 바꾼 건은 그 흔적이 없으므로 `created_at` 으로 떨어진다.
      created_at: q.approved_by_customer_at ?? q.created_at ?? null,
      updated_at: null,
      quote_no: q.quote_no ?? null,
      orders: {
        order_no: null,
        origin: q.origin ?? null,
        destination: q.destination ?? null,
        requested_pickup_at: q.requested_pickup_at ?? null,
        item: q.item ?? null,
        vehicle_type: q.vehicle_type ?? null,
        loading_type: q.loading_type ?? null,
        collection_method: q.collection_method ?? null,
        billing_cycle: q.billing_cycle ?? null,
        direct_collection_point: q.direct_collection_point ?? null,
      },
    });
  }

  return { rows, error: null };
}

/**
 * 진짜 배차 행과 가상 행을 **접수 시각 내림차순**으로 합친다.
 *
 * 🔴 화면마다 각자 합치지 말 것 — 홈은 상위 5건만 자르므로 정렬이 갈리면 「홈에 뜨는
 *    5건」과 「조회 맨 위 5건」이 서로 다른 건이 된다.
 */
export function mergePortalPendingRows<T extends { created_at?: string | null }>(
  rows: T[],
  pending: PortalPendingRow[]
): (T | PortalPendingRow)[] {
  if (pending.length === 0) return rows;
  return [...rows, ...pending].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}
