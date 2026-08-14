import LegalDoc from "@/components/LegalDoc";
import { EMAIL_POLICY_INTRO, EMAIL_POLICY_SECTIONS } from "@/lib/legal/emailPolicy";
import { LEGAL_EFFECTIVE_DATE_LABEL } from "@/lib/legalInfo";

// 이메일무단수집거부. 경로는 `/email-policy`이고 `app/robots.ts`의 Allow에 등록되어 있음.
//
// **문안은 이 파일이 아니라 `lib/legal/emailPolicy.ts`에 있다.**
// 화면 구조는 약관·처리방침과 같은 `components/LegalDoc.tsx`를 쓴다(31차에 통일 —
// 그 전에는 이 페이지만 자체 JSX였는데, 푸터 모달과 내용을 공유해야 해서 옮겼음).

export default function EmailPolicyPage() {
  return (
    <LegalDoc
      title="이메일 무단수집 거부"
      effectiveLabel={`게시일 ${LEGAL_EFFECTIVE_DATE_LABEL}`}
      intro={EMAIL_POLICY_INTRO}
      sections={EMAIL_POLICY_SECTIONS}
    />
  );
}
