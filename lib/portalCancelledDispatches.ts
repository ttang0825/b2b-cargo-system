// ─────────────────────────────────────────────────────────────────────────────
// 화주 화면에서 **취소된 배차를 어떻게 보여줄지** — 규칙의 유일 정의처 (2026-09-17)
//
// 사용자 지시 ①: *「배차가 확정된 이후 배차가 취소 되었을때 화주포털 배차운송조회에서
// 해당 배차목록이 사라지는게 아니라 접수 상태로 돌아가고 배차가 취소되었음이 표시가
// 되어야 할것 같다」*
// 사용자 지시 ②(같은 날 · 배포본을 보고): *「오더에서 다시 배차접수를 하게 되면
// 화주포털에서 "배차취소,재배차 접수중" 뱃지가 사라지고 그냥 접수중으로 되는데 이때까지는
// 배차취소 뱃지가 남아있고 배차완료가 됐을때 사라지게 하자」*
//
// 🔴 **그래서 규칙 한 줄은 이것이다 — 취소 배지는 「취소된 순간부터 배차확정까지」 뜬다.**
//    취소된 배차 카드에도 뜨고, **재배차가 접수된 뒤에는 그 새 카드에 이어서** 뜬다.
//    배차가 확정되면(단계 1) 사라진다. ⚠️ 지시 ② 이전에는 **재배차가 접수되는 순간
//    배지가 사라졌다**(취소 카드를 감추는데 새 카드는 배지를 모르니까).
//    🔴 **「살아 있는 배차가 있으면 취소 이력을 안 보여준다」로 되돌리지 말 것.**
//
// 카드가 둘이 되는 것은 그대로 막는다 —
//    🔴 **살아 있는 배차가 이미 있는 오더의 취소 카드는 감춘다.**
//       그 오더를 대표하는 것은 **새 배차 카드**이고, 이제 그 카드가 취소 이력까지
//       말하므로 **정보가 사라지지 않는다**(감췄던 이유가 이것으로 해소된다).
//    🔴 **같은 오더에 취소가 여러 건이면 가장 최근 것 하나만** 보여준다(두 번 펑크난
//       건이 카드 둘이 되면 화주에게는 같은 말이 두 번이다).
//
// 🔴 **형제 배차를 화면이 들고 있는 목록에서 찾지 말 것.** 조회 화면은 최근 100건,
//    홈은 5건만 받아오고 홈은 `운송완료`·`하차완료` 를 **아예 빼고** 받는다 —
//    그 안에서 찾으면 ① 「재배차가 이미 끝났는데 취소 카드가 남는」 상태가 되고
//    ② **취소 카드가 목록 밖이면 새 카드가 이력을 영영 모른다.**
//    그래서 필요할 때만 **DB 에 직접 한 번 더 물어본다.**
//
// 🔴 **화면 둘이 같은 함수를 쓴다** — 한쪽만 고치면 「홈에는 배지가 뜨는데 조회에는
//    안 뜨는」 상태가 된다(`lib/dispatchStage.ts` 가 세워 둔 규칙과 같은 결).
// ─────────────────────────────────────────────────────────────────────────────

import { DISPATCH_STATUS_CANCELLED } from "@/lib/dispatchCancel";
import { getDispatchStage } from "@/lib/dispatchStage";

type Row = {
  id: string;
  order_id?: string | null;
  dispatch_status?: string | null;
  cancel_reason?: string | null;
  pickup_confirmed?: boolean | null;
  delivery_confirmed?: boolean | null;
  created_at?: string | null;
};

/** 최소한의 질의 인터페이스 — 화면이 쓰는 클라이언트를 그대로 받는다(목으로 갈아끼우기 쉽다). */
type SiblingQuery = {
  from: (table: string) => any;
};

/**
 * `order_id` → 그 오더의 **가장 최근 취소 사유 코드**(사유를 안 적었으면 `null`).
 * 🔴 **아직 배차확정 전인 살아 있는 배차가 있는 오더만 담는다** — 그래서 배차가
 *    확정되는 순간 배지가 저절로 사라진다(화면이 따로 지울 필요가 없다).
 */
export type PortalRedispatchMap = Map<string, string | null>;

export type PortalCancelView<T> = {
  rows: T[];
  redispatch: PortalRedispatchMap;
};

/**
 * 취소된 배차 중 **화주에게 보여줄 것만** 남기고, **재배차 접수 중인 오더의 취소 이력**을
 * 같이 돌려준다.
 *
 * 🔴 조회에 실패하면 **취소 건을 보여주는 쪽으로 떨어진다** — 감추는 쪽으로 떨어지면
 *    "왜 사라졌는지"를 아무도 모르고(원칙 55번의 그 자리), 중복 카드는 눈에 보이지만
 *    사라진 카드는 안 보인다.
 */
export async function filterCancelledForCustomer<T extends Row>(
  client: SiblingQuery,
  rows: T[]
): Promise<PortalCancelView<T>> {
  const cancelled = rows.filter((r) => r.dispatch_status === DISPATCH_STATUS_CANCELLED);
  // 🔴 **배차확정 전(단계 0)인 살아 있는 배차** — 이 카드가 취소 이력을 이어받는다.
  //    🔴 단계 판정은 `lib/dispatchStage.ts` 가 한다(`접수중` 문자열을 여기 적지 말 것 —
  //    `문제발생` 처럼 상태가 단계를 안 말해주는 값이 있다).
  const pending = rows.filter(
    (r) => r.dispatch_status !== DISPATCH_STATUS_CANCELLED && getDispatchStage(r) === 0
  );

  const askIds = Array.from(
    new Set([...cancelled, ...pending].map((r) => r.order_id).filter(Boolean))
  ) as string[];
  // 🔴 물어볼 것이 없으면 질의하지 않는다 — 전부 배차완료·운송완료인 흔한 경우에 0회다.
  if (askIds.length === 0) return { rows, redispatch: new Map() };

  // 🔴 같은 오더의 **형제 배차 전부**를 한 번에 받는다. RLS 가 이미 이 화주의 것만 내려준다.
  const { data, error } = await (client as any)
    .from("dispatches")
    .select("id,order_id,dispatch_status,cancel_reason,created_at")
    .in("order_id", askIds);
  // 🔴 실패하면 **아무것도 감추지 않고 아무 배지도 붙이지 않는다**(원칙 55번).
  if (error || !data) return { rows, redispatch: new Map() };

  const liveOrderIds = new Set<string>();
  const newestCancelByOrder = new Map<string, { at: string; reason: string | null }>();
  for (const d of data as any[]) {
    if (!d.order_id) continue;
    if (d.dispatch_status === DISPATCH_STATUS_CANCELLED) {
      const at = d.created_at || "";
      const prev = newestCancelByOrder.get(d.order_id);
      if (!prev || at > prev.at) {
        newestCancelByOrder.set(d.order_id, { at, reason: d.cancel_reason ?? null });
      }
    } else {
      liveOrderIds.add(d.order_id);
    }
  }

  const redispatch: PortalRedispatchMap = new Map();
  for (const r of pending) {
    if (!r.order_id) continue;
    const c = newestCancelByOrder.get(r.order_id);
    if (c) redispatch.set(r.order_id, c.reason);
  }

  // 🔴 같은 오더의 취소 건 중 **가장 최근 것**만 남긴다.
  //    🔴 **DB 가 아니라 `rows` 안에서 고른다** — DB 기준으로 고르면 그 행이 목록 밖일 때
  //    (홈은 5건만 받는다) **어느 카드도 안 남아 통째로 사라진다.**
  const newestCancelledIdByOrder = new Map<string, { id: string; at: string }>();
  for (const r of cancelled) {
    if (!r.order_id) continue;
    const at = r.created_at || "";
    const prev = newestCancelledIdByOrder.get(r.order_id);
    if (!prev || at > prev.at) newestCancelledIdByOrder.set(r.order_id, { id: r.id, at });
  }

  const filtered = rows.filter((r) => {
    if (r.dispatch_status !== DISPATCH_STATUS_CANCELLED) return true;
    // 오더를 모르는 건(있을 수 없지만)은 그대로 보여준다 — 조용히 지우지 않는다.
    if (!r.order_id) return true;
    if (liveOrderIds.has(r.order_id)) return false;
    return newestCancelledIdByOrder.get(r.order_id)?.id === r.id;
  });

  return { rows: filtered, redispatch };
}

/**
 * 이 카드에 **취소 배지를 띄울 것인가**, 띄운다면 **어느 사유로** 말할 것인가.
 *
 * 🔴 **화면에서 조건을 다시 적지 말 것** — 홈과 조회가 같은 말을 해야 한다.
 *    ① 취소된 카드 자체 → 그 카드의 사유
 *    ② 재배차가 접수 중(단계 0)인 카드 → 그 오더의 **가장 최근 취소** 사유
 *    ③ 그 밖 → `null`(배차가 확정되면 여기로 떨어져 배지가 사라진다)
 */
export function getPortalCancelNotice(
  row: Row,
  redispatch: PortalRedispatchMap
): { reason: string | null } | null {
  if (row.dispatch_status === DISPATCH_STATUS_CANCELLED) {
    return { reason: row.cancel_reason ?? null };
  }
  if (!row.order_id || !redispatch.has(row.order_id)) return null;
  return { reason: redispatch.get(row.order_id) ?? null };
}
