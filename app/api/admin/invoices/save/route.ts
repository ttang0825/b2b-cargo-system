import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

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
  "brokerage_fee_payer",
  "driver_direct_collection_amount",
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

    return NextResponse.json({ ok: true });
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

  return NextResponse.json({ ok: true });
}
