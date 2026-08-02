import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

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
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { batch_id, item_id } = (await req.json()) as {
    batch_id: string;
    item_id: string;
  };
  if (!batch_id || !item_id) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { data, error } = await admin.rpc("remove_item_from_billing_batch", {
    p_batch_id: batch_id,
    p_item_id: item_id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
