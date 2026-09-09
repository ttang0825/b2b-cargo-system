import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { isValidSenderPhone } from "@/lib/smsSenderPhone";
import { LOGIN_ID_PATTERN } from "@/lib/staffLogin";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createServiceClient(url, serviceKey);
}

// 로그인 아이디 검증 + 중복 확인 — 32차.
//
// 🔴 유니크 인덱스가 `lower(login_id)` 에 걸려 있어 DB 가 최종 방어선이지만, 그
//    에러 메시지("duplicate key value violates unique constraint …")를 담당자가
//    보면 무슨 말인지 알 수 없다. 그래서 저장 전에 먼저 확인해 알려준다.
// ⚠️ 사전 조회만으로는 완전히 동시에 들어온 두 요청을 못 막는다 — 그 경우는
//    유니크 인덱스가 막고, 아래 저장부가 그 에러를 사람 말로 바꿔 준다.
async function validateLoginId(
  admin: ReturnType<typeof getAdminClient>,
  raw: unknown,
  selfId: string | null
): Promise<{ value: string | null } | { error: string }> {
  const trimmed = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  // 빈 값은 허용한다 — 아직 아이디를 안 정한 계정이 있을 수 있다(전환기).
  if (!trimmed) return { value: null };
  if (!LOGIN_ID_PATTERN.test(trimmed)) {
    return { error: "아이디는 영문 소문자와 숫자만, 4~20자, 첫 글자는 영문이어야 합니다." };
  }
  const { data: dup } = await admin!
    .from("staff_accounts")
    .select("id")
    .ilike("login_id", trimmed)
    .maybeSingle();
  if (dup && dup.id !== selfId) {
    return { error: `이미 사용 중인 아이디입니다 (${trimmed}).` };
  }
  return { value: trimmed };
}

/** 유니크 인덱스가 막았을 때 담당자가 알아볼 수 있는 말로 바꾼다. */
function friendlyLoginIdError(message: string): string {
  return message.includes("staff_accounts_login_id_lower_key")
    ? "이미 사용 중인 아이디입니다."
    : message;
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
    const { email, name, role, sms_sender_phone, login_id } = body;
    if (!email?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "이메일과 이름은 필수입니다." }, { status: 400 });
    }

    const inviteLoginId = await validateLoginId(admin, login_id, null);
    if ("error" in inviteLoginId) {
      return NextResponse.json({ error: inviteLoginId.error }, { status: 400 });
    }
    const finalRole = role === "admin" ? "admin" : "staff";

    // SMS 발신번호는 선택 입력. 저장은 숫자만(솔라피 API가 하이픈 없는 형식을 씀).
    // 발급 시점에 같이 넣을 수 있게 해서, 계정을 만든 뒤 다시 "수정"을 눌러야 하는
    // 번거로움을 없앤다(PR #84 리뷰 지적).
    const inviteRawPhone = typeof sms_sender_phone === "string" ? sms_sender_phone : "";
    const inviteSenderDigits = inviteRawPhone.replace(/\D/g, "");
    if (inviteSenderDigits && !isValidSenderPhone(inviteSenderDigits)) {
      return NextResponse.json(
        { error: "발신번호는 숫자 10~11자리로 입력해주세요." },
        { status: 400 }
      );
    }
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
      sms_sender_phone: inviteSenderDigits || null,
      login_id: inviteLoginId.value,
    });
    if (insertError) {
      // 직원 계정 테이블 등록에 실패하면 방금 만든 Auth 유저도 같이 롤백 (고아 계정 방지, 원칙 19번과 동일 취지)
      await admin.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json({ error: friendlyLoginIdError(insertError.message) }, { status: 400 });
    }

    return NextResponse.json({
      email: email.trim(),
      login_id: inviteLoginId.value,
      password: tempPassword,
    });
  }

  if (action === "update_profile") {
    const { id, name, email, sms_sender_phone, login_id } = body;
    if (!id || !name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "이름과 이메일을 입력해주세요." }, { status: 400 });
    }

    // 🟢 아이디는 언제든 바꿀 수 있다 — Auth 이메일과 무관한 평범한 컬럼이라
    //    바꿔도 비밀번호는 그대로다(32차 확정).
    const nextLoginId = await validateLoginId(admin, login_id, id);
    if ("error" in nextLoginId) {
      return NextResponse.json({ error: nextLoginId.error }, { status: 400 });
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
        login_id: nextLoginId.value,
      })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: friendlyLoginIdError(error.message) }, { status: 400 });
    }
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
