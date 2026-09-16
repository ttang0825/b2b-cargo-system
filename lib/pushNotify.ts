// ─────────────────────────────────────────────────────────────────────────────
// 새 접수 웹 푸시 — **발송 정의처** (38차 B장)
//
// 🔴 **여기가 유일한 발송처다.** 부르는 곳이 셋(견적문의 · 화주신청 · 발주요청)이라
//    각자 만들면 문구와 실패 처리가 갈린다(35차 `marginCalc` · 36차 `receivableCalc` ·
//    PR #154 `autoCreateInvoice` 와 같은 결).
//
// 🔴 **알림 본문에 고객 정보를 넣지 말 것** — 폰 **잠금화면**과 데스크탑 **배너**에
//    그대로 뜨고 옆사람이 본다(38차 0-4).
//
//      ❌  새 견적문의 — 홍○○ (010-1234-5678) 서울 → 부산 5톤
//      ✅  새 견적문의 1건 · 위캐리 운송        ← 눌러서 화면에서 확인
//
//    🔴 넣을 수 있는 것은 **종류**뿐이다. 상호·담당자명·연락처·구간·금액·품목을 넣지
//    말 것이고, 🔴 **「담당자가 편하도록」을 이유로 넓히지 말 것** — 이 저장소는
//    public 이고 화면 캡처가 돌아다닌다.
// ─────────────────────────────────────────────────────────────────────────────

import { createServiceClient } from "@/lib/supabaseServiceClient";
import { sendWebPush } from "@/lib/webPush";
import { INTAKE_ALERTS, type IntakeKind } from "@/lib/adminIntakeAlert";

/**
 * 🔴 **접수가 푸시 때문에 막히면 안 된다.** 그래서 이 상한을 둔다 —
 *    푸시 서비스가 느리거나 안 받아도 접수 응답이 그만큼 늦어질 뿐 실패하지 않는다.
 *
 * ⚠️ **38차 지시서는 `await` 없는 fire-and-forget 을 지시했지만 그대로 하지 않았다.**
 *    이 코드는 **이미 서버(Vercel 함수) 안**이고, 서버리스 함수는 응답을 돌려준 뒤
 *    **얼어붙어서** 떠 있는 약속이 끝나지 않는다 — 그러면 **알림이 아예 안 나간다.**
 *    (지시서가 본보기로 든 PR #154 는 **브라우저**에서 서버 API 를 부르는 경우라
 *    사정이 다르다 — 그쪽은 브라우저가 계속 살아 있다.)
 *    그래서 **짧은 상한을 걸고 기다리되, 어떤 경우에도 던지지 않는다.**
 *    🔴 이 함수는 절대 거절(reject)하지 않는다 — 호출부가 `try` 로 안 감싸도 된다.
 */
const SEND_BUDGET_MS = 3000;

/** 잠금화면에 뜰 내용. 🔴 **종류와 경로뿐이다.** */
function buildPayload(kind: IntakeKind) {
  const meta = INTAKE_ALERTS[kind];
  return JSON.stringify({
    // 🔴 **말은 `INTAKE_ALERTS` 가 완성해서 준다** — 여기서 `새 …` 를 붙이면
    //    배너(`TopNav`)와 폰의 말이 갈린다.
    title: meta.title,
    body: "눌러서 확인해 주세요",
    url: meta.href,
    // 같은 종류의 알림이 여러 개 쌓이지 않게 브라우저가 겹쳐 준다
    tag: `intake-${kind}`,
  });
}

async function sendToAll(kind: IntakeKind): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // 🔴 VAPID 가 아직 등록되지 않은 배포본이 반드시 생긴다(코드가 먼저 나간다) —
  //    그때 조용히 아무것도 안 하는 것이 맞다. 접수는 그대로 성공해야 한다.
  if (!url || !serviceKey || !process.env.VAPID_PRIVATE_KEY) return;

  const admin = createServiceClient(url, serviceKey);
  // 🔴 **`error` 를 받는다**(원칙 55번) — 버리면 「알림이 안 온다」의 원인을 영영 못 찾는다.
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (error) {
    console.error("[pushNotify] 구독 조회 실패:", error.message);
    return;
  }
  const subs = data || [];
  if (subs.length === 0) return;

  const payload = buildPayload(kind);
  const results = await Promise.all(
    subs.map(async (s) => ({ id: s.id, result: await sendWebPush(s, payload) }))
  );

  // 🔴 **404·410 이면 그 행을 지운다** — 기기를 바꾸거나 앱을 지운 것이라 계속 두면
  //    발송할 때마다 실패가 쌓인다.
  const gone = results.filter((r) => r.result.kind === "gone").map((r) => r.id);
  // 🔴 **그 밖의 오류는 `failed_at` 만 찍고 남긴다** — 일시적 장애로 구독을 버리면
  //    담당자가 다시 눌러야 한다.
  const failed = results.filter((r) => r.result.kind === "error").map((r) => r.id);
  const ok = results.filter((r) => r.result.kind === "ok").map((r) => r.id);

  const now = new Date().toISOString();
  // 🔴 PostgREST 빌더는 thenable 이지 `Promise` 가 아니다 — `await` 로 감싸야
  //    `Promise.all` 의 타입에 맞는다.
  const writes: Promise<unknown>[] = [];
  if (gone.length) writes.push((async () => admin.from("push_subscriptions").delete().in("id", gone))());
  if (failed.length)
    writes.push((async () => admin.from("push_subscriptions").update({ failed_at: now }).in("id", failed))());
  if (ok.length)
    writes.push((async () => admin.from("push_subscriptions").update({ last_success_at: now }).in("id", ok))());
  await Promise.all(writes);

  for (const r of results) {
    if (r.result.kind === "error") {
      console.error(`[pushNotify] 발송 실패 status=${r.result.status}: ${r.result.message}`);
    }
  }
}

/**
 * 새 접수가 들어왔음을 직원 전원의 등록 기기에 알린다.
 *
 * 🔴 **절대 던지지 않고, 절대 접수를 막지 않는다.**
 * 🔴 **받는 사람을 고르지 않는다** — 사용자 확정은 「직원 전원 같은 알림」이다.
 *    역할별 분기·수신 설정 화면을 만들지 말 것(38차 0-3).
 */
export async function notifyNewIntake(kind: IntakeKind): Promise<void> {
  try {
    await Promise.race([
      sendToAll(kind),
      new Promise<void>((resolve) => setTimeout(resolve, SEND_BUDGET_MS)),
    ]);
  } catch (e) {
    // 🔴 여기까지 오면 안 되지만, 와도 접수는 성공해야 한다.
    console.error("[pushNotify] 예상치 못한 오류:", e instanceof Error ? e.message : e);
  }
}
