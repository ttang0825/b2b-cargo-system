import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 로드맵 ②-A 신규 정산방식 필드(collection_method/billing_cycle/
// direct_collection_point 등) 변경이력 전용 — settlement_field_change_logs.
// 작업지시서 3-7 권한 원칙대로 INSERT/SELECT 전부 이 서버 API(서비스 롤)를
// 통해서만 처리하고, 클라이언트가 이 테이블을 직접 insert/select하지 않음.
export const dynamic = "force-dynamic";

const ALLOWED_TARGET_TABLES = ["orders", "dispatches", "invoices"];

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createServiceClient(url, serviceKey);
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
  const { targetTable, targetId, fieldName, beforeValue, afterValue, reason } = body as {
    targetTable: string;
    targetId: string;
    fieldName: string;
    beforeValue: string | null;
    afterValue: string | null;
    reason: string;
  };

  if (!ALLOWED_TARGET_TABLES.includes(targetTable) || !targetId || !fieldName) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!reason || !reason.trim()) {
    return NextResponse.json({ error: "사유를 입력해야 합니다." }, { status: 400 });
  }

  const { error } = await admin.from("settlement_field_change_logs").insert({
    target_table: targetTable,
    target_id: targetId,
    field_name: fieldName,
    before_value: beforeValue,
    after_value: afterValue,
    reason: reason.trim(),
    changed_by: currentStaff.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const targetTable = searchParams.get("targetTable");
  const targetId = searchParams.get("targetId");
  if (!targetTable || !ALLOWED_TARGET_TABLES.includes(targetTable) || !targetId) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("settlement_field_change_logs")
    .select("id,field_name,before_value,after_value,reason,changed_by,changed_at,staff_accounts(name)")
    .eq("target_table", targetTable)
    .eq("target_id", targetId)
    .order("changed_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ logs: data || [] });
}
