import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 화주 견적 승인 — 27차 리뷰(클로드디자인 신규 시안)에서 신설.
//
// 🔴 **DB 스키마를 바꾸지 않는다.** `quotes.status` 의 CHECK 다섯 값(상담중·견적제출·
//    수주·보류·실패)은 그대로이고, 이 라우트는 그중 `견적제출 → 수주` 전이만 한다.
//    담당자가 견적 상세에서 손으로 하던 것과 **같은 값**이라 관리자 화면·통계·이후
//    오더 생성 흐름이 전부 지금 그대로 돈다.
//
// 🔴 **운송오더(`orders`)를 여기서 만들지 않는다.** 시안 모달 문구가 *"정식 운송오더로
//    접수되어 담당자가 배차를 시작합니다"* 인데, 이 저장소에서 오더를 만드는 곳은
//    견적 상세의 「운송오더 생성」 하나뿐이고 거기서 담당자가 값을 손보며 만든다.
//    여기서 자동 생성하면 **같은 견적에 오더가 두 번 생길 수 있고**(담당자가 그 버튼을
//    또 누른다) 관리자 흐름을 화주가 건너뛰게 된다. 관리자 연동은 28차 조사 범위다.
//
// 🔴 **화주는 이 표를 직접 못 쓴다** — `quotes` 의 화주 정책은 SELECT 전용이다(50차 실측).
//    그래서 service_role 서버 API 다. `quotes` 에 화주 UPDATE 정책을 만드는 방식으로
//    되돌리지 말 것 — 그 순간 화주가 콘솔에서 금액·상태를 아무 값으로나 쓸 수 있다.
//
// 🔴 **`quote_id` 만 받고 회사는 세션에서 유도한다**(원칙 30번) — 바디로 회사 id 를 받으면
//    남의 회사 견적을 승인할 수 있다.
export const dynamic = "force-dynamic";

/** 승인 가능한 시작 상태 — 「견적 도착」 하나뿐이다 */
const APPROVABLE_FROM = "견적제출";
/** 승인 후 상태 — 「운송 확정」 */
const APPROVED_TO = "수주";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { data: account } = await admin
    .from("customer_accounts")
    .select("id,company_id,is_active")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (!account?.company_id || account.is_active === false) {
    return NextResponse.json({ error: "계정 정보를 확인할 수 없습니다." }, { status: 403 });
  }

  let body: { quote_id?: unknown };
  try {
    body = (await req.json()) as { quote_id?: unknown };
  } catch {
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 400 });
  }
  const quoteId = typeof body.quote_id === "string" ? body.quote_id.trim() : "";
  if (!quoteId) {
    return NextResponse.json({ error: "견적을 찾을 수 없습니다." }, { status: 400 });
  }

  // 🔴 화면 검증만으로는 콘솔에서 우회된다(원칙 25번). 소속·상태·금액을 **저장 직전에
  //    다시 조회해서** 확인한다(원칙 44번과 같은 결) — 화면이 들고 있는 값은 낡을 수 있다.
  const { data: quote, error: qErr } = await admin
    .from("quotes")
    .select("id,company_id,status,final_amount,quote_no")
    .eq("id", quoteId)
    .maybeSingle();
  if (qErr || !quote) {
    return NextResponse.json({ error: "견적을 찾을 수 없습니다." }, { status: 404 });
  }
  if (quote.company_id !== account.company_id) {
    return NextResponse.json({ error: "견적을 찾을 수 없습니다." }, { status: 404 });
  }
  if (quote.status !== APPROVABLE_FROM) {
    return NextResponse.json(
      { error: "이미 처리된 견적입니다. 화면을 새로고침해주세요." },
      { status: 409 }
    );
  }
  if (!quote.final_amount || Number(quote.final_amount) <= 0) {
    return NextResponse.json(
      { error: "견적 금액이 아직 확정되지 않았습니다. 담당자에게 문의해주세요." },
      { status: 400 }
    );
  }

  // 🔴 `updated_by` 는 `staff_accounts` 를 참조하는 컬럼이라 화주 계정 id 를 넣으면
  //    FK 위반이 난다 — 손대지 않는다(`updated_at` 은 트리거가 갱신).
  // 🔴 **승인 흔적 두 값을 같은 UPDATE 에서 쓴다**(2026-08-29 마이그레이션).
  //    따로 쓰면 상태만 바뀌고 흔적이 빠진 건이 생기고, 그러면 담당자가 화주 승인분과
  //    자기가 바꾼 건을 다시 구분할 수 없다 — 이 컬럼을 만든 이유가 사라진다.
  //    ⚠️ null 이 "담당자가 바꾼 것"을 뜻하므로, 실패했을 때 나중에 채워 넣지 말 것.
  const { error: upErr } = await admin
    .from("quotes")
    .update({
      status: APPROVED_TO,
      approved_by_customer_at: new Date().toISOString(),
      approved_by_account_id: account.id,
    })
    .eq("id", quoteId)
    // 경합 방지 — 그 사이 담당자가 상태를 바꿨으면 0행이 되어 아래에서 걸린다
    .eq("status", APPROVABLE_FROM);
  if (upErr) {
    return NextResponse.json({ error: "승인을 저장하지 못했습니다." }, { status: 500 });
  }

  const { data: after } = await admin
    .from("quotes")
    .select("status")
    .eq("id", quoteId)
    .maybeSingle();
  if (after?.status !== APPROVED_TO) {
    return NextResponse.json(
      { error: "이미 처리된 견적입니다. 화면을 새로고침해주세요." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, status: APPROVED_TO });
}
