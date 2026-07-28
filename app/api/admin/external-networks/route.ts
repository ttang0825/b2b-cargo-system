import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 외부 정보망(전국24시콜/원콜/화물맨 등) 목록 관리는 운임기준표 수정과 같은 급의
// "설정" 기능 — 직원은 화면에서 조회만 가능하고, 추가/이름수정/사용중지는
// 관리자만 가능(원칙 25번 이중 체크)
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
    return NextResponse.json({ error: "외부 정보망 관리는 관리자만 할 수 있습니다." }, { status: 403 });
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

  if (action === "create") {
    const { name } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }
    const { count } = await admin.from("external_networks").select("id", { count: "exact", head: true });
    const { error } = await admin.from("external_networks").insert({
      name: name.trim(),
      sort_order: count || 0,
      created_by: currentStaff.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "update_name") {
    const { id, name } = body;
    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }
    const { error } = await admin
      .from("external_networks")
      .update({ name: name.trim(), updated_by: currentStaff.id })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "toggle_active") {
    const { id, is_active } = body;
    if (!id || typeof is_active !== "boolean") {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    const { error } = await admin
      .from("external_networks")
      .update({ is_active, updated_by: currentStaff.id })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
}
