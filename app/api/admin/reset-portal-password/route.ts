import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { reissueTempPassword } from "@/lib/portalAccountCredentials";

export async function POST(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "비밀번호 재발급은 관리자만 할 수 있습니다." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { auth_user_id } = await req.json();
  if (!auth_user_id) {
    return NextResponse.json({ error: "계정 정보가 필요합니다." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tempPassword = reissueTempPassword();

  const { error: updateError } = await admin.auth.admin.updateUserById(auth_user_id, {
    password: tempPassword,
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // 아이디(login_id)는 그대로 두고 비밀번호만 재발급 — 다음 로그인 시 다시 변경 강제
  await admin
    .from("customer_accounts")
    .update({ must_change_password: true })
    .eq("auth_user_id", auth_user_id);

  return NextResponse.json({ password: tempPassword });
}
