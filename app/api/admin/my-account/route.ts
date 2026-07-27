import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 본인 이름 수정 전용 — role 상관없이 누구나 자신의 이름은 스스로 바꿀 수 있음.
// getCurrentStaff()로 얻은 id만 사용하므로(클라이언트가 id를 보내지 않음),
// 본인 행 외에는 절대 건드릴 수 없음
export async function POST(req: Request) {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin
    .from("staff_accounts")
    .update({ name: name.trim() })
    .eq("id", currentStaff.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, name: name.trim() });
}
