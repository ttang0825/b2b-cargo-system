import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 로드맵③ 현장 추가비 — 취소(삭제 아님, cancel_dispatch_extra_charge DB
// 함수가 status='cancelled'+취소정보 기록으로만 처리, 재무 데이터 이력 보존).
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
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { id, reason } = (await req.json()) as { id: string; reason: string };
  if (!id || !reason || !reason.trim()) {
    return NextResponse.json({ error: "취소 사유를 입력해주세요." }, { status: 400 });
  }

  const { data, error } = await admin.rpc("cancel_dispatch_extra_charge", {
    p_id: id,
    p_staff_id: currentStaff.id,
    p_reason: reason.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
