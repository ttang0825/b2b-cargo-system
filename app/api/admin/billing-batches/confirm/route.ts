import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 로드맵 ②-B: 월정산 묶음 확정 — 작업지시서 6-1에 "확정 버튼(관리자 전용)"으로
// 명시되어 있어 관리자만 호출 가능(원칙 25번).
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
    return NextResponse.json({ error: "묶음 확정은 관리자만 할 수 있습니다." }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { batch_id } = (await req.json()) as { batch_id: string };
  if (!batch_id) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { data, error } = await admin.rpc("confirm_billing_batch", {
    p_batch_id: batch_id,
    p_staff_id: currentStaff.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
