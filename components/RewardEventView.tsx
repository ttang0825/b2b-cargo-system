import Link from "next/link";
import PublicPageHeader from "@/components/PublicPageHeader";
import SiteFooter from "@/components/SiteFooter";
import { COMPANY_SUPPORT_PHONE, COMPANY_SUPPORT_HOURS } from "@/lib/contactInfo";
import {
  REWARD_EVENT_CTA_TEXT,
  REWARD_EVENT_EYEBROW,
  REWARD_EVENT_SCOPE_NOTE,
  rewardEventHeroLines,
  rewardEventSections,
  type RewardEventTerms,
} from "@/lib/rewardEventContent";

// 적립 이벤트 안내 화면을 **그리는 부품** — 값은 인자로만 받는다(DB 를 읽지 않는다).
//
// 🚨 **왜 `app/reward-event/page.tsx` 안에 두지 않았나 — 빌드가 막는다.**
//    Next 의 `page.tsx` 는 정해진 이름(`default`·`metadata`·`dynamic` 등) 말고
//    **다른 이름 있는 export 를 허용하지 않는다** — 처음에 그 파일에 두었더니
//    `next build` 가 *"RewardEventView is not a valid Page export field"* 로 멈췄다.
//    🔴 **`npx tsc --noEmit` 은 이것을 못 잡는다**(Next 빌드 단계의 검사다) —
//       CLAUDE.md §7 의 「로컬은 되는데 빌드만 실패」와 같은 자리다.
//    🔴 **다시 `page.tsx` 로 옮기지 말 것.**
//
// 🔴 **본문 문장은 여기에 없다** — `lib/rewardEventContent.ts` 가 유일 정의처다.
// 🔴 **화주포털 부품(`.portal-v2`)을 끌어오지 말 것** — 토큰이 그 스코프 안에만 있다.

export default function RewardEventView({
  terms,
  error,
}: {
  terms: RewardEventTerms | null;
  error: string | null;
}) {
  return (
    <>
      <PublicPageHeader />
      <main className="rwe-page">
        <section className="rwe-hero">
          <div className="rwe-eyebrow">{REWARD_EVENT_EYEBROW}</div>
          {terms ? (
            <h1 className="rwe-title">
              {rewardEventHeroLines(terms).before}{" "}
              <span className="rwe-rate">{rewardEventHeroLines(terms).rate}</span>{" "}
              {rewardEventHeroLines(terms).after}
            </h1>
          ) : (
            <h1 className="rwe-title">적립 이벤트 안내</h1>
          )}
          {/* 🔴 **이 줄을 지우지 말 것** — 「누구나 자동 적립」으로 읽히는 것을 막는
              문장이고, 이 페이지가 존재하게 된 이유다(표시광고법 제3조). */}
          <p className="rwe-scope">{REWARD_EVENT_SCOPE_NOTE}</p>
        </section>

        <div className="container rwe-body">
          {/* 🔴 **조회 실패와 「진행 중인 이벤트 없음」을 다른 말로 한다**(원칙 55번) —
              빈 카드를 그리면 화주가 제도를 오해한다. */}
          {!terms && (
            <section className="card rwe-card">
              <h2 className="rwe-h2">안내 내용을 불러오지 못했습니다</h2>
              <p className="rwe-lead">
                {error === "none"
                  ? "현재 진행 중인 적립 이벤트가 없습니다."
                  : "일시적인 문제로 조건을 불러오지 못했습니다."}
              </p>
              <ul className="rwe-list">
                <li>아래 고객센터로 문의해 주시면 바로 안내드립니다.</li>
              </ul>
            </section>
          )}

          {terms &&
            rewardEventSections(terms).map((sec) => (
              <section className="card rwe-card" key={sec.heading}>
                <h2 className="rwe-h2">{sec.heading}</h2>
                {sec.lead && <p className="rwe-lead">{sec.lead}</p>}
                <ul className="rwe-list">
                  {sec.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
                {sec.example && (
                  <div className="rwe-ex">
                    <span className="rwe-ex-label">예시</span>
                    {sec.example.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}
              </section>
            ))}

          <section className="rwe-cta">
            <p>{REWARD_EVENT_CTA_TEXT}</p>
            <a className="rwe-btn rwe-btn-yellow" href={`tel:${COMPANY_SUPPORT_PHONE}`}>
              고객센터 {COMPANY_SUPPORT_PHONE}
            </a>
            <p className="rwe-cta-hours">{COMPANY_SUPPORT_HOURS}</p>
            {/* 🔴 내부 경로는 `next/link` 다(원칙 31번) — `<a href>` 는 하드 리로드된다.
                🔴 초안의 `/login` 이 아니라 `/customer/login` 이다. */}
            <div className="rwe-cta-links">
              <Link href="/quote">무료 견적 문의</Link>
              <span aria-hidden="true">·</span>
              <Link href="/customer/login">운송관리 로그인</Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
