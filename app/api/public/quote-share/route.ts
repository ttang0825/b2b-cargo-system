import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import { LoginAttemptTracker } from "@/lib/staffLogin";
import {
  isQuoteShareExpired,
  SHARE_NOT_FOUND_MESSAGE,
  SHARE_EXPIRED_MESSAGE,
  SHARE_LOCKED_MESSAGE,
} from "@/lib/quoteShare";

// 로그인 없이 견적서를 여는 유일한 경로 (2026-09-15 · 사용자 지시).
//
// 🔴 **이 라우트는 「공개」다 — 누구나 부를 수 있다.** 지키는 것은 **둘**이다.
//    ① 토큰이 맞아야 하고 ② 유효기간 안이어야 한다.
//
// ⚠️ **연락처 뒤 4자리 확인은 2026-09-15 에 사용자 지시로 없앴다**
//    (*"뒤4자리 확인을 빼고 바로 링크를 확인할수 있으면 좋겠다"*).
//    🔴 **그러므로 지금은 링크를 아는 사람이 곧 열람 권한자다.** 토큰의 추측
//    불가능성(22자 base62 ≈ 131비트)이 **유일한 방어선**이고, 문자가 전달되면
//    받은 사람도 그대로 열 수 있다. 🔴 **되살리려면 사용자에게 먼저 물을 것** —
//    한 번 뺀 것을 말없이 되돌리면 「왜 갑자기 번호를 묻느냐」가 된다.
//
// 🔴 **POST 로 남겨 둔다.** 4자리 확인이 없어진 뒤에도 그대로인 이유가 둘이다 —
//    ① 토큰이 **서버 로그·리퍼러**에 덜 남고 ② **주소를 여는 것만으로는 HTML 에
//    견적 내용이 실리지 않는다**(링크 미리보기 봇·크롤러가 받아 가는 것을 막는다).
//    🔴 GET 으로 바꾸거나 화면을 서버 컴포넌트로 만들면 그 성질이 사라진다.
//
// 🔴 **`quotes` 에 anon SELECT 정책을 만들지 말 것**(원칙 3번과 같은 결) —
//    그 순간 **토큰 없이도 모든 견적이 열린다.** service_role 로만 읽는다.
//
// 🔴 **내려보내는 필드를 늘리지 말 것.** 화주가 봐야 하는 것만 있다 —
//    차주 지급액·마진·정산 내부값은 **한 칸도 없다**(원칙 42번).
//    `select("*")` 로 바꾸면 그 순간 전부 새어 나간다.
export const dynamic = "force-dynamic";

/**
 * 없는 토큰을 반복해서 두드리는 것을 늦춘다.
 *
 * 🔴 **4자리 확인이 없어진 지금은 이것이 유일한 보조 장치다** — 토큰을 무작위로
 *    맞히는 것은 어차피 불가능하지만(131비트), 자동화가 초당 수천 번 두드리는 것을
 *    막아 **로그와 DB 부하**를 줄인다. 32차 로그인 제한과 같은 부품이다.
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
  if (!token) {
    return NextResponse.json({ error: SHARE_NOT_FOUND_MESSAGE }, { status: 404 });
  }

  if (attempts.isLocked(token)) {
    return NextResponse.json({ error: SHARE_LOCKED_MESSAGE }, { status: 429 });
  }

  const admin = createServiceClient(url, serviceKey);

  // 🔴 **컬럼 이름을 짐작하지 말 것 — `quotes` 는 조건값을 `selected_options`(jsonb)에
  //    담는다.** 처음 쓸 때 `body_type`·`trip_type`·`transport_time`·`waiting_minutes`·
  //    `waypoint_count` 다섯을 적었는데 **`quotes` 에는 그런 컬럼이 없었다**(그 값들은
  //    전부 `selected_options` 안의 한글 키다). PostgREST 가 42703 을 돌려줬고,
  //    아래에서 `error` 를 안 받고 있어서 그것이 **「견적서를 찾을 수 없습니다」(404)**
  //    로 둔갑했다 — 사용자가 「뒤 4자리 확인에서 오류가 난다」로 신고한 것의 정체다.
  //    🔴 실제 컬럼 목록은 `_verify.sql` ⑯ 이 찍는다. **거기서 확인하고 적을 것.**
  // 🔴 필드 목록을 **늘리지 말 것** — `quotes` 에는 `expected_driver_payout`·
  //    `expected_commission` 처럼 **화주가 보면 안 되는 내부 값**이 함께 있다.
  //    🔴 `select("*")` 로 바꾸면 그 두 칸이 그대로 나간다.
  const { data: quote, error: quoteError } = await admin
    .from("quotes")
    .select(
      "id,quote_no,created_at,origin,destination,distance_km,vehicle_type,tonnage,item," +
        "load_type,unload_type,requested_pickup_at,requested_dropoff_at," +
        "base_fare,surcharge_amount,discount_amount,final_amount," +
        "selected_options,notes,collection_method,direct_collection_point,billing_cycle," +
        "guest_name,companies(name)"
    )
    .eq("share_token", token)
    .maybeSingle();

  // 🔴 **`error` 를 버리지 말 것**(원칙 55번) — 버리면 조회 실패가 「없는 견적」과
  //    구분되지 않아 원인을 짚을 단서가 하나도 안 남는다. 화주에게는 같은 문구를
  //    보여주되(토큰의 존재 여부를 알려주지 않는다) **서버 로그에는 남긴다.**
  if (quoteError) {
    console.error("[quote-share] 견적 조회 실패:", quoteError.message);
    return NextResponse.json({ error: SHARE_NOT_FOUND_MESSAGE }, { status: 500 });
  }

  if (!quote) {
    // 🔴 실패를 세고 나서 응답한다 — 없는 토큰으로 두드리는 것도 같이 늦춘다.
    attempts.recordFailure(token);
    return NextResponse.json({ error: SHARE_NOT_FOUND_MESSAGE }, { status: 404 });
  }

  // 🔴 **유효기간이 지나면 막는다**(사용자 확정) — 「기간이 지났다」는 알려 줘야
  //    담당자에게 문의할 수 있다. 기준은 견적서가 인쇄하는 것과 같은 값이다.
  if (isQuoteShareExpired((quote as any).created_at)) {
    return NextResponse.json({ error: SHARE_EXPIRED_MESSAGE }, { status: 410 });
  }

  attempts.clear(token);

  // 🔴 가산 항목 — 이것이 없으면 「조정」 줄이 가산액만큼 틀리게 나온다(36차 E장).
  //    `calcQuoteAdjustment()` 가 items 조회를 마친 뒤에 돌아야 한다.
  //    🔴 여기서도 `error` 를 받는다(원칙 55번) — 버리면 가산 항목이 조용히 빠져
  //    **「조정」 줄이 가산액만큼 틀리게** 나온다. 조회가 실패하면 그 견적서를
  //    아예 보여주지 않는 편이 낫다(틀린 금액을 보여주는 것보다).
  const { data: items, error: itemsError } = await admin
    .from("quote_items")
    .select("id,item_name,amount")
    .eq("quote_id", (quote as any).id);
  if (itemsError) {
    console.error("[quote-share] 가산 항목 조회 실패:", itemsError.message);
    return NextResponse.json({ error: SHARE_NOT_FOUND_MESSAGE }, { status: 500 });
  }

  // 🔴 **연락처를 응답에 담지 않는다** — 화면에 필요 없고, 링크만 있으면 열리는
  //    지금은 담는 순간 **전화번호가 링크와 함께 퍼진다.** select 에서부터 뺐다.
  const { companies, ...rest } = quote as any;
  return NextResponse.json(
    { quote: { ...rest, company_name: companies?.name || null }, items: items || [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
