import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { isValidSenderPhone } from "@/lib/smsSenderPhone";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// staff_accounts의 role/status가 바뀔 때마다 auth 쪽 user_metadata도 같이 갱신 —
// middleware가 이 값을 getUser() 응답에서 바로 읽어서 매 페이지 이동마다 staff_accounts를
// 따로 조회하지 않아도 되게 함 (원칙: role/status가 바뀐 직후 같은 요청 안에서 동기화되므로
// 신선도 손실 없음). 실패해도 staff_accounts가 원본이라 middleware가 자동으로 DB 조회로
// 폴백하니 요청 자체를 실패시키지 않음
async function syncStaffAuthMetadata(admin: ReturnType<typeof getAdminClient>, id: string) {
  if (!admin) return;
  try {
    const { data: staff } = await admin.from("staff_accounts").select("role,status").eq("id", id).maybeSingle();
    if (!staff) return;
    await admin.auth.admin.updateUserById(id, {
      user_metadata: { role: staff.role, status: staff.status },
    });
  } catch {
    // 동기화 실패해도 무시 — middleware가 staff_accounts 조회로 폴백함
  }
}

function randomPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

// 이 화면·API는 관리자(admin) 전용 — 직원(staff)은 조회조차 불가
export async function GET() {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || currentStaff.role !== "admin") {
    return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { data, error } = await admin
    .from("staff_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || currentStaff.role !== "admin") {
    return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { action } = body;

  if (action === "invite") {
    const { email, name, role } = body;
    if (!email?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "이메일과 이름은 필수입니다." }, { status: 400 });
    }
    const finalRole = role === "admin" ? "admin" : "staff";
    const tempPassword = randomPassword();

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      // role/status를 auth 쪽 user_metadata에도 미러링 — middleware가 매 페이지 이동마다
      // staff_accounts를 따로 조회하지 않고 getUser() 응답만으로 재직상태/권한을 판단할 수 있게 함
      user_metadata: { role: finalRole, status: "active" },
    });
    if (userError || !userData?.user) {
      const message = (userError?.message || "").toLowerCase();
      const friendly = message.includes("already") ? `이미 등록된 이메일입니다 (${email}).` : userError?.message;
      return NextResponse.json({ error: friendly || "계정 생성에 실패했습니다." }, { status: 400 });
    }

    const { error: insertError } = await admin.from("staff_accounts").insert({
      id: userData.user.id,
      name: name.trim(),
      email: email.trim(),
      role: finalRole,
      status: "active",
    });
    if (insertError) {
      // 직원 계정 테이블 등록에 실패하면 방금 만든 Auth 유저도 같이 롤백 (고아 계정 방지, 원칙 19번과 동일 취지)
      await admin.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ email: email.trim(), password: tempPassword });
  }

  if (action === "update_profile") {
    const { id, name, email, sms_sender_phone } = body;
    if (!id || !name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "이름과 이메일을 입력해주세요." }, { status: 400 });
    }

    // SMS 발신번호 — 저장은 숫자만(솔라피 API가 하이픈 없는 형식을 씀).
    // 빈 값은 "미등록"으로 허용하며, 그 경우 대표 발신번호로 발송된다.
    // ⚠️ 이 값을 수정할 수 있는 건 관리자뿐이다(이 라우트 상단에서 이미 role 확인).
    // 직원이 스스로 바꾸게 두면 솔라피에 등록되지 않은 번호가 들어가 발송이 깨진다.
    const rawPhone = typeof sms_sender_phone === "string" ? sms_sender_phone : "";
    const senderDigits = rawPhone.replace(/\D/g, "");
    if (senderDigits && !isValidSenderPhone(senderDigits)) {
      return NextResponse.json(
        { error: "발신번호는 숫자 10~11자리로 입력해주세요." },
        { status: 400 }
      );
    }

    const { data: current } = await admin
      .from("staff_accounts")
      .select("email")
      .eq("id", id)
      .maybeSingle();

    // 이메일이 바뀌는 경우, 로그인 계정(Auth)의 이메일도 같이 바꿔야
    // 실제 로그인 이메일과 화면에 보이는 이메일이 어긋나지 않음
    if (current && current.email !== email.trim()) {
      const { error: authError } = await admin.auth.admin.updateUserById(id, {
        email: email.trim(),
        email_confirm: true,
      });
      if (authError) {
        const message = (authError.message || "").toLowerCase();
        const friendly = message.includes("already")
          ? `이미 다른 계정에서 사용 중인 이메일입니다 (${email}).`
          : authError.message;
        return NextResponse.json({ error: friendly || "이메일 변경에 실패했습니다." }, { status: 400 });
      }
    }

    const { error } = await admin
      .from("staff_accounts")
      .update({
        name: name.trim(),
        email: email.trim(),
        sms_sender_phone: senderDigits || null,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "update_role") {
    const { id, role } = body;
    if (!id || (role !== "admin" && role !== "staff")) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    if (id === currentStaff.id && role !== "admin") {
      return NextResponse.json({ error: "본인의 관리자 권한은 스스로 해제할 수 없습니다." }, { status: 400 });
    }
    const { error } = await admin.from("staff_accounts").update({ role }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await syncStaffAuthMetadata(admin, id);
    return NextResponse.json({ ok: true });
  }

  if (action === "update_status") {
    const { id, status } = body;
    if (!id || (status !== "active" && status !== "inactive")) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    if (id === currentStaff.id && status === "inactive") {
      return NextResponse.json({ error: "본인 계정은 스스로 비활성화할 수 없습니다." }, { status: 400 });
    }
    const { error } = await admin.from("staff_accounts").update({ status }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await syncStaffAuthMetadata(admin, id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
}
