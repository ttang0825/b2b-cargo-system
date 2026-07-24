import { supabaseAdminAuth } from "@/lib/supabaseAdminAuthClient";

// 클라이언트에서 companies/quotes/orders 등을 anon key로 직접 insert/update할 때,
// created_by/updated_by에 채워 넣을 "지금 로그인한 직원의 id"를 가져온다.
export async function getCurrentStaffId(): Promise<string | null> {
  const { data, error } = await supabaseAdminAuth.auth.getUser();
  // TODO(임시 디버그): quotes_created_by_fkey 위반 원인 확인 후 제거
  console.log("[getCurrentStaffId] user:", data?.user?.id, "error:", error);
  return data?.user?.id || null;
}
