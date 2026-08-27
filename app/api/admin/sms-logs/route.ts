import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 요청 파라미터를 조건 없이 캐시하면 방금 발송한 이력이 재조회 시 안 보일 수 있음
// (원칙 21번)
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createServiceClient(url, serviceKey);
}

// sms_logs는 개인 전화번호를 담고 있어 anon/authenticated 조회 정책을 아예 두지
// 않음(support_access_logs와 동일 패턴) — 관리자 화면도 반드시 이 서버 API를
// 거쳐야만 조회 가능
export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const relatedType = searchParams.get("related_type");
  const relatedId = searchParams.get("related_id");
  const relatedIds = searchParams.get("related_ids"); // 콤마구분, 화주 상세처럼 계정이 여러 건인 경우
  if (!relatedType || (!relatedId && !relatedIds)) {
    return NextResponse.json({ error: "related_type과 related_id(또는 related_ids)가 필요합니다." }, { status: 400 });
  }

  let query = admin.from("sms_logs").select("*").eq("related_type", relatedType);
  query = relatedIds ? query.in("related_id", relatedIds.split(",").filter(Boolean)) : query.eq("related_id", relatedId!);

  const { data, error } = await query.order("sent_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 누가 보냈는지 이름으로 보여주려고 sent_by(uuid)를 여기서 이름으로 바꿔 붙인다.
  // 담당자마다 발신번호가 달라진 35차부터는 "누가 어느 번호로 보냈는지"가 중요해졌음.
  const staffIds = Array.from(new Set((data || []).map((r: any) => r.sent_by).filter(Boolean)));
  let nameById: Record<string, string> = {};
  if (staffIds.length > 0) {
    const { data: staff } = await admin.from("staff_accounts").select("id,name").in("id", staffIds);
    (staff || []).forEach((s: any) => {
      nameById[s.id] = s.name;
    });
  }

  return NextResponse.json({
    data: (data || []).map((r: any) => ({ ...r, sent_by_name: r.sent_by ? nameById[r.sent_by] || null : null })),
  });
}
