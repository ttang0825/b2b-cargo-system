import {
  COMPANY_ADDRESS,
  COMPANY_BIZ_REG_NO,
  COMPANY_CONTACT_EMAIL,
  COMPANY_FREIGHT_BROKER_LICENSE,
  COMPANY_LEGAL_NAME,
  COMPANY_SERVICE_NAME,
} from "./companyInfo";
import { COMPANY_SUPPORT_HOURS, COMPANY_SUPPORT_PHONE } from "./contactInfo";
import { OG_IMAGE_URL, SITE_URL } from "./siteUrl";

/**
 * 검색엔진에 회사를 기계가 읽는 형태로 알려주는 JSON-LD(schema.org) 구조화 데이터.
 * 화면에 아무것도 그리지 않는다 — `<script type="application/ld+json">` 한 덩어리다.
 *
 * 🔴 **이것을 넣은 이유는 동명 회사와의 구별이다.**
 *    네이버에 「위캐리 운송」을 검색하면 **물류업에만 「위캐리」가 셋** 나온다
 *    (`(주)위캐리로지스` 경기 부천 · `(주)위캐리` 제주 · `(주)위캐리컴퍼니` 서울).
 *    이름·주소·전화만으로는 검색엔진이 우리를 그중 하나로 합쳐 볼 수 있다.
 *    **사업자등록번호와 운송주선사업 허가번호가 그것을 갈라주는 유일한 식별자**다.
 *
 * 🔴 **값을 이 파일에 문자열로 적지 말 것** — 전부 기존 상수를 참조한다.
 *    상호·전화·주소·이메일은 이미 정의처가 하나씩 있고(`lib/companyInfo.ts`·
 *    `lib/contactInfo.ts`·`lib/siteUrl.ts`), 여기에 사본을 만들면 조용히 갈린다.
 *
 * 🔴 **`name` 은 「위캐리 운송」이다 — 「WeCarry」를 넣지 말 것.**
 *    영문 표기는 경쟁사 (주)위캐리로지스의 블로그(`WeCarry 블로그`)와 겹쳐서,
 *    검색엔진에 알려주는 브랜드명으로 쓰면 구별이 오히려 흐려진다.
 *    화면의 시각 브랜딩이 영문인 것은 별개이고 그것은 26차 확정 사항이다.
 *
 * 🔴 **`LocalBusiness` 로 바꾸지 말 것.** 그 타입은 **손님이 찾아오는 사업장**을 뜻한다.
 *    우리는 운송주선업이고 방문 매장이 아니며, 스마트플레이스를 쓰지 않기로 한
 *    결정(2026-09-04)과도 어긋난다. `Organization` 이 맞다.
 */
export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    // 브랜드명이 앞, 법인명은 legalName 으로 따로 — 검색엔진이 표시하는 것은 name 이다.
    name: COMPANY_SERVICE_NAME,
    legalName: COMPANY_LEGAL_NAME,
    url: SITE_URL,
    logo: OG_IMAGE_URL,
    image: OG_IMAGE_URL,
    email: COMPANY_CONTACT_EMAIL,
    telephone: COMPANY_SUPPORT_PHONE,
    address: {
      "@type": "PostalAddress",
      addressCountry: "KR",
      // ⚠️ `addressLocality`(시)·`addressRegion`(도)를 따로 두지 않았다 —
      //    `COMPANY_ADDRESS` 는 시·구가 포함된 한 줄 문자열이고, 그것을 코드에서
      //    쪼개면 주소 형식이 조금만 달라져도 깨진다. **중복해서 적으면 같은 값이
      //    두 번 나가 오히려 파서를 헷갈리게 한다** — 전체를 streetAddress 로 준다.
      streetAddress: COMPANY_ADDRESS,
    },
    // 🔴 동명 회사와 갈리는 지점이다. 지우지 말 것.
    identifier: [
      {
        "@type": "PropertyValue",
        name: "사업자등록번호",
        value: COMPANY_BIZ_REG_NO,
      },
      {
        "@type": "PropertyValue",
        name: "화물자동차 운송주선사업 허가번호",
        value: COMPANY_FREIGHT_BROKER_LICENSE,
      },
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: COMPANY_SUPPORT_PHONE,
        email: COMPANY_CONTACT_EMAIL,
        areaServed: "KR",
        availableLanguage: ["ko"],
        // 사람이 읽는 문자열이다(`평일 09:00 ~ 18:00`). 기계용 openingHours 형식이
        // 아니라 여기 두었다 — 상수 하나만 바꾸면 화면과 함께 갱신된다.
        description: COMPANY_SUPPORT_HOURS,
      },
    ],
    areaServed: {
      "@type": "Country",
      name: "대한민국",
    },
    // ⚠️ `sameAs`(공식 SNS·블로그 목록)는 **블로그를 만든 뒤에 넣을 자리**다.
    //    지금 넣을 것이 없어서 뺐다 — 빈 배열을 두면 아무 뜻이 없다.
    //    네이버 블로그를 개설하면 그 주소를 `sameAs: [ ... ]` 로 더할 것.
  };
}
