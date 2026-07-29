// DateTimePicker가 다루는 "YYYY-MM-DDTHH:mm" 형식(타임존 오프셋 없음)은
// 브라우저가 항상 "로컬 시각"으로 해석한다는 점을 이용한 변환 헬퍼.
//
// 쓰기(저장) 시: 이 문자열을 그대로 Supabase insert/update에 넘기면, 컬럼이
// timestamptz일 때 Postgres/PostgREST가 오프셋 없는 문자열을 세션 타임존(주로
// UTC)으로 해석해버려서 실제 저장 시각이 어긋난다(KST 기준 최대 9시간 밀림,
// 날짜가 바뀌는 경우도 생김) — 반드시 이 함수로 명시적 UTC ISO 문자열로 바꿔서
// 저장할 것.
//
// 읽기(불러오기) 시: DB에서 읽은 ISO 문자열(UTC)을 그대로 datetime-local류
// input에 넣으면 UTC 시각이 그대로 노출된다 — 이 함수로 로컬 시각 기준
// "YYYY-MM-DDTHH:mm"로 변환해서 넣을 것.

export function localInputToISOString(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function toLocalDateTimeInput(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
