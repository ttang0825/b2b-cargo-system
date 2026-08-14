import LegalDoc from "@/components/LegalDoc";
import { PRIVACY_INTRO, PRIVACY_SECTIONS } from "@/lib/legal/privacy";
import { LEGAL_EFFECTIVE_DATE_LABEL } from "@/lib/legalInfo";

// 개인정보처리방침. **본문 내용은 이 파일이 아니라 `lib/legal/privacy.ts`에 있다.**
// 화면 구조는 `components/LegalDoc.tsx`가 이용약관과 공유한다.

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="개인정보처리방침"
      effectiveLabel={`시행일 ${LEGAL_EFFECTIVE_DATE_LABEL}`}
      intro={PRIVACY_INTRO}
      sections={PRIVACY_SECTIONS}
    />
  );
}
