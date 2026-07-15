import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// storageKey를 다르게 지정해서, 관리자 화면(lib/supabaseClient.ts)이 쓰는
// 기본 세션 저장소와 완전히 분리된 별도 공간에 화주 로그인 정보를 저장합니다.
// 이렇게 하면 같은 브라우저에서 관리자 화면과 화주포털을 동시에 열어도
// 서로의 로그인 상태가 절대 섞이지 않습니다.
export const supabaseCustomer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "customer-portal-auth",
    persistSession: true,
    autoRefreshToken: true,
  },
});
