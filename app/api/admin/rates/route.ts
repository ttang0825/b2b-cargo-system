import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 운임기준표 수정은 관리자 전용 — 직원 화면에서는 숫자를 눌러도 저장 안 되지만(원칙: UI 체크),
// 여기서도 다시 한 번 관리자인지 확인함(서버단 체크) — 화면 체크만 믿으면 브라우저 콘솔로
// 직접 fetch를 호출해 우회할 수 있기 때문에 이중 체크가 필요함
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
    return NextResponse.json({ error: "운임기준표는 관리자만 수정할 수 있습니다." }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { action } = body;

  if (action === "update_tier") {
    const { id, base_fare } = body;
    if (!id || typeof base_fare !== "number") {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    const { error } = await admin.from("rate_distance_tiers").update({ base_fare }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "update_tier_scale") {
    const { updates } = body as { updates: { id: string; base_fare: number }[] };
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    for (const u of updates) {
      const { error } = await admin
        .from("rate_distance_tiers")
        .update({ base_fare: u.base_fare })
        .eq("id", u.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "update_surcharge") {
    const { id, field, value } = body;
    if (!id || (field !== "rate_pct" && field !== "flat_amount") || typeof value !== "number") {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    const { error } = await admin.from("rate_surcharges").update({ [field]: value }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "update_extra_fee") {
    const { id, field, value } = body;
    const allowedFields = ["waiting_fee_per_unit", "waypoint_fee", "free_waiting_minutes"];
    if (!id || !allowedFields.includes(field) || typeof value !== "number") {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    const { error } = await admin.from("rate_vehicle_extra_fees").update({ [field]: value }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
}
