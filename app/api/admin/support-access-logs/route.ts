import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || currentStaff.role !== "admin") {
    return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const admin = createServiceClient(url, serviceKey);

  const { data, error } = await admin
    .from("support_access_logs")
    .select("*")
    .order("accessed_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}
