import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServiceClient";

// 직원이 강제 변경 화면에서 비밀번호를 실제로 바꾼 뒤, `must_change_password` 표시를
// 끄는 라우트 — 32차. 🟢 화주포털의 `/api/customer/confirm-password-change` 가 본보기다.
//
// 🔴 `customer_accounts` 를 건드리는 화주쪽 코드를 그대로 복사해 오지 말 것 —
//    표가 다르다(staff_accounts). 두 표의 must_change_password 는 서로 무관하다.
// 🔴 클라이언트가 보낸 id 를 받지 않는다(원칙 30번) — 어느 행을 끌지는 **토큰을
//    서버가 직접 검증해서** 나온 사용자 id 로만 정한다. id 를 받으면 콘솔에서
//    남의 id 를 넣어 그 사람의 강제 변경을 풀어줄 수 있다.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "인증 정보가 없습니다." }, { status: 401 });
  }

  const admin = createServiceClient(url, serviceKey);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 401 });
  }

  const { error: updateError } = await admin
    .from("staff_accounts")
    .update({ must_change_password: false })
    .eq("id", userData.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // 🔴 middleware 가 user_metadata 를 먼저 보므로 거기도 같이 꺼야 한다 —
  //    안 끄면 비밀번호를 바꾸고도 계속 변경 화면으로 되돌아간다.
  await admin.auth.admin.updateUserById(userData.user.id, {
    user_metadata: { ...(userData.user.user_metadata || {}), must_change_password: false },
  });

  return NextResponse.json({ ok: true });
}
