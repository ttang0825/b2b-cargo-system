// 웹 푸시 구독 등록·해지 (38차 B장)
//
// 🔴 **어느 직원의 기기인지는 쿠키 세션으로만 정한다**(원칙 30번) — 클라이언트가
//    `staff_id` 를 같이 보내는 방식이면, 콘솔에서 남의 id 로 바꿔 보내 **그 사람 기기
//    목록에 내 기기를 끼워 넣을 수 있다.**
//
// 🔴 **role 을 가르지 않는다.** 사용자 확정이 「직원 전원 같은 알림」이라 재직 중인
//    직원이면 누구나 등록한다(`getCurrentStaff()` 가 이미 재직 여부를 본다).
//    🔴 여기에 `role === "admin"` 체크를 넣지 말 것 — 넣으면 staff 는 알림을 못 받는다.
//
// 🔴 **`push_subscriptions` 는 RLS on + 정책 0개라 service_role 로만 닿는다**(원칙 3번의 결).
//    화주포털 계정과 직원 계정이 둘 다 `authenticated` 롤이라 정책으로는 못 가른다.

import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { createServiceClient } from "@/lib/supabaseServiceClient";

export const dynamic = "force-dynamic";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key);
}

export async function POST(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const admin = service();
  if (!admin) {
    return NextResponse.json({ error: "서버에 SUPABASE_SERVICE_ROLE_KEY 가 설정되어 있지 않습니다." }, { status: 500 });
  }

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
    typeof body.userAgent === "string" ? body.userAgent.slice(0, 300) : req.headers.get("user-agent")?.slice(0, 300) || null;

  // 🔴 **`on conflict (endpoint)` 다** — 같은 기기를 두 번 등록하면 알림이 두 번 온다.
  //    기기를 다른 직원이 물려받는 경우도 있으므로 `staff_id` 를 갱신한다.
  //    ⚠️ 애플리케이션 사전조회로 대신하지 말 것(§7 — 동시 요청은 그것으로 못 막는다).
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      staff_id: staff.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      // 다시 등록하면 옛 실패 기록은 지운다
      failed_at: null,
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    // 🔴 `error` 를 버리지 말 것(원칙 55번) — 「알림이 안 온다」의 유일한 단서다.
    console.error("[push-subscription] 저장 실패:", error.message);
    return NextResponse.json({ error: "구독 저장에 실패했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const admin = service();
  if (!admin) return NextResponse.json({ error: "서버 설정이 없습니다." }, { status: 500 });

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
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("staff_id", staff.id);
  if (error) {
    console.error("[push-subscription] 해지 실패:", error.message);
    return NextResponse.json({ error: "구독 해지에 실패했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
