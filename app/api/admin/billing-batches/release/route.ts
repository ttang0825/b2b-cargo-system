import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 로드맵 ②-B: 확정된 묶음 해제(취소) — 확정과 대칭되는 만큼 되돌리는 것도
// 관리자 전용으로 제한(작업지시서에 명시는 없으나, 6-1의 확정 버튼 권한
// 기준과 일관되게 판단).
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
  if (!currentStaff || currentStaff.role !== "admin") {
    return NextResponse.json({ error: "묶음 해제는 관리자만 할 수 있습니다." }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { batch_id, reason } = (await req.json()) as { batch_id: string; reason: string };
  if (!batch_id || !reason || !reason.trim()) {
    return NextResponse.json({ error: "해제 사유를 입력해주세요." }, { status: 400 });
  }

  const { data, error } = await admin.rpc("release_billing_batch", {
    p_batch_id: batch_id,
    p_staff_id: currentStaff.id,
    p_reason: reason.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
