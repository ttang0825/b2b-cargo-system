import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 로드맵③ 현장 추가비 — 등록. 월정산 묶음 서버 API와 동일한 아키텍처:
// 인증만 확인하고 실제 로직(배차/오더/정산 상태 확인, 확정 묶음이면 정정청구
// invoice 자동생성까지)은 전부 register_dispatch_extra_charge DB 함수
// 안에서 원자적으로 처리한다.
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

  const { dispatch_id, category, customer_charge_amount, driver_payout_amount, note } =
    (await req.json()) as {
      dispatch_id: string;
      category: string;
      customer_charge_amount: number;
      driver_payout_amount: number;
      note: string | null;
    };
  if (!dispatch_id || !category) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { data, error } = await admin.rpc("register_dispatch_extra_charge", {
    p_dispatch_id: dispatch_id,
    p_category: category,
    p_customer_charge_amount: customer_charge_amount || 0,
    p_driver_payout_amount: driver_payout_amount || 0,
    p_note: note || null,
    p_staff_id: currentStaff.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
