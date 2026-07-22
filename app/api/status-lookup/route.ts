import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }

  const { phone } = await req.json();
  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: "연락처를 입력해주세요." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [{ data: quotes }, { data: applications }] = await Promise.all([
    admin
      .from("public_quote_requests")
      .select("id,origin,destination,vehicle_type,item,notes,status,staff_note,created_at")
      .eq("phone", phone.trim())
      .order("created_at", { ascending: false }),
    admin
      .from("customer_applications")
      .select("id,company_name,status,staff_note,created_at")
      .eq("contact_phone", phone.trim())
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    quotes: quotes || [],
    applications: applications || [],
  });
}
