import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { DISPATCH_PHOTO_BUCKET } from "@/lib/dispatchPhotos";

// 로드맵④ POD·인수증 — 열람용 signed URL 발급. 클라이언트는 photo_id만 넘기고,
// storage_path는 서버가 DB에서 조회해서만 사용(클라이언트가 임의 경로로 다른
// 배차의 파일에 접근하는 것 방지).
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

  const { photo_id } = (await req.json()) as { photo_id: string };
  if (!photo_id) {
    return NextResponse.json({ error: "not_found_or_deleted" }, { status: 400 });
  }

  const { data: photo } = await admin
    .from("dispatch_photos")
    .select("storage_path")
    .eq("id", photo_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!photo) {
    return NextResponse.json({ error: "not_found_or_deleted" }, { status: 404 });
  }

  const { data: signed, error: signedError } = await admin.storage
    .from(DISPATCH_PHOTO_BUCKET)
    .createSignedUrl(photo.storage_path, 300);
  if (signedError || !signed) {
    return NextResponse.json({ error: signedError?.message || "signed_url_failed" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
