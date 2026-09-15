import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import { LoginAttemptTracker } from "@/lib/staffLogin";
import {
  isQuoteShareExpired,
  matchesPhoneLast4,
  SHARE_NOT_FOUND_MESSAGE,
  SHARE_EXPIRED_MESSAGE,
  SHARE_FAILED_MESSAGE,
  SHARE_LOCKED_MESSAGE,
} from "@/lib/quoteShare";

// 로그인 없이 견적서를 여는 유일한 경로 (2026-09-15 · 사용자 지시).
//
// 🔴 **이 라우트는 「공개」다 — 누구나 부를 수 있다.** 그래서 지키는 것이 셋이다.
//    ① 토큰이 맞아야 하고 ② 연락처 뒤 4자리가 맞아야 하고 ③ 유효기간 안이어야 한다.
//    판단은 전부 `lib/quoteShare.ts` 가 하고 여기는 조립만 한다.
//
// 🔴 **POST 다.** GET 으로 두면 토큰과 뒤 4자리가 **주소창·서버 로그·리퍼러**에
//    남는다. 주소(토큰)만으로는 아무것도 안 내려가는 것이 이 설계의 핵심이다.
//
// 🔴 **`quotes` 에 anon SELECT 정책을 만들지 말 것**(원칙 3번과 같은 결) —
//    그 순간 뒤 4자리 확인이 무의미해지고 **모든 견적이 열린다.**
//    service_role 로만 읽는다.
//
// 🔴 **내려보내는 필드를 늘리지 말 것.** 화주가 봐야 하는 것만 있다 —
//    차주 지급액·마진·정산 내부값은 **한 칸도 없다**(원칙 42번).
//    `select("*")` 로 바꾸면 그 순간 전부 새어 나간다.
export const dynamic = "force-dynamic";

/**
 * 뒤 4자리를 두드리는 것을 늦춘다.
 *
 * 🔴 **4자리는 10,000 가지뿐이다** — 토큰을 이미 아는 사람에게는 벽이 아니라
 *    과속방지턱이다(32차 로그인 제한과 같은 성격이고 같은 부품을 쓴다).
 *    진짜 방어선은 토큰의 추측 불가능성이다.
 * ⚠️ 값이 프로세스 메모리에만 있어 Vercel 처럼 인스턴스가 여럿인 환경에서는
 *    완벽하지 않다. 표를 만들지 않은 이유는 32차와 같다(IP 를 저장하면 처리방침
 *    제2조에 항목을 더해야 한다) — 여기서는 **토큰을 키로** 센다.
 */
const attempts = new LoginAttemptTracker();

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const last4 = typeof body.last4 === "string" ? body.last4 : "";
  if (!token) {
    return NextResponse.json({ error: SHARE_NOT_FOUND_MESSAGE }, { status: 404 });
  }

  if (attempts.isLocked(token)) {
    return NextResponse.json({ error: SHARE_LOCKED_MESSAGE }, { status: 429 });
  }

  const admin = createServiceClient(url, serviceKey);

  // 🔴 필드 목록을 늘리지 말 것 — 위 주석 참고.
  const { data: quote } = await admin
    .from("quotes")
    .select(
      "id,quote_no,created_at,origin,destination,distance_km,vehicle_type,body_type,item," +
        "trip_type,transport_time,waiting_minutes,waypoint_count,requested_pickup_at," +
        "requested_dropoff_at,base_fare,surcharge_amount,discount_amount,final_amount," +
        "selected_options,notes,collection_method,direct_collection_point,billing_cycle," +
        "guest_name,guest_phone,companies(name,contact_mobile)"
    )
    .eq("share_token", token)
    .maybeSingle();

  if (!quote) {
    // 🔴 실패를 세고 나서 응답한다 — 없는 토큰으로 두드리는 것도 같이 늦춘다.
    attempts.recordFailure(token);
    return NextResponse.json({ error: SHARE_NOT_FOUND_MESSAGE }, { status: 404 });
  }

  // 🔴 **유효기간을 뒤 4자리보다 먼저 본다** — 기간이 지난 건은 번호가 맞아도
  //    열리면 안 되고, 「기간이 지났다」는 알려 줘야 담당자에게 문의할 수 있다.
  if (isQuoteShareExpired((quote as any).created_at)) {
    return NextResponse.json({ error: SHARE_EXPIRED_MESSAGE }, { status: 410 });
  }

  // 🔴 문자를 받은 그 번호여야 한다 — 우선순위가 `send-quote-sms` 와 **같아야** 한다.
  const phone: string | null =
    (quote as any).companies?.contact_mobile || (quote as any).guest_phone || null;
  if (!matchesPhoneLast4(phone, last4)) {
    attempts.recordFailure(token);
    return NextResponse.json({ error: SHARE_FAILED_MESSAGE }, { status: 403 });
  }

  attempts.clear(token);

  // 🔴 가산 항목 — 이것이 없으면 「조정」 줄이 가산액만큼 틀리게 나온다(36차 E장).
  //    `calcQuoteAdjustment()` 가 items 조회를 마친 뒤에 돌아야 한다.
  const { data: items } = await admin
    .from("quote_items")
    .select("id,item_name,amount")
    .eq("quote_id", (quote as any).id);

  // 🔴 **연락처를 응답에 담지 않는다** — 확인에 쓴 값이고 화면에 필요 없다.
  //    담으면 뒤 4자리를 맞힌 사람이 전체 번호를 가져간다.
  const { guest_phone, companies, ...rest } = quote as any;
  return NextResponse.json(
    { quote: { ...rest, company_name: companies?.name || null }, items: items || [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
