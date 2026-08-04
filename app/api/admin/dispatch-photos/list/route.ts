import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 로드맵④ POD·인수증 — admin 목록조회. storage_path는 응답에 절대 포함하지 않음
// (열람은 반드시 signed-url API에 photo_id만 넘겨서 별도 발급).
// 삭제된(deleted_at 있음) 사진은 admin 목록에서도 제외.
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: Request) {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const dispatchId = searchParams.get("dispatch_id");
  if (!dispatchId) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("dispatch_photos")
    .select("id,category,original_filename,mime_type,file_size_bytes,uploaded_at,uploaded_by_name_snapshot")
    .eq("dispatch_id", dispatchId)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ photos: data || [] });
}
