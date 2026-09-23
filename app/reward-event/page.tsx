import RewardEventView from "@/components/RewardEventView";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import type { RewardEventTerms } from "@/lib/rewardEventContent";

// 적립 이벤트 안내(공개 화면) — 사용자가 준 초안 HTML 을 바탕으로 만들었다(2026-09-22).
//
// 🔴 **본문은 이 파일에 없다 — `lib/rewardEventContent.ts` 가 유일 정의처다.**
//    초안에서 **다섯 곳을 고치고 셋을 더한 이유**가 그 파일 머리말에 있다.
//    🔴 **문장을 이 화면에 다시 적지 말 것** — 문자(`rewardIntroMessage`)와 이 페이지가
//       같은 제도를 설명하므로, 두 벌이 되면 한쪽만 고쳐진다.
//
// 🔴 **숫자를 하드코딩하지 않는다 — 캠페인을 읽는다.** 요율·기간·최소 사용액·사용
//    종료일은 담당자가 바꿀 수 있다. 🚨 **실측이 그 필요를 증명했다** — 초안은 기간
//    시작을 `2026년 9월 1일` 로 적었는데 DB 는 **2026-08-07** 이다.
//
// 🔴 **서버 컴포넌트다**(`/q/[token]` 과 반대) — 그 화면은 특정 화주의 상호·금액이
//    담겨서 「주소를 열어도 HTML 에 안 실리게」 클라이언트로 두었지만, 이 화면은
//    **어느 화주의 정보도 담지 않는** 제도 설명이라 서버에서 그리는 것이 맞다
//    (자바스크립트가 꺼져도 읽히고, 문자로 링크를 받아 여는 자리라 첫 화면이 빠르다).
//
// 🔴 **`force-dynamic` + `createServiceClient()` 둘 다**(원칙 21번) — 앞의 것만으로는
//    supabase-js 내부 `fetch` 가 Next Data Cache 를 타서, 담당자가 캠페인을 고쳐도
//    **옛 값이 계속 보인다.**
//
// 🔴 **`reward_campaigns` 는 RLS on + 정책 0개**다(리워드 1차) — anon 으로는 못 읽는다.
//    🔴 **그렇다고 정책을 열지 말 것**(화주와 직원이 둘 다 `authenticated` 롤이다).
//       읽는 값이 「제도 조건」뿐이라 service_role 로 서버에서만 읽는다.
//
// 🔴 **화주포털 부품(`.portal-v2`)을 끌어오지 말 것** — 토큰이 그 스코프 안에만 있어
//    색이 아예 안 나온다(PR #145 실측). 공개 공용 클래스 + 이 화면 전용 `.rwe-*` 만 쓴다.
//
// ⚠️ **헤더는 `PublicPageHeader`(로고만)다.** 초안 헤더에는 「무료 견적 문의」·
//    「운송관리 로그인」 두 버튼이 있었지만 **공개 헤더는 두 종류뿐이고 새로 만들지
//    않는다**(HANDOFF §3). 두 버튼은 **맨 아래 문의 블록**이 대신한다.
//    🔴 초안의 `/login` 은 이 저장소에 없는 경로다 — `/customer/login` 이 맞다.

export const dynamic = "force-dynamic";

/**
 * 🔴 **그리는 부품을 따로 뺀 것은 검증 때문이다** — 이 화면은 캠페인을 DB 에서
 *    읽으므로 하네스에서 열면 늘 「불러오지 못했습니다」만 나온다. 부품이 값을
 *    인자로 받으면 **하네스가 화면과 같은 JSX·같은 CSS 를 그대로** 그릴 수 있다.
 *    🔴 **하네스에 JSX 를 복사하지 말 것** — 그 순간 재는 대상이 화면이 아니게 된다.
 */
type LoadResult =
  | { terms: RewardEventTerms; error: null }
  | { terms: null; error: string };

async function loadTerms(): Promise<LoadResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { terms: null, error: "server" };

  const admin = createServiceClient(url, serviceKey);
  // 🔴 **`error` 를 버리지 말 것**(원칙 55번) — 버리면 조회 실패가 「이벤트 없음」으로
  //    보이고, 화주는 **끝난 것으로 읽는다.** 둘을 갈라서 다른 말을 한다.
  const { data, error } = await admin
    .from("reward_campaigns")
    .select("start_date,earn_end_date,use_end_date,earn_rate,minimum_use_amount")
    .eq("active", true)
    .limit(1);
  if (error) return { terms: null, error: "load" };

  const row = (data || [])[0];
  if (!row) return { terms: null, error: "none" };

  return {
    terms: {
      // 🚨 **`earn_rate` 는 분수다**(`numeric(6,4)` · 실제 `0.0500`) — 그대로 넘기면
      //    화면에 **「0.05%」**가 찍힌다. 관리자 화면 둘도 `* 100` 해서 그린다.
      earnRatePercent: Number(row.earn_rate) * 100,
      startDate: String(row.start_date || "").slice(0, 10),
      earnEndDate: String(row.earn_end_date || "").slice(0, 10),
      useEndDate: String(row.use_end_date || "").slice(0, 10),
      minimumUseAmount: Math.max(0, Math.round(Number(row.minimum_use_amount) || 0)),
    },
    error: null,
  };
}

export default async function RewardEventPage() {
  const { terms, error } = await loadTerms();
  return <RewardEventView terms={terms} error={error} />;
}
