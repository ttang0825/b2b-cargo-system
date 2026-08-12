import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// 대표 문의번호(lib/contactInfo.ts의 COMPANY_SUPPORT_PHONE)가 아직 자리표시자인 상태로
// 실서비스에 나가면, 화주가 랜딩·SMS 안내문의 번호로 전화해도 연결되지 않음.
// 빌드·서버 기동 시 콘솔에 경고만 출력하고 **빌드를 실패시키지는 않음** — 번호가
// 발급 대기 중인 동안에도 Preview 배포로 다른 작업을 테스트할 수 있어야 하기 때문.
// (번호 확정 후 하드 차단으로 바꿀지는 그때 재검토)
// 번호 문자열을 여기에 다시 적으면 하드코딩이 두 곳으로 늘어나므로, 소스 파일에서
// 자리표시자 플래그만 읽어서 판단함.
function warnIfSupportPhoneIsPlaceholder() {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "lib", "contactInfo.ts"), "utf8");
    if (/COMPANY_SUPPORT_PHONE_IS_PLACEHOLDER\s*=\s*true/.test(source)) {
      console.warn(
        "\n⚠️  COMPANY_SUPPORT_PHONE이 자리표시자입니다. 실서비스 공개 전 반드시 교체하세요.\n" +
          "   (lib/contactInfo.ts — 실제 번호로 바꾼 뒤 COMPANY_SUPPORT_PHONE_IS_PLACEHOLDER를 false로 변경)\n"
      );
    }
  } catch {
    // 경고용 부가 기능이므로 파일을 못 읽어도 빌드에 영향을 주지 않음
  }
}

warnIfSupportPhoneIsPlaceholder();

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
