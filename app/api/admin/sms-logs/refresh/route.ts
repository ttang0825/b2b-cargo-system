import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { solapiProvider } from "@/lib/sms/solapiProvider";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// 관리자가 수동으로 누를 때만 솔라피에 최신 발송결과를 재조회(자동 폴링·Webhook은
// 1차 범위에서 제외 — 사전조사 1-5 결과에 따른 결정). 'sent'(발송요청됨, 결과
// 미확정) 상태인 건만 의미가 있음.
export async function POST(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
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
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const { data: log, error: fetchError } = await admin.from("sms_logs").select("*").eq("id", id).single();
  if (fetchError || !log) {
    return NextResponse.json({ error: "발송 이력을 찾을 수 없습니다." }, { status: 404 });
  }
  if (!log.provider_message_id) {
    return NextResponse.json({ error: "조회할 발송건 식별자가 없습니다." }, { status: 400 });
  }

  try {
    const status = await solapiProvider.getMessageStatus(log.provider_message_id);
    const { data, error } = await admin
      .from("sms_logs")
      .update({
        status: status.outcome,
        message_type: status.messageType || log.message_type,
        error_code: status.statusCode,
        error_message: status.statusMessage,
        result_checked_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "상태 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
