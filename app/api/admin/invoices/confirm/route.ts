import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { notifyPortalPush } from "@/lib/portalPushNotify";

// 정산확정(잠금) — 관리자 전용. 확정 후에는 정산 건이 locked=true가 되어
// (원칙 25번 화면단+서버단 이중체크) 일반 직원은 더 이상 수정할 수 없고,
// 관리자만 사유 입력 후 예외 수정 가능(app/api/admin/invoices/save/route.ts 참고).
// 로드맵 ④(POD·인수증)가 나오면 "인수증 확인 안 된 건은 확정 차단" 게이트를
// 여기에 추가할 예정 — 지금은 POD 자체가 없으므로 게이트 없이 바로 확정 가능
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
  if (!currentStaff || currentStaff.role !== "admin") {
    return NextResponse.json({ error: "정산확정은 관리자만 할 수 있습니다." }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await admin
    .from("invoices")
    // 🔴 `company_id` 를 같이 읽는다 — 확정 뒤 화주에게 푸시를 보내야 하고,
    //    🔴 **회사는 반드시 서버가 DB 에서 읽은 값**이어야 한다(원칙 30번).
    .select("id,locked,company_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 });
  if (!existing) return NextResponse.json({ error: "정산 건을 찾을 수 없습니다." }, { status: 404 });
  if (existing.locked) {
    return NextResponse.json({ error: "이미 확정된 정산 건입니다." }, { status: 400 });
  }

  const { error } = await admin
    .from("invoices")
    .update({
      status: "정산확정",
      locked: true,
      confirmed_at: new Date().toISOString(),
      confirmed_by: currentStaff.id,
      updated_by: currentStaff.id,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // 🔴 화주포털 푸시 — **여기서는 `await` 한다.**
  //    서버리스 함수는 응답을 돌려준 뒤 **얼어붙어서** 떠 있는 약속이 끝나지 않는다 —
  //    fire-and-forget 으로 두면 **푸시가 아예 안 나간다**(38차 B장이 실제로 겪었다).
  //    🔴 그 함수는 **절대 던지지 않고** 3초 상한이 걸려 있어 확정 응답을 막지 않는다.
  //    ⚠️ 게스트 오더는 `company_id` 가 `null` 이라 그대로 넘어간다.
  await notifyPortalPush(existing.company_id as string | null, "invoice_confirmed");

  return NextResponse.json({ ok: true });
}
