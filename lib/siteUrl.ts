// 서버 전용 코드(자동발송 SMS 등)에서 "포털 접속 주소"를 문구에 넣어야 할 때 씀.
// 화면 코드는 지금까지 window.location.origin으로 만들어왔지만, 자동발송은
// 브라우저 요청 없이 서버에서 바로 실행되므로 그 방식을 쓸 수 없음. Vercel이
// 서버리스 함수에 항상 주입하는 VERCEL_PROJECT_PRODUCTION_URL(프로덕션 도메인,
// Preview에서도 값이 채워짐)을 우선 쓰고, 없으면 현재 배포의 VERCEL_URL로 대체.
// 커스텀 도메인이 연결되면(로드맵 "다음 예정 작업" 3번) 이 값도 자동으로 그 도메인을
// 가리키게 됨 — 코드 수정 불필요.
export function getSiteUrl(): string {
  // Vercel은 프로덕션·Preview 모든 서버리스 함수 실행에 이 값들을 자동 주입하므로
  // 실제 배포 환경에서는 항상 채워짐. 로컬(next dev)에서만 비어있을 수 있음 —
  // 그 경우 존재하지 않는 도메인을 지어내지 않고 상대경로로만 대체함(로컬에서
  // 실제 SMS를 발송할 일 자체가 없으므로 문제되지 않음).
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : "";
}

export function getPortalLoginUrl(): string {
  return `${getSiteUrl()}/customer/login`;
}
