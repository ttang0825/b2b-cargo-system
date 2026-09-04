import Link from "next/link";
import ObfuscatedEmail from "@/components/ObfuscatedEmail";
import LegalLinks from "@/components/LegalLinks";
import { COMPANY_SUPPORT_PHONE, COMPANY_SUPPORT_HOURS } from "@/lib/contactInfo";
import { COMPANY_BUSINESS_INFO, COMPANY_LEGAL_NAME } from "@/lib/companyInfo";

// 공개 화면 공용 푸터.
//
// **전자상거래법 제10조(사이버몰의 표시사항)를 채우는 것이 이 푸터의 목적**이므로,
// 아래 항목은 임의로 빼지 말 것: 상호 / 대표자 / 주소 / 전화번호 / 이메일 /
// 사업자등록번호 / 통신판매업 신고번호 / 이용약관 / **호스팅사업자(Vercel Inc.)**.
// 여기에 이 사업 고유 항목인 **화물자동차 운송주선사업 허가번호**와
// **개인정보 보호책임자**를 더했다.
//
// **값은 전부 상수 참조** — 상호·대표자·주소·사업자등록번호는 `lib/companyInfo.ts`,
// 대표번호는 `lib/contactInfo.ts`가 유일 정의처다. 여기에 값을 직접 적지 말 것.
//
// **로고를 넣지 않았음**: 4-1 시안에 푸터 로고가 없고, 헤더에 이미 워드마크가 있어
// 한 화면에 두 번 나오면 오히려 산만해짐. 넣게 되면 새 이미지를 만들지 말고
// `components/BrandLogo.tsx`를 재사용할 것.
//
// **브랜드 옐로(#8a6d00 계열)는 고객센터 번호에만 사용** — 사이트 전반 적용은 아직
// 미결정이라 다른 요소로 번지지 않게 할 것.

// 일반 페이지 링크. `/about`·`/vehicles`는 4차에서 신설된 페이지라 4-1 시안(그 전에
// 작성됨)에는 없었으나 지시서 지침대로 함께 노출한다.
//
// ⚠️ 법적 문서 3종(이용약관·개인정보처리방침·이메일무단수집거부)은 여기가 아니라
// `components/LegalLinks.tsx`가 담당한다 — 그쪽은 클릭 시 모달로 열어야 해서
// 클라이언트 컴포넌트여야 하기 때문(이 푸터는 서버 컴포넌트로 두는 편이 가볍다).
const FOOTER_LINKS: { href: string; label: string }[] = [
  { href: "/about", label: "회사소개" },
  { href: "/vehicles", label: "차량·요금 안내" },
  // 🔴 「문의·신청 현황」(`/status`)을 여기에 다시 넣지 말 것 — 사용자 지시(2026-09-01).
  // 30차 리뷰에 랜딩 CTA 하단에서 뺀 데 이어 **공개 화면 전체에서 없애기로 확정**됐다.
  // 라우트 자체는 살아 있지만(직접 주소로만 닿는다) 어느 화면도 링크하지 않는다.
];

// 사업자 표시사항. [라벨, 값] 쌍으로 두고 한 줄씩 렌더링한다.
// 🔴 **표시사항의 정의처는 `lib/companyInfo.ts` 의 `COMPANY_BUSINESS_INFO` 하나다** —
//    여기에 항목을 다시 나열하지 말 것. 예전에는 이 파일이 같은 목록을 따로 들고 있었고
//    65차가 「두 벌이면 조용히 갈린다」며 합치라고 남긴 것을 이행한 것이다.
//    「사업자정보」 모달(`components/BusinessInfoModal.tsx`)도 같은 배열을 읽는다.
// ⚠️ **「상호」만 여기서 앞에 붙인다** — 모달은 상호를 `CompanyNameMark`(로고형 표기)로
//    따로 그리므로 `COMPANY_BUSINESS_INFO` 에 상호가 들어 있지 않다. 푸터는 평문 한 줄이라
//    이 자리에서 채운다. 🔴 상호를 그 배열로 옮기면 모달에 상호가 두 번 나온다.
const BUSINESS_INFO: [string, string][] = [
  ["상호", COMPANY_LEGAL_NAME],
  ...COMPANY_BUSINESS_INFO,
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        {/* 고객센터 */}
        <div className="site-footer-contact">
          <div className="site-footer-contact-label">📞 고객센터</div>
          <a href={`tel:${COMPANY_SUPPORT_PHONE}`} className="site-footer-phone">
            {COMPANY_SUPPORT_PHONE}
          </a>
          <div className="site-footer-hours">
            {COMPANY_SUPPORT_HOURS}
            <span className="site-footer-hours-sub"> (주말·공휴일 휴무)</span>
          </div>
          <ObfuscatedEmail className="site-footer-email" />
        </div>

        <hr className="site-footer-divider" />

        {/* 브랜드 운영 고지 — 사업자 정보보다 진하게(시안 스타일 지침) */}
        <p className="site-footer-brand-note">
          WeCarry 운송은 {COMPANY_LEGAL_NAME}가 운영하는 화물운송 주선 브랜드입니다.
        </p>

        {/* 사업자 표시사항 */}
        <div className="site-footer-biz">
          {BUSINESS_INFO.map(([label, value]) => (
            <div key={label} className="site-footer-biz-row">
              <span className="site-footer-biz-label">{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>

        {/* 링크 */}
        <nav className="site-footer-links">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="site-footer-link">
              {link.label}
            </Link>
          ))}
          {/* 법적 문서 3종 — 클릭하면 모달로 열리고, URL은 그대로 살아 있음 */}
          <LegalLinks />
        </nav>

        <div className="site-footer-copy">© 2026 {COMPANY_LEGAL_NAME}. All rights reserved.</div>
      </div>
    </footer>
  );
}
