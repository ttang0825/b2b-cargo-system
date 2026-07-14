// 여러 화면(차주관리, 운송오더 등)에서 공통으로 쓰는 선택지들

export const REGIONS = [
  "서울",
  "인천",
  "경기",
  "강원",
  "충북",
  "충남",
  "대전",
  "세종",
  "전북",
  "전남",
  "광주",
  "경북",
  "경남",
  "대구",
  "부산",
  "울산",
  "제주",
];

// 운임기준표의 "상하차방식" 가산기준과 동일한 항목을 재사용 (시스템 전체 용어 통일)
export const LOAD_UNLOAD_CONDITIONS = [
  "지게차/도크",
  "기사도움",
  "1인수작업",
  "2인수작업",
  "계단/엘리베이터",
  "크레인/장비협의",
  "협의",
];

// 입력값에서 숫자만 뽑아 한국 전화번호 형식으로 자동 하이픈 삽입
export function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  if (digits.length < 11) {
    // 02로 시작하는 서울 지역번호(10자리)까지 고려
    if (digits.startsWith("02")) {
      return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}
