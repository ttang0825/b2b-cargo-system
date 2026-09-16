// 화주에게 웹 푸시를 보내는 자리 (화주포털 B장)
//
// 🔴 **원칙 53 번의 그 패턴이다.** 견적 상태·배차 상태를 바꾸는 코드는 **브라우저가
//    anon 키로 직접 update** 하는 화면 셋에 흩어져 있다(견적 상세 · 배차 상세 ·
//    배차 목록). 그것을 전부 서버 API 로 옮기는 대규모 리팩터링 대신, 각 지점 끝에서
//    이 라우트를 **fire-and-forget** 으로 한 번 부른다.
//    ⚠️ **여기서는 `await` 가 맞다** — 부르는 쪽이 **브라우저**라 응답을 돌려줄 때까지
//    함수가 살아 있다. 38차 B장이 얼어붙었던 것은 **서버가 서버 안에서** 띄운 경우다.
//
// 🔴 **회사를 클라이언트에서 받지 않는다**(원칙 30번) — `{kind, id}` 만 받고
//    **그 레코드를 다시 조회해서** 회사를 정한다. 안 그러면 콘솔에서 남의 회사 id 를
//    넣어 **그 회사 화주들 폰에 알림을 쏠 수 있다.**
//
// 🔴 **재직 직원만 부를 수 있다**(`getCurrentStaff()`). role 은 가르지 않는다 —
//    배차·견적을 다루는 사람이 staff 일 수 있다.

import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import { notifyPortalPush, isPortalPushEvent } from "@/lib/portalPushNotify";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "서버 설정이 없습니다." }, { status: 500 });
  const admin = createServiceClient(url, serviceKey);

  let body: { event?: unknown; source?: unknown; id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const event = body.event;
  const source = body.source;
  const id = typeof body.id === "string" ? body.id : "";
  if (!isPortalPushEvent(event) || !id) {
    return NextResponse.json({ error: "요청이 올바르지 않습니다." }, { status: 400 });
  }

  // 🔴 **회사는 여기서 다시 읽는다.** `source` 는 「어느 표에서 찾을지」일 뿐이고
  //    회사 값 자체는 클라이언트에서 오지 않는다.
  let companyId: string | null = null;
  if (source === "quote") {
    const { data, error } = await admin.from("quotes").select("company_id").eq("id", id).maybeSingle();
    if (error) console.error("[notify-portal-push] 견적 조회 실패:", error.message);
    companyId = (data?.company_id as string | null) ?? null;
  } else if (source === "dispatch") {
    // 배차에는 회사가 없다 — 오더를 거쳐야 한다.
    const { data, error } = await admin
      .from("dispatches")
      .select("orders(company_id)")
      .eq("id", id)
      .maybeSingle();
    if (error) console.error("[notify-portal-push] 배차 조회 실패:", error.message);
    companyId = ((data as any)?.orders?.company_id as string | null) ?? null;
  } else if (source === "invoice") {
    const { data, error } = await admin.from("invoices").select("company_id").eq("id", id).maybeSingle();
    if (error) console.error("[notify-portal-push] 정산 조회 실패:", error.message);
    companyId = (data?.company_id as string | null) ?? null;
  } else {
    return NextResponse.json({ error: "요청이 올바르지 않습니다." }, { status: 400 });
  }

  // 🔴 **게스트(비회원) 건이면 보낼 곳이 없다 — 오류가 아니다.**
  //    `invoices.company_id` 는 nullable 이고(§7) 개인고객 오더가 실제로 그렇다.
  if (!companyId) return NextResponse.json({ ok: true, skipped: "no-company" });

  // 🔴 여기서는 `await` 한다(맨 위 주석) — 던지지 않고 상한이 걸려 있다.
  await notifyPortalPush(companyId, event);
  return NextResponse.json({ ok: true });
}
