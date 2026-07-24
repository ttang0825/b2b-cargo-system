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
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
}
