import LegalDoc from "@/components/LegalDoc";
import { TERMS_SECTIONS } from "@/lib/legal/terms";
import { LEGAL_EFFECTIVE_DATE_LABEL } from "@/lib/legalInfo";

// 이용약관. **조문 내용은 이 파일이 아니라 `lib/legal/terms.ts`에 있다.**
// 화면 구조는 `components/LegalDoc.tsx`가 개인정보처리방침과 공유한다.

export default function TermsPage() {
  return (
    <LegalDoc
      title="이용약관"
      effectiveLabel={`시행일 ${LEGAL_EFFECTIVE_DATE_LABEL}`}
      sections={TERMS_SECTIONS}
    />
  );
}
