import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordConsents } from "@/lib/consent";

// 공개 견적 문의(`/quote`) 접수. **14차에 클라이언트 직접 insert에서 이 서버 API로 옮겼다.**
//
// 🔴 옮긴 이유: `public_quote_requests`에는 **INSERT 정책만 있고 SELECT 정책이 없어서**
// (원칙 3) anon 클라이언트가 직접 insert하면 **방금 넣은 행의 id를 돌려받을 수 없다.**
// 그러면 `consents.subject_id`를 채울 방법이 없다. service_role은 RLS를 우회하므로
// `.select("id")`로 id를 받아 동의 기록까지 한 번에 남길 수 있다.
// 부수 효과로 anon 직접 insert 지점이 하나 줄었다.
//
// 구조는 `app/api/apply-submit/route.ts`와 같은 모양으로 맞췄다.

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }

  const body = await req.json();
  const {
    name,
    phone,
    email,
    origin,
    origin_sido,
    origin_sigungu,
    destination,
    destination_sido,
    destination_sigungu,
    vehicle_type,
    item,
    pickup_loading_method,
    dropoff_loading_method,
    requested_pickup_at,
    notes,
    agreed,
    termsAgreed,
  } = body;

  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "성함(업체명)과 연락처를 입력해주세요." }, { status: 400 });
  }
  if (!origin?.trim() || !destination?.trim()) {
    return NextResponse.json({ error: "출발지와 도착지를 입력해주세요." }, { status: 400 });
  }
  // 🔴 화면에서 이미 막지만 서버에서도 확인한다(원칙 25번). 동의 없이 접수된 건이 남으면
  // 기록의 의미가 없고, 브라우저 콘솔에서 직접 호출하면 화면 검증은 우회된다.
  // 🔴 **게이트가 두 개다**(18차). 법 제22조 1항이 각각 구분해 받도록 하고 있어
  // 동의도 검증도 항목별로 따로 한다 — 한쪽만 확인하면 다른 쪽은 동의 없이 통과한다.
  // ⚠️ `!== true` **엄격 비교**여야 한다. `!x`로 쓰면 문자열 `"true"`나 `1`이 통과한다.
  if (termsAgreed !== true) {
    return NextResponse.json(
      { error: "이용약관에 동의해주셔야 문의를 접수할 수 있습니다." },
      { status: 400 }
    );
  }
  if (agreed !== true) {
    return NextResponse.json(
      { error: "개인정보 수집·이용에 동의해주셔야 문의를 접수할 수 있습니다." },
      { status: 400 }
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: inserted, error: insertError } = await admin
    .from("public_quote_requests")
    .insert({
      name,
      phone,
      email: email || null,
      origin,
      origin_sido: origin_sido || null,
      origin_sigungu: origin_sigungu || null,
      destination,
      destination_sido: destination_sido || null,
      destination_sigungu: destination_sigungu || null,
      vehicle_type: vehicle_type || null,
      item: item || null,
      pickup_loading_method: pickup_loading_method || null,
      dropoff_loading_method: dropoff_loading_method || null,
      requested_pickup_at: requested_pickup_at || null,
      notes: notes || null,
      status: "신규",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message || "문의 접수 중 오류가 발생했습니다." },
      { status: 400 }
    );
  }

  // 🔴 동의 기록. Supabase JS에는 트랜잭션이 없어서, 여기서 실패하면 **동의 없는 문의가
  // 남는다** — 그래서 방금 만든 행을 되돌린다. `approve-application`이 포털 계정 발급에
  // 실패했을 때 회사를 삭제하는 것과 같은 방식이다.
  // ⚠️ 저장 순서를 바꾸지 말 것: 원본 id가 있어야 동의를 붙일 수 있다.
  const { error: consentError } = await recordConsents(admin, {
    subjectType: "quote_request",
    subjectId: inserted.id,
    source: "/quote",
  });

  if (consentError) {
    await admin.from("public_quote_requests").delete().eq("id", inserted.id);
    return NextResponse.json(
      { error: "문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
