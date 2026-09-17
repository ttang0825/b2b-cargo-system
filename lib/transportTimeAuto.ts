/**
 * 희망 상차일시 → 운송시간 자동선택 — **유일 정의처**(39차 C장).
 *
 * 사용자 지시: *"견적문의와 발주요청의 운송시간은 희망상차일시 기준으로 자동 선택되게
 * (필요시 직접 변경)"* · 범위 확정: **여섯 종 전부 자동**(2026-09-16).
 *
 * 🔴 **이 파일이 생기기 전에는 관리자 견적 등록 화면 안에만 로직이 있었고 틀렸다.**
 *    ① `출퇴근/혼잡`(+10,000)과 `새벽`(+20,000)을 **아예 안 썼다** — `hour < 8 || hour >= 20`
 *       을 전부 「평일 야간」으로 봐서 새벽 3시도 야간이었다.
 *    ② `options.find(o => o.includes("평일") || o.includes("주간"))` 이라
 *       **`평일 주간`·`평일 야간` 중 배열 순서대로 먼저 오는 쪽**이 잡혔다(둘 다 「평일」을
 *       포함한다). 🔴 **부분일치로 되돌리지 말 것.**
 * 🔴 **화면에 규칙을 다시 적지 말 것** — 세 화면(견적문의 · 발주요청 · 관리자 견적 등록)이
 *    같은 답을 내야 한다. 갈리면 화주가 본 금액과 담당자가 본 금액이 달라진다.
 */

/**
 * `rate_surcharges.category = '운송시간'` 의 `option_name` — **DB 실측값이다**
 * (2026-09-16 · `_verify.sql` ㉕-a).
 *
 * 🔴 **매칭은 문자열 완전일치다.** 한 글자만 달라도 가산이 **예외도 경고도 없이** 빠진다.
 *    그래서 아래 `autoTransportTime()` 은 **실제로 내려온 목록 안에 있을 때만** 값을
 *    돌려준다 — 이름이 바뀌면 틀린 값을 넣는 대신 **아무것도 안 고른다**.
 */
export const TRANSPORT_TIME = {
  day: "평일 주간",
  rush: "출퇴근/혼잡",
  night: "평일 야간",
  weekend: "주말",
  holiday: "공휴일",
  dawn: "새벽",
} as const;

export type TransportTimeName = (typeof TRANSPORT_TIME)[keyof typeof TRANSPORT_TIME];

/**
 * 상차 일시가 어느 운송시간에 드는지.
 *
 * ```
 *   00:00 ~ 05:59           새벽          ← 요일보다 먼저 본다
 *   토·일 06:00 ~ 23:59      주말
 *   평일 06:00 ~ 07:59       출퇴근/혼잡
 *   평일 08:00 ~ 17:59       평일 주간
 *   평일 18:00 ~ 19:59       출퇴근/혼잡
 *   평일 20:00 ~ 23:59       평일 야간
 * ```
 *
 * 🔴 **새벽이 요일보다 먼저다**(사용자 확정 2026-09-17 — *「새벽우선」*).
 *    ⚠️ **39차까지는 반대였다**(주말이 먼저 · 관리자 견적 등록의 기존 동작을 옮긴 것).
 *    그래서 **토·일 00:00~05:59 상차 건의 가산이 `주말`(+10,000)에서 `새벽`(+20,000)으로
 *    올랐다** — 실제로 금액이 바뀐 변경이다. 🔴 **「주말이 먼저다」로 적힌 옛 기록을
 *    근거로 되돌리지 말 것.** 근거는 **새벽이 배차가 더 어려운 시간**이라는 것이고,
 *    주말 낮(06:00~)은 그대로 `주말` 이다.
 * 🔴 **`공휴일` 은 자동으로 고를 수 없다** — 저장소에 공휴일 달력이 없다. 목록에는 그대로
 *    있으므로 담당자·화주가 직접 고른다. **달력을 임의로 하드코딩하지 말 것**(매년 바뀐다).
 *    ⚠️ 그래서 **공휴일 새벽도 `새벽` 으로 잡힌다**(공휴일을 아예 모르기 때문이다).
 */
export function classifyTransportTime(pickupLocalInput: string | null | undefined): TransportTimeName | null {
  if (!pickupLocalInput) return null;
  // 🔴 `DateTimePicker` 가 다루는 "YYYY-MM-DDTHH:mm"(오프셋 없음)은 브라우저가 **로컬로**
  //    읽는다 — 그래서 여기서 UTC 를 거치지 않는다(원칙 41번과 같은 이유).
  const d = new Date(pickupLocalInput);
  if (Number.isNaN(d.getTime())) return null;

  // 🔴 **새벽을 요일보다 먼저 본다**(2026-09-17 사용자 확정) — 순서를 뒤집으면
  //    토·일 00:00~05:59 건이 다시 `주말`(+10,000)로 떨어진다.
  const hour = d.getHours();
  if (hour < 6) return TRANSPORT_TIME.dawn;

  const day = d.getDay();
  if (day === 0 || day === 6) return TRANSPORT_TIME.weekend;

  if (hour < 8) return TRANSPORT_TIME.rush;
  if (hour < 18) return TRANSPORT_TIME.day;
  if (hour < 20) return TRANSPORT_TIME.rush;
  return TRANSPORT_TIME.night;
}

/**
 * 화면이 부르는 함수 — **실제로 내려온 선택지 목록 안에 있을 때만** 돌려준다.
 *
 * 🔴 **`available` 을 생략하지 말 것.** 생략하면 DB 에서 이름이 바뀐 뒤에도 옛 이름을
 *    그대로 넣어 `option_name` 완전일치에 실패하고, 가산이 **조용히** 빠진다.
 */
export function autoTransportTime(
  pickupLocalInput: string | null | undefined,
  available: readonly string[]
): string | null {
  const want = classifyTransportTime(pickupLocalInput);
  if (!want) return null;
  return available.includes(want) ? want : null;
}
