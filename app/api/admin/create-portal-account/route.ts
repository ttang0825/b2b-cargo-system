import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { issuePortalAccount } from "@/lib/portalAccountCredentials";
import { portalAccountIssuedMessage } from "@/lib/sms/templates";
import { getPortalLoginUrl } from "@/lib/siteUrl";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { company_id, contact_mobile, name } = await req.json();
  if (!company_id) {
    return NextResponse.json({ error: "회사 정보가 필요합니다." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await issuePortalAccount(admin, {
    company_id,
    name: name || null,
    contact_mobile: contact_mobile || null,
  });

  if (!data) {
    return NextResponse.json({ error: error || "계정 발급에 실패했습니다." }, { status: 400 });
  }

  // 계정발급 안내 SMS 미리보기(발송은 안 함) — 실제 발송은 client가
  // SmsConfirmModal로 확인·수정 후 /api/admin/send-sms를 호출해야만 일어남
  // (PR #73 리뷰 반영).
  const smsPreview = {
    relatedType: "portal_account" as const,
    relatedId: data.account_id,
    templateType: "portal_account_issued" as const,
    recipientType: "customer" as const,
    recipientPhone: contact_mobile || null,
    message: portalAccountIssuedMessage({
      loginId: data.login_id,
      password: data.password,
      portalUrl: getPortalLoginUrl(),
    }),
  };

  return NextResponse.json({ login_id: data.login_id, password: data.password, email: data.email, smsPreview });
}
