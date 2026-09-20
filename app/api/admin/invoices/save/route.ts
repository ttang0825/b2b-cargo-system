import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { accrueRewardSafely } from "@/lib/rewardAccrue";

// 정산관리 상세의 메인 저장(상태/세금계산서/입금/차주지급) — 이전에는
// anon 클라이언트가 직접 update()했으나, 정산확정(잠금) 기능 도입으로
// "이 건이 잠겨있는지"를 서버에서 매번 새로 조회해 확인해야 해서 서버
// API로 옮김(클라이언트가 들고 있는 locked 값은 신선하지 않을 수 있어
// 믿을 수 없음 — 원칙 25번과 같은 이유). 정산방식 변경 등 다른 저장
// 지점은 이번 범위 밖(작업지시서 3-2 참고, 이 지점 하나만 옮기면 됨).
export const dynamic = "force-dynamic";

// 이 라우트로 수정 가능한 필드만 화이트리스트로 제한 — locked/confirmed_*
// 같은 필드는 여기서 절대 못 바꾸게(정산확정은 별도 API를 거쳐야 함)
const ALLOWED_FIELDS = [
  "status",
  "tax_invoice_issued",
  "tax_invoice_date",
  "payment_received",
  "payment_received_date",
  "driver_paid",
  "driver_paid_date",
  // 로드맵 ②-A: 신규 정산방식 필드 — 정산방식 변경(collection_method 등)과
  // 선착불 건의 주선수수료 입금 처리를 이 저장 경로로 통합(작업지시서 4-5,
  // 원칙 44번의 잠금검증 패턴 재사용). locked/confirmed_* 는 여전히 이
  // 화이트리스트 밖이라 이 API로 못 바꿈(정산확정은 별도 API로만 가능).
  "settlement_type",
  "collection_method",
  "billing_cycle",
  "direct_collection_point",
  "brokerage_fee_paid",
  "brokerage_fee_paid_at",
  "brokerage_fee",
  // 🔴 `brokerage_fee_payer` 는 35차 A-4 에 **화이트리스트에서 뺐다** — 화면에서
  //    「수수료 지급자」를 없앴고(수수료는 무조건 차주 부담) 그 컬럼은 과거 기록
  //    보존용 읽기 전용이다(원칙 45번). **다시 넣지 말 것.**
  "driver_direct_collection_amount",
  // 35차 A-5 — 선착불의 차주 수수료분 세금계산서. 화주쪽 `tax_invoice_issued` 와 다른 칸
  "driver_tax_invoice_issued",
  "driver_tax_invoice_date",
];

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { id, payload, lastKnownUpdatedAt, force, reason } = body as {
    id: string;
    payload: Record<string, any>;
    lastKnownUpdatedAt: string | null;
    force?: boolean;
    reason?: string;
  };

  if (!id || !payload || typeof payload !== "object") {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const cleanPayload: Record<string, any> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in payload) cleanPayload[key] = payload[key];
  }

  // 클라이언트가 들고 있던 locked 값이 아니라, 저장 직전 fresh하게 다시 조회
  const { data: current, error: fetchError } = await admin
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 });
  if (!current) return NextResponse.json({ error: "정산 건을 찾을 수 없습니다." }, { status: 404 });

  if (current.locked) {
    if (currentStaff.role !== "admin") {
      return NextResponse.json(
        { error: "확정(잠금)된 정산 건입니다. 관리자만 수정할 수 있습니다." },
        { status: 403 }
      );
    }
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "잠긴 건을 수정하려면 사유를 입력해야 합니다." }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from("invoices")
      .update({ ...cleanPayload, updated_by: currentStaff.id })
      .eq("id", id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

    const { error: logError } = await admin.from("invoice_amendment_logs").insert({
      invoice_id: id,
      staff_id: currentStaff.id,
      before_json: current,
      after_json: { ...current, ...cleanPayload },
      reason: reason.trim(),
    });
    if (logError) return NextResponse.json({ error: logError.message }, { status: 400 });

    const reward = await runRewardForPaymentChange(admin, currentStaff.id, id, current, cleanPayload);
    return NextResponse.json({ ok: true, reward });
  }

  // 잠기지 않은 일반 건 — 기존 lib/optimisticUpdate.ts와 동일한 낙관적 잠금 로직
  let query = admin.from("invoices").update({ ...cleanPayload, updated_by: currentStaff.id }).eq("id", id);
  if (!force) {
    query = lastKnownUpdatedAt
      ? query.eq("updated_at", lastKnownUpdatedAt)
      : query.is("updated_at", null);
  }
  const { data: updated, error: updateError } = await query.select("id");
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  if (!force && (!updated || updated.length === 0)) {
    return NextResponse.json({ conflict: true });
  }

  const reward = await runRewardForPaymentChange(admin, currentStaff.id, id, current, cleanPayload);
  return NextResponse.json({ ok: true, reward });
}

/**
 * 🔴 **입금 확인이 바뀐 순간이 리워드 적립·회수의 트리거다**(사용자 확정 — 운송완료가
 *    아니다. 미수금 상태에서 포인트가 먼저 나가면 안 된다).
 *
 * 🔴 **저장이 성공한 뒤에만 부른다** — 저장이 실패했는데 적립이 나가면 안 된다.
 * 🔴 **적립 실패가 입금확인을 막지 않는다** — `accrueRewardSafely` 는 던지지 않고
 *    3초 안에 못 끝나면 그냥 넘어간다. 무엇이 왜 안 됐는지는 응답의 `reward` 로
 *    돌아가고 정산 상세가 그것을 그대로 보여준다(담당자가 알 길이 그것뿐이다).
 * 🔴 **서버 안이라 `await` 한다** — 서버리스 함수는 응답 뒤 **얼어붙기** 때문에
 *    fire-and-forget 으로 두면 적립이 아예 안 나간다(38차가 웹 푸시에서 겪은 자리).
 * ⚠️ 값이 **안 바뀌었으면 아무것도 안 한다** — 다른 칸(세금계산서 등)만 고친 저장에
 *    적립을 태우면 UNIQUE 덕에 원장은 한 줄이지만 매번 쓸데없는 질의가 나간다.
 */
async function runRewardForPaymentChange(
  admin: any,
  staffId: string,
  invoiceId: string,
  current: Record<string, any>,
  cleanPayload: Record<string, any>
) {
  if (!("payment_received" in cleanPayload)) return undefined;
  const was = current.payment_received === true;
  const now = cleanPayload.payment_received === true;
  if (was === now) return undefined;

  const out = await accrueRewardSafely({
    admin,
    staffId,
    sourceType: "invoice",
    sourceId: invoiceId,
    // 🚨 해제 = **회수**다. 원본 적립행을 지우지 않고 `reversal` 한 줄을 넣는다.
    reverse: !now,
  });
  return out;
}
