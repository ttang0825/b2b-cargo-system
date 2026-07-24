import { supabaseAdminAuth } from "@/lib/supabaseAdminAuthClient";

// 클라이언트에서 companies/quotes/orders 등을 anon key로 직접 insert/update할 때,
// created_by/updated_by에 채워 넣을 "지금 로그인한 직원의 id"를 가져온다.
export async function getCurrentStaffId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabaseAdminAuth.auth.getUser();
  return user?.id || null;
}
