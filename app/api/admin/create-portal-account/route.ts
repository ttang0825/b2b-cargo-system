import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function randomPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { company_id, email, name } = await req.json();
  if (!company_id || !email) {
    return NextResponse.json(
      { error: "회사와 이메일은 필수입니다." },
      { status: 400 }
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tempPassword = randomPassword();

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (userError || !userData?.user) {
    return NextResponse.json(
      { error: userError?.message || "계정 생성에 실패했습니다. (이미 등록된 이메일일 수 있습니다)" },
      { status: 400 }
    );
  }

  const { error: linkError } = await admin.from("customer_accounts").insert({
    auth_user_id: userData.user.id,
    company_id,
    name: name || null,
    email,
    must_change_password: true,
  });

  if (linkError) {
    // 연결 저장에 실패하면 방금 만든 인증 계정도 같이 롤백
    await admin.auth.admin.deleteUser(userData.user.id);
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  return NextResponse.json({ email, password: tempPassword });
}
