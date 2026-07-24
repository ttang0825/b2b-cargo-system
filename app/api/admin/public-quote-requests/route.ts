import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Next.js가 GET 응답(및 그 안에서 호출되는 fetch)을 캐시해버리면, 방금 저장한 답변/상태가
// 재조회 시 예전 값으로 보이는 문제가 있었음 — 매 요청마다 실제 DB를 다시 조회하도록 강제
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { data, error } = await admin
    .from("public_quote_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { id, action } = body;
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  if (action === "delete") {
    const { error } = await admin.from("public_quote_requests").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // action === "update" (기본)
  const payload: Record<string, any> = {};
  if ("status" in body) payload.status = body.status;
  if ("staff_note" in body) payload.staff_note = body.staff_note;
  if ("processed_by" in body) payload.processed_by = body.processed_by;

  const { error } = await admin.from("public_quote_requests").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
