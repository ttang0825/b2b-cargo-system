import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 표준 혼적 할인율 수정은 운임기준표 수정과 같은 급의 "설정" 기능 —
// 직원은 화면에서 조회만 가능하고, 수정은 관리자만 가능(원칙 25번 이중 체크)
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
      { error: "표준 혼적 할인율 설정은 관리자만 수정할 수 있습니다." },
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

  // 거리 3구간을 한 번에 저장한다(2026-09-09). 구간이 늘어날 수 있으므로 개수를
  // 고정하지 않되, 화면이 보낼 수 있는 범위를 넘는 요청은 받지 않는다.
  const body = await req.json();
  const tiers = body?.tiers;
  if (!Array.isArray(tiers) || tiers.length === 0 || tiers.length > 10) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  for (const t of tiers) {
    if (
      !t ||
      typeof t.id !== "string" ||
      typeof t.standard_discount_percent !== "number" ||
      !Number.isFinite(t.standard_discount_percent) ||
      t.standard_discount_percent < 0 ||
      t.standard_discount_percent >= 100
    ) {
      // 100% 이상이면 청구금액이 0 이하가 된다 — 화면에서 막지 말고 여기서도 막는다
      return NextResponse.json(
        { error: "할인율은 0 이상 100 미만의 숫자여야 합니다." },
        { status: 400 }
      );
    }
  }

  const now = new Date().toISOString();
  for (const t of tiers) {
    const { error } = await admin
      .from("mixed_loading_discount_settings")
      .update({
        standard_discount_percent: t.standard_discount_percent,
        updated_by: currentStaff.id,
        updated_at: now,
      })
      .eq("id", t.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
