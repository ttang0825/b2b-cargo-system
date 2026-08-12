// 랜딩페이지 / 화주포털 셸 / 화주포털 로그인 화면 등 여러 곳에서 공유하는
// 회사 대표 연락처. 지금 값은 자리표시자(placeholder)이며, 실제 번호가
// 정해지면 이 값 하나만 바꾸면 참조하는 화면 전체가 한 번에 갱신됨.
export const COMPANY_SUPPORT_PHONE = "1588-0000";
export const COMPANY_SUPPORT_HOURS = "평일 09:00 ~ 18:00";

// 위 대표번호가 아직 발급 전 자리표시자임을 나타내는 플래그.
// next.config.mjs가 빌드·서버 기동 시 이 파일을 읽어 이 값이 true이면 콘솔에 경고를
// 출력함(빌드를 실패시키지는 않음 — 번호 발급 대기 중에도 Preview 배포 테스트가
// 가능해야 하므로). **실제 대표번호로 교체할 때 위 값과 이 플래그를 같이 바꿀 것.**
// 이 플래그를 쓰는 이유: 경고 조건을 next.config.mjs에 넣으려면 번호 문자열을 그쪽에도
// 적어야 하는데, 그러면 대표번호가 두 곳에 하드코딩되어 단일 소스가 깨지기 때문.
export const COMPANY_SUPPORT_PHONE_IS_PLACEHOLDER = true;
