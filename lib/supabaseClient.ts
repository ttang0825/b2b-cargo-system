import { createBrowserClient } from "@supabase/ssr";

// 관리자 화면의 데이터 조회·수정에 쓰는 클라이언트.
//
// 🔴 19차부터 이 질의는 "로그인한 직원의 세션"으로 나간다(그 전에는 anon 이었다).
//   @supabase/ssr 의 createBrowserClient 는 세션을 **쿠키**에 저장하므로,
//   lib/supabaseAdminAuthClient.ts 가 만든 로그인 세션을 그대로 물고 나간다.
//   브라우저에서는 createBrowserClient 가 모듈 단위 싱글턴이라 두 파일이 결국
//   **같은 인스턴스**를 쓴다 — GoTrue 가 두 개 생기지 않는다.
// ⚠️ anon key 를 안 쓰게 된 것이 아니다. 키는 그대로이고, 로그인 세션의 JWT 가 함께
//   실려서 Postgres 가 `authenticated` 롤로 평가한다는 점만 달라졌다.
//   **세션이 없으면 여전히 `anon`** 이라 공개 화면은 전과 똑같이 동작한다.
//
// 🔴 정책 조건에는 반드시 "재직 직원임"을 확인하는 절이 있어야 한다.
//   `authenticated` 롤은 **화주포털 계정도 같이 쓰기 때문**에, 조건을 단순
//   `authenticated` 로 두면 화주가 관리자 데이터를 읽는다.
//
//     exists (
//       select 1 from staff_accounts
//       where id = auth.uid() and status = 'active'
//     )
//
//   운영 DB 에는 이것을 담은 public.is_active_staff() 함수가 있고(19차,
//   migrations/2026-08-26_staff_rls_policies.sql), 직원 전용 정책 15개가 이 함수를
//   쓴다. staff_accounts 에도 RLS 가 걸려 있어 정책 안에서 그냥 서브쿼리로 조회하면
//   조용히 false 가 될 수 있으므로 그 함수는 security definer 다.
//
// 🔴 19차는 권한을 조이지 않았다. anon 정책 19개가 아직 그대로 열려 있고, 화면이
//   도는 것은 그 정책 덕분이 아니라 새로 만든 직원 정책 덕분이다. **"이제 안전하다"고
//   오해하지 말 것** — 다음 차수 ②(anon 정책 교체) → ④(RLS 꺼진 13개 켜기) →
//   ③(anon GRANT 회수)까지 가야 실제로 잠긴다.
//
// ⚠️ 공개 화면(`/`·`/vehicles`·`/quote`·`/apply`)은 세션이 없어 anon 으로 붙는 것이
//   **의도된 동작**이다. "정리" 대상이 아니다.
// ⚠️ 화주포털은 lib/supabaseCustomerClient.ts 를 쓰고, 그쪽은 예전부터 화주 세션이
//   실려 이미 `authenticated` 로 붙고 있었다 — 이번 변경과 무관하다.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
