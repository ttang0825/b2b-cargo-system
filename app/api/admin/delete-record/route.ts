import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 여러 화면(견적/오더/배차/정산/차주/공지사항/발주요청/배송지)의 단순 삭제를
// 한 곳에서 처리하는 공용 API. 삭제는 관리자만 가능 — 허용된 테이블 목록으로
// 제한해서 임의 테이블을 지우는 요청은 막음
export const dynamic = "force-dynamic";

// 삭제 전 연관 레코드를 먼저 지워야 하는 테이블 (외래키 참조 정리)
const CASCADE_BEFORE: Record<string, { table: string; column: string }[]> = {
  quotes: [{ table: "quote_items", column: "quote_id" }],
  drivers: [{ table: "vehicles", column: "driver_id" }],
};

const ALLOWED_TABLES = new Set([
  "quotes",
  "orders",
  "dispatches",
  "invoices",
  "drivers",
  "announcements",
  "portal_order_requests",
  "customer_locations",
]);

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
  if (!currentStaff || currentStaff.role !== "admin") {
    return NextResponse.json({ error: "삭제는 관리자만 할 수 있습니다." }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { table, id } = await req.json();
  if (!table || !id || !ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  for (const cascade of CASCADE_BEFORE[table] || []) {
    const { error } = await admin.from(cascade.table).delete().eq(cascade.column, id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
