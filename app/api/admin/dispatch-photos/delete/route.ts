import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 로드맵④ POD·인수증 — soft delete. 관리자 전용, 사유 필수.
// Storage 상의 실제 파일은 즉시 물리 삭제하지 않고 보존(증빙자료 성격) —
// deleted_at만 채워서 목록·signed URL 발급에서 제외되게 함.
export const dynamic = "force-dynamic";

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
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }
  if (currentStaff.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { photo_id, reason } = (await req.json()) as { photo_id: string; reason: string };
  if (!photo_id) {
    return NextResponse.json({ error: "not_found_or_deleted" }, { status: 400 });
  }
  if (!reason || !reason.trim()) {
    return NextResponse.json({ error: "reason_required" }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from("dispatch_photos")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: currentStaff.id,
      deleted_by_name_snapshot: currentStaff.name,
      delete_reason: reason.trim(),
    })
    .eq("id", photo_id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!updated) {
    return NextResponse.json({ error: "already_deleted" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
