"use client";

import { useState } from "react";
import Link from "next/link";
import LegalModal from "@/components/LegalModal";
import { TERMS_SECTIONS } from "@/lib/legal/terms";
import { PRIVACY_INTRO, PRIVACY_SECTIONS } from "@/lib/legal/privacy";
import { EMAIL_POLICY_INTRO, EMAIL_POLICY_SECTIONS } from "@/lib/legal/emailPolicy";
import { LEGAL_EFFECTIVE_DATE_LABEL } from "@/lib/legalInfo";

// 푸터의 법적 문서 링크 3개 + 그 링크가 여는 모달.
//
// **일반 클릭은 모달로 열고, URL 자체는 그대로 살아 있다.**
// `<Link href>`를 그대로 쓰기 때문에 새 탭으로 열기·링크 주소 복사·검색엔진 크롤링은
// 평소처럼 동작하고, 좌클릭만 가로채서(preventDefault) 모달을 띄운다.
// ⚠️ 새 탭/새 창 의도(Ctrl·Cmd·Shift·가운데 버튼)는 가로채지 않는다 — 가로채면
// "새 탭에서 열기"가 먹통이 되어 오히려 불편해짐.
//
// 조문 내용은 `lib/legal/*.ts`를 페이지와 그대로 공유하므로, 문서를 고치면 페이지와
// 모달에 동시에 반영된다(한쪽만 낡는 일이 없음).

export type DocKey = "terms" | "privacy" | "email-policy";

const DOCS: Record<
  DocKey,
  { href: string; label: string; title: string; effectiveLabel: string; intro?: any; sections: any }
> = {
  terms: {
    href: "/terms",
    label: "이용약관",
    title: "이용약관",
    effectiveLabel: `시행일 ${LEGAL_EFFECTIVE_DATE_LABEL}`,
    sections: TERMS_SECTIONS,
  },
  privacy: {
    href: "/privacy",
    label: "개인정보처리방침",
    title: "개인정보처리방침",
    effectiveLabel: `시행일 ${LEGAL_EFFECTIVE_DATE_LABEL}`,
    intro: PRIVACY_INTRO,
    sections: PRIVACY_SECTIONS,
  },
  "email-policy": {
    href: "/email-policy",
    label: "이메일무단수집거부",
    title: "이메일 무단수집 거부",
    effectiveLabel: `게시일 ${LEGAL_EFFECTIVE_DATE_LABEL}`,
    intro: EMAIL_POLICY_INTRO,
    sections: EMAIL_POLICY_SECTIONS,
  },
};

// 푸터에 노출하는 순서. 이메일무단수집거부는 시각적 위계를 한 단계 낮춘다(시안 스타일 지침)
const ORDER: { key: DocKey; emphasis: boolean }[] = [
  { key: "terms", emphasis: true },
  { key: "privacy", emphasis: true },
  { key: "email-policy", emphasis: false },
];

/**
 * @param linkClassName 링크에 쓸 클래스를 바꾼다. 기본값은 푸터용(`site-footer-link`).
 *   🔴 30차 랜딩이 어두운 CTA 띠 위에 이 링크를 놓으면서 필요해졌다 — 전역 클래스
 *   (`site-footer-link`)를 랜딩 스코프에서 덮어쓰면 **전역 클래스 재정의**가 되므로,
 *   랜딩이 자기 클래스(`landing-legal-link`)를 넘겨 쓰는 방식으로 갈랐다.
 *   ⚠️ 문서 목록·모달은 그대로 공유한다 — 두 곳이 갈리지 않는 것이 이 prop 의 목적이다.
 * @param only 보여줄 문서를 좁힌다. 31차 `/apply` 가 동의 항목마다 그 항목의 문서
 *   하나만 「전문 보기」로 여는 데 쓴다. 🔴 **문서 정의·모달은 그대로 공유한다** —
 *   화면이 조문을 따로 들고 있으면 개정 때 한쪽이 낡는다(시안이 실제로 약관 초안을
 *   코드에 통째로 들고 있었다).
 * @param label 링크에 쓸 글자를 바꾼다(기본값은 문서 이름).
 */
export default function LegalLinks({
  linkClassName,
  only,
  label,
}: { linkClassName?: string; only?: DocKey[]; label?: string } = {}) {
  const [openDoc, setOpenDoc] = useState<DocKey | null>(null);

  const shown = only ? ORDER.filter((o) => only.includes(o.key)) : ORDER;

  return (
    <>
      {shown.map(({ key, emphasis }) => {
        const doc = DOCS[key];
        return (
          <Link
            key={key}
            href={doc.href}
            className={
              linkClassName ?? (emphasis ? "site-footer-link" : "site-footer-link site-footer-link-sub")
            }
            onClick={(e) => {
              // 새 탭/새 창으로 열려는 클릭은 그대로 통과시킨다
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              setOpenDoc(key);
            }}
          >
            {label ?? doc.label}
          </Link>
        );
      })}

      {openDoc && (
        <LegalModal
          open
          onClose={() => setOpenDoc(null)}
          title={DOCS[openDoc].title}
          effectiveLabel={DOCS[openDoc].effectiveLabel}
          href={DOCS[openDoc].href}
          intro={DOCS[openDoc].intro}
          sections={DOCS[openDoc].sections}
        />
      )}
    </>
  );
}
