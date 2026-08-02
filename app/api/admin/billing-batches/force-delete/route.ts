import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 확정(+세금계산서 발행/입금완료 처리까지 된) 묶음을 관리자가 사유와 함께
// 완전삭제. 정상 흐름(해제→삭제)은 세금계산서 발행/입금 처리가 시작되면
// 막혀있는데(release/route.ts), 테스트 중 만든 기록을 정리할 수 있어야
// 한다는 실사용 피드백(PR #64)으로 추가한 관리자 전용 예외 경로.
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
    return NextResponse.json({ error: "완전삭제는 관리자만 할 수 있습니다." }, { status: 403 });
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
    return NextResponse.json({ error: "삭제 사유를 입력해주세요." }, { status: 400 });
  }

  const { data, error } = await admin.rpc("force_delete_billing_batch", {
    p_batch_id: batch_id,
    p_staff_id: currentStaff.id,
    p_reason: reason.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
