import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { issuePortalAccount } from "@/lib/portalAccountCredentials";

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
  if (!company_id) {
    return NextResponse.json({ error: "회사 정보가 필요합니다." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await issuePortalAccount(admin, {
    company_id,
    name: name || null,
    email: email || null,
  });

  if (!data) {
    return NextResponse.json({ error: error || "계정 발급에 실패했습니다." }, { status: 400 });
  }

  return NextResponse.json({ login_id: data.login_id, password: data.password, email: data.email });
}
