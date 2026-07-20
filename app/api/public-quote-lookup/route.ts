import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버 설정 오류입니다." },
      { status: 500 }
    );
  }

  const { phone } = await req.json();
  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: "연락처를 입력해주세요." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 입력한 전화번호와 정확히 일치하는 문의만 반환 (전체 목록 열람 불가)
  const { data, error } = await admin
    .from("public_quote_requests")
    .select(
      "id,name,origin,destination,vehicle_type,item,requested_pickup_at,notes,status,staff_note,created_at"
    )
    .eq("phone", phone.trim())
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: data || [] });
}
