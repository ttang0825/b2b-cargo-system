import LandingHeader from "@/components/LandingHeader";
import SiteFooter from "@/components/SiteFooter";
import { LEGAL_EFFECTIVE_DATE_LABEL } from "@/lib/legalInfo";

// 이메일무단수집거부. 경로는 `/email-policy`로 정했고 `app/robots.ts`의 Allow에도 추가함.
//
// ⚠️ **아래 법령 인용문은 현행 조문 그대로다 — 임의로 다듬거나 요약하지 말 것.**
// (경쟁사 다수가 개정 전 구 조문을 그대로 인용하고 있어 별첨에서 특별히 지적된 부분.
//  현행 제50조의2 제1항은 "수집을 거부하는 의사가 명시된"이 아니라 **"인터넷 홈페이지
//  운영자 또는 관리자의 사전 동의 없이"**로 되어 있음.)
//
// 이 페이지가 있어야만 보호받는 것은 아니지만(현행법은 페이지 유무와 무관하게 적용),
// 거부 의사를 명시해 두는 실익이 있어 게시한다. 실효적인 방어는 **푸터 이메일을
// 난독화**하는 쪽이며 그건 `components/ObfuscatedEmail.tsx`가 담당한다.

const ARTICLE_50_2 = [
  "① 누구든지 인터넷 홈페이지 운영자 또는 관리자의 사전 동의 없이 인터넷 홈페이지에서 자동으로 전자우편주소를 수집하는 프로그램이나 그 밖의 기술적 장치를 이용하여 전자우편주소를 수집하여서는 아니 된다.",
  "② 누구든지 제1항을 위반하여 수집된 전자우편주소를 판매·유통하여서는 아니 된다.",
  "③ 누구든지 제1항과 제2항에 따라 수집·판매 및 유통이 금지된 전자우편주소임을 알면서 이를 정보 전송에 이용하여서는 아니 된다.",
];

export default function EmailPolicyPage() {
  return (
    <div className="portal-theme">
      <LandingHeader />

      <main className="container legal-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">이메일 무단수집 거부</h1>
            <p className="page-desc">게시일 {LEGAL_EFFECTIVE_DATE_LABEL}</p>
          </div>
        </div>

        <section className="card legal-card">
          <p className="legal-p">
            본 웹사이트에 게시된 이메일 주소가 전자우편 수집 프로그램이나 그 밖의 기술적 장치를 이용하여 무단으로
            수집되는 것을 거부하며, 이를 위반한 경우 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」에 따라
            형사처벌 대상이 될 수 있음을 알려드립니다.
          </p>
        </section>

        <section className="card legal-card">
          <h2 className="legal-chapter">「정보통신망 이용촉진 및 정보보호 등에 관한 법률」</h2>

          <article className="legal-article">
            <h3 className="legal-heading">제50조의2 (전자우편주소의 무단 수집행위 등 금지)</h3>
            {ARTICLE_50_2.map((clause) => (
              <p key={clause} className="legal-p">
                {clause}
              </p>
            ))}
          </article>

          <article className="legal-article">
            <h3 className="legal-heading">제74조 (벌칙)</h3>
            <p className="legal-p">
              ① 다음 각 호의 어느 하나에 해당하는 자는 1년 이하의 징역 또는 1천만원 이하의 벌금에 처한다.
            </p>
            <p className="legal-p legal-p-indent">
              5. 제50조의2를 위반하여 전자우편주소를 수집·판매·유통하거나 정보 전송에 이용한 자
            </p>
          </article>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
