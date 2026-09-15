// 상차 → 하차 최소 간격 (36차 D장 · 사용자 지시 2026-09-14).
//
// 사용자 원문:
//   *"견적관리에서 하차일시를 발주요청과 동일하게 상차 30분이후 시간부터 표시되게"*
//
// 🔴 **세 화면이 같은 값을 쓴다 — 여기가 유일한 정의처다.**
//    견적 등록(`app/admin/quotes`) · 견적 수정(`app/admin/quotes/[id]`) ·
//    화주포털 발주요청(`app/customer/request`).
//
// ⚠️ **견적관리는 원래 「거리 기준 2~5시간」이었다**(100km당 1시간). 그래서 거리가 짧아도
//    최소 2시간이 강제됐고, 같은 화물을 포털에서 넣을 때(+30분)와 **화면마다 답이 달랐다.**
//    🔴 **`calcMinGapHours()` 를 되살리지 말 것** — 두 파일에 각자 복사돼 있던 함수이고,
//       되살리면 그 불일치가 그대로 돌아온다.
//
// 🔴 **왜 30분인가** — 25차에는 포털도 2시간이었는데 PR #103 리뷰 8번에서 30분으로
//    확정됐다. **시내 단거리는 2시간을 강제하면 실제 도착 시각보다 한참 뒤로만 적을 수
//    있었다.** 거리를 아는 견적관리에서도 같은 문제가 생긴다(10km 건에 2시간).
//
// 🔴 **상차 쪽 하한과 기본값은 이 파일이 건드리지 않는다.** 35차가 *"지나간 날짜도 고를 수
//    있어야 한다"*로 확정했다 — 이미 끝난 운송을 뒤늦게 입력하는 일이 실제로 있다.
//
// ⚠️ **당착·내착은 이 규칙의 예외다**(27차) — 시각이 무관한 선택지라 상차가 23:40 인
//    당착 건이 「상차 후 30분」에 걸려 접수가 막힌다. 🔴 **그 예외는 화면이 판단한다**
//    (포털 `app/customer/request` 가 `dropoff_arrival_type` 을 보고 건너뛴다).
//    🔴 **`quotes` 에 `dropoff_arrival_type` 컬럼을 만들지 말 것** — 견적은 `notes` →
//    `special_notes` 로 이어지는 자유 서술로 이미 끝까지 전달된다(34차 확정).

/** 상차 후 최소 몇 분 뒤부터 하차일시를 고를 수 있는가 */
export const DROPOFF_MIN_GAP_MIN = 30;

/** 입력창·안내문에 함께 쓰는 문구 (숫자를 따로 적지 않게) */
export const DROPOFF_MIN_GAP_LABEL = `상차 후 최소 ${DROPOFF_MIN_GAP_MIN}분 이후로 선택해주세요`;

/**
 * `DateTimePicker` 가 쓰는 "YYYY-MM-DDTHH:mm"(타임존 오프셋 없음) 하한을 만든다.
 *
 * 🔴 **`new Date(v)` 가 오프셋 없는 문자열을 브라우저 로컬 시각으로 읽는다는 점을 이용한다**
 *    — 그래서 UTC 를 거치지 않고 로컬 그대로 더한다(원칙 41번). `toISOString()` 을 끼워 넣지
 *    말 것: 저장·표시가 최대 9시간 밀리는 자리다.
 *
 * @param pickupLocalInput 희망 상차일시 ("YYYY-MM-DDTHH:mm"). 비어 있으면 `undefined`.
 */
export function minDropoffDateTime(
  pickupLocalInput: string | null | undefined
): string | undefined {
  if (!pickupLocalInput) return undefined;
  const d = new Date(pickupLocalInput);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setMinutes(d.getMinutes() + DROPOFF_MIN_GAP_MIN);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** 제출 직전 검사용 — 간격이 모자라면 `false`. 둘 중 하나라도 비면 검사하지 않는다. */
export function isDropoffGapOk(
  pickupLocalInput: string | null | undefined,
  dropoffLocalInput: string | null | undefined
): boolean {
  if (!pickupLocalInput || !dropoffLocalInput) return true;
  const diffMs =
    new Date(dropoffLocalInput).getTime() - new Date(pickupLocalInput).getTime();
  if (Number.isNaN(diffMs)) return true;
  return diffMs >= DROPOFF_MIN_GAP_MIN * 60 * 1000;
}
