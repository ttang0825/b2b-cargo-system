import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// Next.js가 GET 응답(및 그 안에서 호출되는 fetch)을 캐시해버리면, 방금 처리한 결과가
// 재조회 시 예전 값으로 보이는 문제가 있을 수 있어 매 요청마다 실제 DB를 다시 조회하도록 강제
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
    .from("customer_applications")
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
  const { action } = body;

  // 개별 삭제
  if (action === "delete") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    const { error } = await admin.from("customer_applications").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // 오래된 거절/보류 건 일괄 삭제 (기본 90일 이전)
  if (action === "bulk_cleanup") {
    const days = body.days || 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const { data, error } = await admin
      .from("customer_applications")
      .delete()
      .in("status", ["거절", "보류"])
      .lt("created_at", cutoff.toISOString())
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, deletedCount: data?.length || 0 });
  }

  // 상태 변경 (승인/거절/보류)
  const { id, status, staff_note, processed_by } = body;
  if (!id || !status) {
    return NextResponse.json({ error: "id와 status가 필요합니다." }, { status: 400 });
  }
  const staff = await getCurrentStaff();
  const { error } = await admin
    .from("customer_applications")
    .update({
      status,
      staff_note: staff_note || null,
      processed_by: processed_by || null,
      updated_by: staff?.id || null,
    })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
