// 목록 화면에서는 저장된 전체 주소(도로명주소+상세주소 fullOrigin 패턴,
// 원칙 37번) 대신 "시/도 시/군/구 도로명"까지만 간략히 보여줌 —
// 상세번지·건물명은 생략. "로"/"길"로 끝나는 첫 토큰까지만 추출하는
// 방식이라 지번주소 등 매칭이 안 되는 경우엔 원본 문자열을 그대로 반환함
export function shortAddress(addr: string | null | undefined): string {
  if (!addr) return "-";
  const match = addr.match(/^(.*?(?:로|길))(?=\s|$)/);
  return match ? match[1] : addr;
}
