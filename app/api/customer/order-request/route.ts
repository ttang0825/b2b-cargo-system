import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordConsents } from "@/lib/consent";

// 화주포털 발주요청 접수 — 20차에 클라이언트 직접 insert에서 서버 API로 옮겼다.
//
// 🔴 **왜 옮겼나.** `consents`는 RLS를 켜고 **정책을 하나도 만들지 않아** service_role
// 로만 쓸 수 있다(14차). 로그인한 화주라도 `authenticated` 롤로는 동의 기록을 남길 수
// 없다. 🔴 **이걸 해결하려고 `consents`에 authenticated INSERT 정책을 만들지 말 것** —
// 그 순간 로그인한 화주가 아무 내용의 동의 행이나 직접 써넣을 수 있게 되어, 이 표의
// 존재 이유(입증 자료)가 사라진다.
//
// ⚠️ `/quote`(14차)가 서버 API로 간 이유와는 다르다. 그쪽은 `public_quote_requests`에
// SELECT 정책이 없어 **방금 넣은 행의 id를 못 받는 것**이 문제였다. 이 화면은 로그인
// 세션이 있어 id는 받을 수 있지만 **`consents`에 쓸 권한이 없다.** 결론만 같다.
//
// ⚠️ 발주요청 저장 뒤의 "배송지 저장"(`customer_locations`)은 화면에 그대로 남겨두었다 —
// 그쪽은 RLS 정책이 있어 화주 본인이 직접 쓸 수 있고, 실패해도 접수 자체와 무관하다.
export const dynamic = "force-dynamic";

/** 화면이 그대로 저장하는 값들. 신원(회사·계정)은 여기서 받지 않는다 — 아래 참고. */
type Body = {
  agreed?: unknown;
  origin?: string | null;
  origin_sido?: string | null;
  origin_sigungu?: string | null;
  destination?: string | null;
  destination_sido?: string | null;
  destination_sigungu?: string | null;
  origin_company_name?: string | null;
  origin_contact_name?: string | null;
  origin_contact_phone?: string | null;
  loading_type?: string | null;
  // 27차 리뷰 4라운드 — 값은 `quotes`/`orders` 와 같은 문자열이다(라벨을 보내지 말 것)
  collection_method?: string | null;
  direct_collection_point?: string | null;
  dropoff_arrival_type?: string | null;
  destination_company_name?: string | null;
  destination_contact_name?: string | null;
  destination_contact_phone?: string | null;
  vehicle_type?: string | null;
  body_type?: string | null;
  load_condition?: string | null;
  unload_condition?: string | null;
  item_condition?: string | null;
  transport_time?: string | null;
  trip_type?: string | null;
  waiting_minutes?: number | null;
  waypoint_count?: number | null;
  item?: string | null;
  requested_pickup_at?: string | null;
  requested_dropoff_at?: string | null;
  notes?: string | null;
};

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 🔴 `company_id`·`requested_by`를 요청 바디에서 받지 않는다 — 원칙 30번.
  //    클라이언트가 보낸 회사 id를 그대로 믿으면 브라우저 콘솔에서 값만 바꿔
  //    **다른 회사 이름으로 발주요청을 넣을 수 있다.** 세션에서만 유도한다.
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
    .select("id,company_id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (!account?.company_id) {
    return NextResponse.json({ error: "계정 정보를 확인할 수 없습니다." }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 400 });
  }

  const originContactPhone = (body.origin_contact_phone || "").trim();
  const destinationContactPhone = (body.destination_contact_phone || "").trim();

  // 🔴 화면 검증만으로는 콘솔에서 우회된다(원칙 25번). 특히 이 두 값은 **제3자 개인정보**라
  //    동의 여부와 짝을 이룬다 — 동의만 받고 값이 비거나, 값만 있고 동의가 없으면 안 된다.
  if (!(body.origin || "").trim() || !(body.destination || "").trim()) {
    return NextResponse.json({ error: "출발지와 도착지를 입력해주세요." }, { status: 400 });
  }
  // ⚠️ 담당자 연락처는 **선택**이다(PR #103 리뷰 1번) — 25차에는 필수였는데, 화주가
  //    현장 담당자를 모르면 발주 자체를 못 넣었다. 값이 없으면 담당자가 전화로 확인한다.
  // 🔴 **동의(`agreed`) 게이트는 그대로 둔다** — 값이 하나라도 들어오면 제3자 개인정보이고,
  //    처리방침 제4조가 "발주 시점에 별도 동의를 받은 후에만"이라고 약속하고 있다(47차).
  if (!(body.item || "").trim()) {
    return NextResponse.json(
      { error: "품목을 입력해주세요. 무엇을 싣는지 알아야 차량을 정할 수 있습니다." },
      { status: 400 }
    );
  }
  if (body.agreed !== true) {
    return NextResponse.json(
      { error: "상·하차지 담당자 정보 제3자 제공에 동의해주셔야 접수할 수 있습니다." },
      { status: 400 }
    );
  }

  const basePayload: Record<string, unknown> = {
      company_id: account.company_id,
      requested_by: account.id,
      origin: body.origin,
      origin_sido: body.origin_sido || null,
      origin_sigungu: body.origin_sigungu || null,
      destination: body.destination,
      destination_sido: body.destination_sido || null,
      destination_sigungu: body.destination_sigungu || null,
      origin_company_name: body.origin_company_name || null,
      origin_contact_name: body.origin_contact_name || null,
      origin_contact_phone: originContactPhone,
      destination_company_name: body.destination_company_name || null,
      destination_contact_name: body.destination_contact_name || null,
      destination_contact_phone: destinationContactPhone,
      vehicle_type: body.vehicle_type,
      body_type: body.body_type || null,
      load_condition: body.load_condition || null,
      unload_condition: body.unload_condition || null,
      item_condition: body.item_condition || null,
      transport_time: body.transport_time || null,
      trip_type: body.trip_type || null,
      waiting_minutes: body.waiting_minutes ?? null,
      waypoint_count: body.waypoint_count ?? null,
      item: body.item || null,
      requested_pickup_at: body.requested_pickup_at || null,
      requested_dropoff_at: body.requested_dropoff_at || null,
      notes: body.notes || null,
      status: "대기중",
  };

  // 🔴 `.select("id")`가 있어야 동의 기록을 붙일 id를 받는다. 지우지 말 것.
  async function insertRequest(payload: Record<string, unknown>) {
    return admin.from("portal_order_requests").insert(payload).select("id").single();
  }

  // 🔴 `loading_type` 은 마이그레이션(`2026-08-27_portal_request_loading_type.sql`)이
  //    아직 반영되지 않은 배포본에서는 존재하지 않는다 — 코드가 먼저 배포되는 구간이
  //    반드시 생긴다. 그 구간에서 **발주 접수 전체가 막히면 안 되므로**, 컬럼 없음
  //    (Postgres 42703)이면 그 값만 빼고 한 번 더 시도한다(35차 `sms_logs.sender_phone`
  //    과 같은 방식). 마이그레이션이 반영된 뒤에는 첫 시도가 항상 성공한다.
  const loadingType = body.loading_type === "mixable" ? "mixable" : "exclusive";

  // 🔴 **정산방식·도착구분도 서버에서 다시 검증한다**(원칙 25번) — 화면이 라디오로만
  //    막으면 콘솔에서 아무 문자열이나 보낼 수 있고, 그러면 담당자 화면과
  //    `quotes` 로의 승계가 통째로 깨진다. 허용값이 아니면 **조용히 null 로 떨어뜨린다**
  //    (400 으로 막으면 배포 간극에서 접수 자체가 실패한다).
  // 🔴 **지급조건은 선착불일 때만 남긴다** — 주선사 정산에는 그 개념이 없다
  //    (`components/CollectionMethodInput.tsx` 가 관리자 화면에서 쓰는 규칙과 같다).
  const collectionMethod =
    body.collection_method === "broker" || body.collection_method === "driver_direct"
      ? body.collection_method
      : null;
  const directCollectionPoint =
    collectionMethod === "driver_direct" &&
    ["pickup", "dropoff", "undecided"].includes(body.direct_collection_point)
      ? body.direct_collection_point
      : null;
  const dropoffArrivalType =
    body.dropoff_arrival_type === "same_day" || body.dropoff_arrival_type === "next_day"
      ? body.dropoff_arrival_type
      : null;

  const settlementPayload = {
    collection_method: collectionMethod,
    direct_collection_point: directCollectionPoint,
    dropoff_arrival_type: dropoffArrivalType,
  };

  // 🔴 컬럼이 아직 없는 배포본을 위한 단계적 후퇴 — 위 `loading_type` 주석과 같은 이유다.
  //    ① 전부 → ② 정산방식 3개만 빼고 → ③ `loading_type` 까지 빼고.
  //    🔴 **발주 접수 전체가 막히는 것보다 그 값만 빠지는 편이 낫다.**
  const SETTLEMENT_COLS = /collection_method|direct_collection_point|dropoff_arrival_type/;
  let { data: inserted, error: insertError } = await insertRequest({
    ...basePayload,
    loading_type: loadingType,
    ...settlementPayload,
  });
  if (insertError && SETTLEMENT_COLS.test(insertError.message || "")) {
    ({ data: inserted, error: insertError } = await insertRequest({
      ...basePayload,
      loading_type: loadingType,
    }));
  }
  if (insertError && /loading_type/.test(insertError.message || "")) {
    ({ data: inserted, error: insertError } = await insertRequest(basePayload));
  }

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message || "발주 요청 접수 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  const { error: consentError } = await recordConsents(admin, {
    subjectType: "portal_order_request",
    subjectId: inserted.id,
    source: "customer_portal",
  });

  // 🔴 롤백 — Supabase JS에는 트랜잭션이 없다. 동의 기록이 실패했는데 접수 건만 남으면
  //    **동의 없이 제3자 개인정보를 받아둔 상태**가 되고, 그건 이 작업이 없애려던 바로
  //    그 상태다. 그래서 실패를 삼키지 않고 접수 건을 되돌린다(14차와 같은 방식).
  if (consentError) {
    await admin.from("portal_order_requests").delete().eq("id", inserted.id);
    return NextResponse.json(
      { error: "동의 기록 저장에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
