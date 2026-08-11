import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { reissueTempPassword } from "@/lib/portalAccountCredentials";
import { portalPasswordReissuedMessage } from "@/lib/sms/templates";
import { getPortalLoginUrl } from "@/lib/siteUrl";

export async function POST(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "비밀번호 재발급은 관리자만 할 수 있습니다." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { auth_user_id } = await req.json();
  if (!auth_user_id) {
    return NextResponse.json({ error: "계정 정보가 필요합니다." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tempPassword = reissueTempPassword();

  const { error: updateError } = await admin.auth.admin.updateUserById(auth_user_id, {
    password: tempPassword,
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // 아이디(login_id)는 그대로 두고 비밀번호만 재발급 — 다음 로그인 시 다시 변경 강제
  const { data: account } = await admin
    .from("customer_accounts")
    .update({ must_change_password: true })
    .eq("auth_user_id", auth_user_id)
    .select("id,login_id,contact_mobile")
    .single();

  // 재발급 안내 SMS 미리보기(발송은 안 함) — 실제 발송은 client가
  // SmsConfirmModal로 확인·수정 후 /api/admin/send-sms를 호출해야만 일어남
  // (PR #73 리뷰 반영).
  const smsPreview = account
    ? {
        relatedType: "portal_account" as const,
        relatedId: account.id,
        templateType: "portal_password_reissued" as const,
        recipientType: "customer" as const,
        recipientPhone: account.contact_mobile || null,
        message: portalPasswordReissuedMessage({
          loginId: account.login_id,
          password: tempPassword,
          portalUrl: getPortalLoginUrl(),
        }),
      }
    : null;

  return NextResponse.json({ password: tempPassword, smsPreview });
}
