// ─────────────────────────────────────────────────────────────────────────────
// 화주 화면에서 **취소된 배차를 어떻게 보여줄지** — 규칙의 유일 정의처 (2026-09-17)
//
// 사용자 지시: *「배차가 확정된 이후 배차가 취소 되었을때 화주포털 배차운송조회에서
// 해당 배차목록이 사라지는게 아니라 접수 상태로 돌아가고 배차가 취소되었음이 표시가
// 되어야 할것 같다」*
//
// ⚠️ **이것이 하루 전 확정 (A)「감춘다」를 뒤집은 것이다.** 감췄던 이유는 이 목록이
//    오더가 아니라 **배차 단위**(`key={d.id}`)라 재배차하면 **같은 오더의 카드가 둘**이
//    되기 때문이었다. 뒤집으면서 그 문제가 그대로 돌아오므로 여기서 가른다 —
//
//    🔴 **살아 있는 배차가 이미 있는 오더의 취소 건은 감춘다.**
//       그 오더를 대표하는 것은 **새 배차 카드**다. 취소 카드를 같이 두면 화주가
//       **어느 것이 유효한지 알 수 없다**(그것이 (A)를 골랐던 이유였다).
//    🔴 **아직 새 배차가 없으면 보여준다** — 그때가 「접수 상태로 돌아가고 취소되었음이
//       표시되어야 하는」 바로 그 구간이다.
//    🔴 **같은 오더에 취소가 여러 건이면 가장 최근 것 하나만** 보여준다(두 번 펑크난
//       건이 카드 둘이 되면 화주에게는 같은 말이 두 번이다).
//
// 🔴 **「둘 다 보여주자」로 바꾸려면 이 파일만 고치면 된다** — 화면 둘이 같은 함수를
//    쓰므로 한쪽만 바뀌는 일이 없다(`lib/dispatchStage.ts` 가 세워 둔 규칙과 같은 결).
//
// 🔴 **형제 배차를 화면이 들고 있는 목록에서 찾지 말 것.** 조회 화면은 최근 100건,
//    홈은 5건만 받아오고 홈은 `운송완료`·`하차완료` 를 **아예 빼고** 받는다 —
//    그 안에서 찾으면 「재배차가 이미 끝났는데 취소 카드가 남는」 상태가 된다.
//    그래서 취소 건이 있을 때만 **DB 에 직접 한 번 더 물어본다**(평소에는 질의 0회).
// ─────────────────────────────────────────────────────────────────────────────

import { DISPATCH_STATUS_CANCELLED } from "@/lib/dispatchCancel";

type Row = {
  id: string;
  order_id?: string | null;
  dispatch_status?: string | null;
  created_at?: string | null;
};

/** 최소한의 질의 인터페이스 — 화면이 쓰는 클라이언트를 그대로 받는다(목으로 갈아끼우기 쉽다). */
type SiblingQuery = {
  from: (table: string) => any;
};

/**
 * 취소된 배차 중 **화주에게 보여줄 것만** 남긴다.
 *
 * 🔴 조회에 실패하면 **취소 건을 보여주는 쪽으로 떨어진다** — 감추는 쪽으로 떨어지면
 *    "왜 사라졌는지"를 아무도 모르고(원칙 55번의 그 자리), 중복 카드는 눈에 보이지만
 *    사라진 카드는 안 보인다.
 */
export async function filterCancelledForCustomer<T extends Row>(
  client: SiblingQuery,
  rows: T[]
): Promise<T[]> {
  const cancelled = rows.filter((r) => r.dispatch_status === DISPATCH_STATUS_CANCELLED);
  if (cancelled.length === 0) return rows;

  const orderIds = Array.from(
    new Set(cancelled.map((r) => r.order_id).filter(Boolean))
  ) as string[];

  // 🔴 같은 오더에 **살아 있는 배차**(취소가 아닌 것)가 있는지 DB 에 묻는다.
  //    RLS 가 이미 이 화주의 것만 내려준다.
  let redispatchedOrderIds = new Set<string>();
  if (orderIds.length > 0) {
    const { data, error } = await (client as any)
      .from("dispatches")
      .select("order_id")
      .in("order_id", orderIds)
      .neq("dispatch_status", DISPATCH_STATUS_CANCELLED);
    if (!error) {
      redispatchedOrderIds = new Set(
        (data || []).map((d: any) => d.order_id).filter(Boolean)
      );
    }
  }

  // 🔴 같은 오더의 취소 건 중 **가장 최근 것**만 남긴다.
  const newestCancelledIdByOrder = new Map<string, { id: string; at: string }>();
  for (const r of cancelled) {
    if (!r.order_id) continue;
    const at = r.created_at || "";
    const prev = newestCancelledIdByOrder.get(r.order_id);
    if (!prev || at > prev.at) newestCancelledIdByOrder.set(r.order_id, { id: r.id, at });
  }

  return rows.filter((r) => {
    if (r.dispatch_status !== DISPATCH_STATUS_CANCELLED) return true;
    // 오더를 모르는 건(있을 수 없지만)은 그대로 보여준다 — 조용히 지우지 않는다.
    if (!r.order_id) return true;
    if (redispatchedOrderIds.has(r.order_id)) return false;
    return newestCancelledIdByOrder.get(r.order_id)?.id === r.id;
  });
}
