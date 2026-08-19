// 랜딩페이지 / 운송관리 셸 / 운송관리 로그인 화면 등 여러 곳에서 공유하는
// 회사 대표 연락처. 이 값 하나만 바꾸면 참조하는 화면 전체가 한 번에 갱신됨.
//
// ⚠️ 전화번호 상수는 두 개이고 현재 **같은 번호**를 쓴다. 번호를 바꿀 때는 반드시
// 둘을 함께 고칠 것 — 한쪽만 바꾸면 고객에게 나가는 견적서에 옛 번호가 찍힌다.
//   - 이 파일의 COMPANY_SUPPORT_PHONE — 고객센터 번호(랜딩·운송관리·SMS 문구)
//   - `lib/companyInfo.ts`의 COMPANY_INFO.phone — 견적서 PDF의 사업자 전화번호
//
// ⚠️ 이 번호는 **표시용 문의처**이며 SMS 발신번호(`SOLAPI_SENDER_PHONE` 환경변수)와는
// 별개다. 발신번호는 솔라피에 사전 등록 절차가 필요하므로 코드에서 건드리지 말 것.
export const COMPANY_SUPPORT_PHONE = "1661-2403";
export const COMPANY_SUPPORT_HOURS = "평일 09:00 ~ 18:00";

// 위 대표번호가 아직 발급 전 자리표시자인지 나타내는 플래그.
// next.config.mjs가 빌드·서버 기동 시 이 파일을 읽어 이 값이 true이면 콘솔에 경고를
// 출력함(빌드를 실패시키지는 않음). 33차에 실제 번호(1661-2403)가 발급되어 false로 바꿈.
// 이 플래그를 쓰는 이유: 경고 조건을 next.config.mjs에 넣으려면 번호 문자열을 그쪽에도
// 적어야 하는데, 그러면 대표번호가 두 곳에 하드코딩되어 단일 소스가 깨지기 때문.
export const COMPANY_SUPPORT_PHONE_IS_PLACEHOLDER = false;
