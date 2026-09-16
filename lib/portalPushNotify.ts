// ─────────────────────────────────────────────────────────────────────────────
// 화주포털 웹 푸시 — **발송 정의처** (화주포털 B장)
//
// 🔴 **여기가 화주 쪽 유일한 발송처다.** 부르는 곳이 여럿(견적 제출 · 배차 상태를
//    바꾸는 화면 넷)이라 각자 만들면 문구와 실패 처리가 갈린다(38차 `lib/pushNotify.ts` ·
//    35차 `marginCalc` · 36차 `receivableCalc` 와 같은 결).
//
// 🔴 **직원용(`lib/pushNotify.ts`)과 표가 다르다** — `customer_push_subscriptions`.
//    합치지 말 것(마이그레이션 머리말에 사유가 있다).
//
// 🔴 **알림 본문에 고객 정보를 넣지 말 것** — 폰 **잠금화면**에 그대로 뜨고 옆사람이
//    본다(38차 0-4 와 같은 규칙). 화주 본인 폰이라도 잠금화면은 남이 본다.
//
//      ❌  견적 도착 — 서울 강남 → 부산 5톤 480,000원
//      ✅  새 견적서가 도착했습니다            ← 눌러서 화면에서 확인
//
//    🔴 담을 수 있는 것은 **무슨 일이 있었는가**뿐이다. 구간·금액·품목·차주·상호를
//    넣지 말 것이고, 🔴 **「화주가 편하도록」을 이유로 넓히지 말 것.**
// ─────────────────────────────────────────────────────────────────────────────

import { createServiceClient } from "@/lib/supabaseServiceClient";
import { sendWebPush } from "@/lib/webPush";

/**
 * 알릴 사건. 🔴 **A장의 `PortalAlertKind`(화면 안 알림)와 다른 것이다** —
 * 그쪽은 「무엇이 바뀌었나」를 세는 것이고 이쪽은 **「무슨 일이 있었나」**다.
 * 🔴 **`lib/portalAlert.ts` 를 import 하지 말 것** — 그 모듈은 소리(`alertCore`)를
 *    끌고 오고, 라벨도 「견적 업데이트」라 푸시에는 맞지 않는다.
 *
 * 🔴 **사건은 셋뿐이다**(사용자 확정 2026-09-16 저녁 — *「화주포탈은 상차완료,
 *    하차완료, 공지사항 알림도 빼자. 견적을 받을때, 배차완료, 운송완료 시에만
 *    알림이 가게 설정」*). 그날 낮의 첫 확정은 *「견적과 배차,운송 정산만」* 이라
 *    다섯이었는데, **저녁에 사용자가 더 좁혔다.**
 *
 *    빠진 것과 그 이유 —
 *      공지사항        전체 공지라 **모든 화주 폰이 한꺼번에** 울린다(처음부터 없었다)
 *      정산(`invoice_confirmed`)  *「화주포털 알림중 정산관련해서는 알림이 안뜨는게
 *                      좋겠다」* — 세금계산서 발행완료 · 화주입금완료 · 차주지급완료
 *      상차완료·하차완료  위 저녁 확정. 운송 도중의 중간 보고라 폰을 울릴 일이 아니다
 *
 *    🔴 **되살리지 말 것** — 화면 안 알림(`lib/portalAlert.ts`)에서도 정산·공지를
 *    같이 없앴으므로, 푸시만 되살리면 **폰으로는 오는데 화면에는 안 뜨는** 상태가 된다.
 */
export type PortalPushEvent = "quote_submitted" | "dispatch_confirmed" | "transport_completed";

/** 🔴 **무슨 일이 있었는가만** 적는다. 금액·구간·상호·차주는 넣지 않는다. */
const PORTAL_PUSH_MESSAGES: Record<PortalPushEvent, { title: string; url: string }> = {
  quote_submitted: { title: "새 견적서가 도착했습니다", url: "/customer/quotes" },
  dispatch_confirmed: { title: "배차가 확정되었습니다", url: "/customer/dispatches" },
  transport_completed: { title: "운송이 완료되었습니다", url: "/customer/dispatches" },
};

export const PORTAL_PUSH_EVENTS = Object.keys(PORTAL_PUSH_MESSAGES) as PortalPushEvent[];

export function isPortalPushEvent(v: unknown): v is PortalPushEvent {
  return typeof v === "string" && (PORTAL_PUSH_EVENTS as string[]).includes(v);
}

/**
 * 🔴 **접수·저장이 푸시 때문에 막히면 안 된다.** 그래서 상한을 둔다 —
 *    푸시 서비스가 느리거나 안 받아도 원래 동작이 그만큼 늦어질 뿐 실패하지 않는다.
 *
 * 🔴 **`await` 없이 띄워 두면 안 된다** — 이 코드는 서버(Vercel 함수) 안이고,
 *    서버리스 함수는 응답을 돌려준 뒤 **얼어붙어서** 떠 있는 약속이 끝나지 않는다
 *    (38차 B장이 실제로 겪었다). 짧게 기다리되 **어떤 경우에도 던지지 않는다.**
 */
const SEND_BUDGET_MS = 3000;

async function sendToCompany(companyId: string, event: PortalPushEvent): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // 🔴 VAPID 가 아직 없는 배포본이 반드시 생긴다(코드가 먼저 나간다) —
  //    그때 조용히 아무것도 안 하는 것이 맞다. 원래 동작은 그대로 성공해야 한다.
  if (!url || !serviceKey || !process.env.VAPID_PRIVATE_KEY) return;

  const admin = createServiceClient(url, serviceKey);

  // 🔴 **회사는 그때그때 조인해서 정한다** — 구독 표에 `company_id` 를 복사해 두면
  //    담당자가 다른 화주로 옮겨졌을 때 **남의 회사 소식이 그 폰으로 간다.**
  // 🔴 `error` 를 받는다(원칙 55번) — 버리면 「알림이 안 온다」의 원인을 영영 못 찾는다.
  const { data, error } = await admin
    .from("customer_push_subscriptions")
    .select("id, endpoint, p256dh, auth, customer_accounts!inner(company_id)")
    .eq("customer_accounts.company_id", companyId);
  if (error) {
    console.error("[portalPush] 구독 조회 실패:", error.message);
    return;
  }
  const subs = (data || []) as unknown as {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }[];
  if (subs.length === 0) return;

  const meta = PORTAL_PUSH_MESSAGES[event];
  const payload = JSON.stringify({
    title: meta.title,
    body: "눌러서 확인해 주세요",
    url: meta.url,
    // 같은 종류가 여러 개 쌓이지 않게 브라우저가 겹쳐 준다
    tag: `portal-${event}`,
  });

  const results = await Promise.all(
    subs.map(async (s) => ({ id: s.id, result: await sendWebPush(s, payload) }))
  );

  // 🔴 404·410 이면 그 행을 지운다 — 기기를 바꾸거나 앱을 지운 것이라 계속 두면
  //    발송할 때마다 실패가 쌓인다.
  const gone = results.filter((r) => r.result.kind === "gone").map((r) => r.id);
  // 🔴 그 밖의 오류는 `failed_at` 만 찍고 남긴다 — 일시적 장애로 구독을 버리면
  //    화주가 다시 눌러야 한다.
  const failed = results.filter((r) => r.result.kind === "error").map((r) => r.id);
  const ok = results.filter((r) => r.result.kind === "ok").map((r) => r.id);

  const now = new Date().toISOString();
  // 🔴 PostgREST 빌더는 thenable 이지 `Promise` 가 아니다 — `await` 로 감싸야
  //    `Promise.all` 의 타입에 맞는다.
  const writes: Promise<unknown>[] = [];
  if (gone.length)
    writes.push((async () => admin.from("customer_push_subscriptions").delete().in("id", gone))());
  if (failed.length)
    writes.push(
      (async () =>
        admin.from("customer_push_subscriptions").update({ failed_at: now }).in("id", failed))()
    );
  if (ok.length)
    writes.push(
      (async () =>
        admin.from("customer_push_subscriptions").update({ last_success_at: now }).in("id", ok))()
    );
  await Promise.all(writes);

  for (const r of results) {
    if (r.result.kind === "error") {
      console.error(`[portalPush] 발송 실패 status=${r.result.status}: ${r.result.message}`);
    }
  }
}

/**
 * 그 화주의 등록 기기에 알린다.
 *
 * 🔴 **절대 던지지 않고, 절대 원래 동작을 막지 않는다.**
 * 🔴 **`companyId` 는 부르는 쪽이 DB 에서 다시 읽은 값이어야 한다** — 클라이언트가
 *    보낸 값을 그대로 넘기면 콘솔에서 남의 회사 id 로 바꿔 **그 회사 화주들에게
 *    알림을 쏠 수 있다**(원칙 30번).
 */
export async function notifyPortalPush(
  companyId: string | null | undefined,
  event: PortalPushEvent
): Promise<void> {
  if (!companyId) return; // 게스트(비회원) 오더에는 보낼 곳이 없다
  try {
    await Promise.race([
      sendToCompany(companyId, event),
      new Promise<void>((resolve) => setTimeout(resolve, SEND_BUDGET_MS)),
    ]);
  } catch (e) {
    console.error("[portalPush] 예상치 못한 오류:", e instanceof Error ? e.message : e);
  }
}
