// 화주포털 웹 푸시 구독 등록·해지 (화주포털 B장)
//
// 🔴 **어느 계정의 기기인지는 세션 토큰으로만 정한다**(원칙 30번) — 클라이언트가
//    `customer_account_id` 를 같이 보내는 방식이면, 콘솔에서 남의 id 로 바꿔 보내
//    **그 사람 기기 목록에 내 기기를 끼워 넣을 수 있다.**
//    ⚠️ 관리자 쪽(`/api/admin/push-subscription`)은 **쿠키 세션**이지만 포털은
//    `localStorage` 세션이라 **`Authorization: Bearer`** 로 받는다 —
//    `/api/customer/order-request` 가 쓰는 그 방식 그대로다.
//
// 🔴 **`customer_push_subscriptions` 는 RLS on + 정책 0개라 service_role 로만 닿는다.**
//    화주포털 계정과 직원 계정이 둘 다 `authenticated` 롤이라 정책으로는 못 가른다.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServiceClient";

export const dynamic = "force-dynamic";

// 🔴 `ReturnType<typeof createClient>` 로 적지 말 것 — 그 함수는 제네릭이라
//    타입 인자를 안 주면 매개변수가 `never` 로 풀려서, **실제 클라이언트가 이 타입에
//    안 들어맞고** `.upsert({...})` 의 인자가 `never[]` 가 된다(TS2322·TS2353).
//    `createServiceClient` 는 인자 없는 보통 함수라 추론된 실제 타입이 그대로 온다.
type Ctx = {
  admin: ReturnType<typeof createServiceClient>;
  accountId: string;
};

/** 🔴 판별자는 문자열이다 — 이 저장소는 `strict: false` 라 참/거짓으로 안 좁혀진다. */
type CtxResult = { kind: "ok"; ctx: Ctx } | { kind: "error"; res: NextResponse };

async function resolve(req: Request): Promise<CtxResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return {
      kind: "error",
      res: NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 }),
    };
  }
  const admin = createServiceClient(url, serviceKey);

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return {
      kind: "error",
      res: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return {
      kind: "error",
      res: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }
  const { data: account } = await admin
    .from("customer_accounts")
    .select("id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (!account?.id) {
    return {
      kind: "error",
      res: NextResponse.json({ error: "계정 정보를 확인할 수 없습니다." }, { status: 403 }),
    };
  }
  return { kind: "ok", ctx: { admin, accountId: account.id as string } };
}

export async function POST(req: Request) {
  const r = await resolve(req);
  if (r.kind === "error") return r.res;
  const { admin, accountId } = r.ctx;

  let body: { endpoint?: unknown; p256dh?: unknown; auth?: unknown; userAgent?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  const p256dh = typeof body.p256dh === "string" ? body.p256dh.trim() : "";
  const auth = typeof body.auth === "string" ? body.auth.trim() : "";
  // 🔴 셋 중 하나라도 비면 발송이 조용히 실패한다 — 저장 단계에서 막는다.
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "구독 정보가 올바르지 않습니다." }, { status: 400 });
  }
  // 🔴 브라우저가 주는 주소만 받는다. 아무 주소나 받으면 서버가 남의 서버를 두드리는
  //    도구가 된다(SSRF).
  if (!/^https:\/\//.test(endpoint)) {
    return NextResponse.json({ error: "구독 주소가 올바르지 않습니다." }, { status: 400 });
  }

  const userAgent =
    typeof body.userAgent === "string"
      ? body.userAgent.slice(0, 300)
      : req.headers.get("user-agent")?.slice(0, 300) || null;

  // 🔴 **`on conflict (endpoint)` 다** — 같은 기기를 두 번 등록하면 알림이 두 번 온다.
  //    기기를 다른 담당자가 물려받는 경우도 있으므로 `customer_account_id` 를 갱신한다.
  //    ⚠️ 애플리케이션 사전조회로 대신하지 말 것(§7 — 동시 요청은 그것으로 못 막는다).
  const { error } = await admin.from("customer_push_subscriptions").upsert(
    {
      customer_account_id: accountId,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      failed_at: null,
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    // 🔴 `error` 를 버리지 말 것(원칙 55번) — 「알림이 안 온다」의 유일한 단서다.
    console.error("[customer push-subscription] 저장 실패:", error.message);
    return NextResponse.json({ error: "구독 저장에 실패했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const r = await resolve(req);
  if (r.kind === "error") return r.res;
  const { admin, accountId } = r.ctx;

  let endpoint = "";
  try {
    const body = await req.json();
    endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
  } catch {
    // 아래에서 걸린다
  }
  if (!endpoint) return NextResponse.json({ error: "구독 주소가 없습니다." }, { status: 400 });

  // 🔴 **본인 기기만 지운다** — endpoint 만으로 지우면 남의 기기 알림을 끌 수 있다.
  const { error } = await admin
    .from("customer_push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("customer_account_id", accountId);
  if (error) {
    console.error("[customer push-subscription] 해지 실패:", error.message);
    return NextResponse.json({ error: "구독 해지에 실패했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
