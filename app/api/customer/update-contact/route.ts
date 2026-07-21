import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_FIELDS = ["name", "contact_position", "contact_mobile", "email"];

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "인증 정보가 없습니다." }, { status: 401 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 401 });
  }

  const body = await req.json();
  // 화이트리스트에 있는 필드만 반영 - 본인 계정(customer_accounts)의 정보만 수정, 회사 정보는 안 건드림
  const payload: Record<string, any> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) payload[key] = body[key] || null;
  }

  const { error: updateError } = await admin
    .from("customer_accounts")
    .update(payload)
    .eq("auth_user_id", userData.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
