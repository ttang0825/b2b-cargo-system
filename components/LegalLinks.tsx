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

type DocKey = "terms" | "privacy" | "email-policy";

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

export default function LegalLinks() {
  const [openDoc, setOpenDoc] = useState<DocKey | null>(null);

  return (
    <>
      {ORDER.map(({ key, emphasis }) => {
        const doc = DOCS[key];
        return (
          <Link
            key={key}
            href={doc.href}
            className={emphasis ? "site-footer-link" : "site-footer-link site-footer-link-sub"}
            onClick={(e) => {
              // 새 탭/새 창으로 열려는 클릭은 그대로 통과시킨다
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              setOpenDoc(key);
            }}
          >
            {doc.label}
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
