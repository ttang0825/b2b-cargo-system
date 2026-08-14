"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { useScrolled } from "@/lib/useScrolled";

// 공개 하위 화면(`/quote`, `/apply`, `/status`, `/quote/status`, `/apply/status`)의 공용 헤더.
//
// 이 5개 화면은 원래 **완전히 똑같은 헤더 JSX를 각자 복사해서** 갖고 있었다(2종 —
// "로고만" / "로고 + 현황조회 링크"). PR #77에서 브랜드 로고를 통일할 때도 5곳을 각각
// 고쳐야 했고, 스티키를 붙이려면 또 5곳을 고쳐야 해서 이번에 하나로 합쳤다.
// **공개 하위 화면에 헤더를 새로 만들지 말고 이 컴포넌트를 쓸 것.**
//
// 랜딩·회사소개·차량안내·법적 문서는 메뉴와 모바일 드롭다운이 있는
// `components/LandingHeader.tsx`를 쓴다(내용이 달라 일부러 합치지 않음).
// **다만 스티키 동작과 겉모습은 `.public-header` CSS 클래스를 양쪽이 공유**하므로
// 헤더 높이·배경·그림자를 바꿀 때는 그 클래스 한 곳만 고치면 된다.
//
// ⚠️ 관리자(`/admin`)·운송관리(`/customer`) 화면의 `TopNav.tsx`와는 무관하다. 건드리지 말 것.
export default function PublicPageHeader({
  /** 우측에 "문의·신청 현황 조회" 링크를 노출할지 (`/quote`·`/apply`만 true) */
  showStatusLink = false,
}: {
  showStatusLink?: boolean;
}) {
  const scrolled = useScrolled();

  return (
    <header className={scrolled ? "public-header public-header-scrolled" : "public-header"}>
      <div
        className="container"
        style={{ padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        {/* 홈으로 가는 브랜드 링크는 랜딩 헤더와 같은 로고를 씀(PR #77 리뷰 — 화면마다
            로고/텍스트가 갈려 통일성이 없다는 지적). 로고 SVG는 aria-hidden이라 링크가
            aria-label로 이름을 제공해야 함 */}
        <Link
          href="/"
          aria-label="위캐리 운송 홈"
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 44,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <BrandLogo className="landing-brand-logo" />
        </Link>

        {showStatusLink && (
          <Link
            href="/status"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--accent)",
              padding: "8px 14px",
              borderRadius: 8,
              background: "var(--accent-soft)",
              textDecoration: "none",
            }}
          >
            문의·신청 현황 조회
          </Link>
        )}
      </div>
    </header>
  );
}
