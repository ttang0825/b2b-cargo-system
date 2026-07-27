import { supabaseAdminAuth } from "@/lib/supabaseAdminAuthClient";

// 클라이언트에서 companies/quotes/orders 등을 anon key로 직접 insert/update할 때,
// created_by/updated_by에 채워 넣을 "지금 로그인한 직원의 id"를 가져온다.
export async function getCurrentStaffId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabaseAdminAuth.auth.getUser();
  return user?.id || null;
}

// 삭제 버튼 숨김, 운임기준표 수정 가능 여부 등 화면에서 "지금 로그인한 직원이
// 관리자인지" 확인할 때 사용. 실제 데이터 보호는 서버 API의 admin 체크가 담당하고,
// 이건 UI 표시용 (버튼 숨김/비활성화)이라는 점에 유의 — 이중 체크 중 화면단 체크.
export async function getCurrentStaffRole(): Promise<"admin" | "staff" | null> {
  const {
    data: { user },
  } = await supabaseAdminAuth.auth.getUser();
  if (!user) return null;
  const { data } = await supabaseAdminAuth
    .from("staff_accounts")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return (data?.role as "admin" | "staff") || null;
}

// 견적/화주등록신청/공개문의 처리 시 "처리자 이름"을 직접 타이핑하는 대신, 지금
// 로그인한 직원의 이름을 자동으로 채워 넣을 때 사용
export async function getCurrentStaffName(): Promise<string | null> {
  const {
    data: { user },
  } = await supabaseAdminAuth.auth.getUser();
  if (!user) return null;
  const { data } = await supabaseAdminAuth
    .from("staff_accounts")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();
  return data?.name || null;
}

// id/이름/role을 한 번에 조회 — 상단메뉴 로그인 정보 표시, 내 계정 화면 등에서 사용
export async function getCurrentStaffInfo(): Promise<
  { id: string; name: string; role: "admin" | "staff" } | null
> {
  const {
    data: { user },
  } = await supabaseAdminAuth.auth.getUser();
  if (!user) return null;
  const { data } = await supabaseAdminAuth
    .from("staff_accounts")
    .select("name,role")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { id: user.id, name: data.name, role: data.role as "admin" | "staff" };
}
