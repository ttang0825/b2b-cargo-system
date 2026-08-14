import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// 자리표시자로 남아 있는 값이 실서비스에 그대로 나가는 것을 막기 위한 경고 목록.
//
// 빌드·서버 기동 시 콘솔에 경고만 출력하고 **빌드를 실패시키지는 않음** — 값이
// 확정되기를 기다리는 동안에도 Preview 배포로 다른 작업을 테스트할 수 있어야 하기 때문.
// (전부 확정된 뒤에 하드 차단으로 바꿀지는 그때 재검토)
//
// 값(전화번호 등) 자체를 여기에 다시 적으면 하드코딩이 두 곳으로 늘어나므로,
// 소스 파일에 둔 `*_IS_PLACEHOLDER` 플래그만 읽어서 판단함.
// **새 자리표시자가 생기면 소스 파일에 플래그를 두고 이 배열에 한 줄 추가할 것.**
const PLACEHOLDER_CHECKS = [
  {
    file: "lib/contactInfo.ts",
    flag: "COMPANY_SUPPORT_PHONE_IS_PLACEHOLDER",
    label: "COMPANY_SUPPORT_PHONE",
    note: "고객센터 대표번호 — 랜딩·회사소개·운송관리·SMS 문구 8종에 노출됨",
  },
  {
    // 고객센터 번호와 별개로 관리되는 값(전자상거래법 표시사항의 사업자 전화번호).
    // 실제로 다른 번호를 쓰는 경우가 많아 두 상수를 합치지 않기로 함 — 대신 둘 중
    // 하나만 바꾸고 나머지를 잊는 사고를 막으려고 양쪽 다 경고를 검
    file: "lib/companyInfo.ts",
    flag: "COMPANY_INFO_PHONE_IS_PLACEHOLDER",
    label: "COMPANY_INFO.phone",
    note: "견적서 PDF 상단 발행업체 TEL로 출력됨(고객에게 전달되는 문서)",
  },
  {
    file: "lib/legalInfo.ts",
    flag: "LEGAL_EFFECTIVE_DATE_IS_PLACEHOLDER",
    label: "LEGAL_EFFECTIVE_DATE",
    note: "이용약관 부칙·개인정보처리방침 시행일·이메일무단수집거부 게시일 총 5곳에 표시됨",
  },
  {
    file: "lib/legalInfo.ts",
    flag: "VERCEL_PRIVACY_CONTACT_IS_PLACEHOLDER",
    label: "VERCEL_PRIVACY_CONTACT",
    note: '개인정보처리방침 제6조(국외 이전)의 "이전받는 자의 연락처" — 현재 "확인 중"으로 표시됨',
  },
];

function warnAboutPlaceholders() {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const check of PLACEHOLDER_CHECKS) {
    try {
      const source = readFileSync(join(here, check.file), "utf8");
      if (new RegExp(`${check.flag}\\s*=\\s*true`).test(source)) {
        console.warn(
          `\n⚠️  ${check.label}이(가) 자리표시자입니다. 실서비스 공개 전 반드시 교체하세요.\n` +
            `   ${check.note}\n` +
            `   (${check.file} — 실제 값으로 바꾼 뒤 ${check.flag}를 false로 변경)\n`
        );
      }
    } catch {
      // 경고용 부가 기능이므로 파일을 못 읽어도 빌드에 영향을 주지 않음
    }
  }
}

warnAboutPlaceholders();

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
