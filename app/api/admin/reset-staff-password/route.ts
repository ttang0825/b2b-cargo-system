import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 직원 비밀번호 재발급 — 32차. 🟢 `/api/admin/reset-portal-password/route.ts` 가 본보기다.
//
// 🔴 이 라우트가 이번 차수의 **진짜 이유**다. 지금까지는 직원이 비밀번호를 잊으면
//    아무도 풀어줄 수 없었다(RESEND_API_KEY 미등록 · SMTP 미연결).
// 🔴 화주쪽 코드를 그대로 복사해 오지 말 것 — 표가 `customer_accounts` 가 아니라
//    `staff_accounts` 이고, 문자 발송도 붙이지 않는다(직원에게는 관리자가 직접 알려준다).
export const dynamic = "force-dynamic";

/** 임시 비밀번호. 🔴 화주포털의 6자리 숫자가 아니라, 직원 계정 발급과 같은 10자다. */
function randomPassword(length = 10) {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

export async function POST(req: Request) {
  // 🔴 화면에서 버튼을 숨기는 것만으로는 막히지 않는다 — 콘솔에서 이 API 를 직접
  //    부르면 그만이다(원칙 25번). 서버에서 반드시 다시 확인한다.
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || currentStaff.role !== "admin") {
    return NextResponse.json({ error: "비밀번호 재설정은 관리자만 할 수 있습니다." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { staff_id } = await req.json().catch(() => ({ staff_id: null }));
  if (!staff_id) {
    return NextResponse.json({ error: "계정 정보가 필요합니다." }, { status: 400 });
  }

  const admin = createServiceClient(url, serviceKey);

  // 🔴 대상이 실제 직원 계정인지 먼저 확인한다 — 확인 없이 updateUserById 를 부르면
  //    직원이 아닌 Auth 유저(화주포털 계정 등)의 비밀번호까지 바꿀 수 있다.
  const { data: target } = await admin
    .from("staff_accounts")
    .select("id,status")
    .eq("id", staff_id)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "직원 계정을 찾을 수 없습니다." }, { status: 404 });
  }

  const tempPassword = randomPassword();

  // 🔴 비밀번호와 강제변경 표시를 **한 호출로** 함께 바꾼다. middleware 는
  //    user_metadata 를 보고 막으므로, 둘이 따로 돌다 한쪽만 성공하면
  //    「임시 비밀번호인데 아무 화면이나 들어가지는」 상태가 생긴다.
  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(staff_id, {
    password: tempPassword,
    user_metadata: { must_change_password: true },
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // user_metadata 를 통째로 덮어쓰면 role·status 미러링이 날아가므로 되살린다.
  // (updateUserById 는 user_metadata 를 병합하지 않고 교체한다.)
  const meta = updated?.user?.user_metadata || {};
  if (meta.role === undefined || meta.status === undefined) {
    const { data: staffRow } = await admin
      .from("staff_accounts")
      .select("role,status")
      .eq("id", staff_id)
      .maybeSingle();
    if (staffRow) {
      await admin.auth.admin.updateUserById(staff_id, {
        user_metadata: {
          ...meta,
          role: staffRow.role,
          status: staffRow.status,
          must_change_password: true,
        },
      });
    }
  }

  const { error: flagError } = await admin
    .from("staff_accounts")
    .update({ must_change_password: true })
    .eq("id", staff_id);
  if (flagError) {
    return NextResponse.json({ error: flagError.message }, { status: 400 });
  }

  // 🔴 응답에 이메일·아이디를 담지 않는다 — 화면은 이미 그 행을 갖고 있다.
  return NextResponse.json({ password: tempPassword });
}
