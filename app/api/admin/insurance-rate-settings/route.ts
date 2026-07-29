import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 산재보험료 계산에 쓰는 필요경비공제율/산재보험료율 수정은 운임기준표 수정과
// 같은 급의 "설정" 기능 — 직원은 화면에서 조회만 가능하고, 수정은 관리자만
// 가능(원칙 25번 이중 체크)
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
    return NextResponse.json(
      { error: "산재보험료 요율 설정은 관리자만 수정할 수 있습니다." },
      { status: 403 }
    );
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { id, expense_deduction_rate, insurance_rate_total } = body;
  if (
    !id ||
    typeof expense_deduction_rate !== "number" ||
    typeof insurance_rate_total !== "number"
  ) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { error } = await admin
    .from("insurance_rate_settings")
    .update({
      expense_deduction_rate,
      insurance_rate_total,
      updated_by: currentStaff.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
