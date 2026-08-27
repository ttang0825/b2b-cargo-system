"use client";

/**
 * 화주포털 v2 전용 날짜·시간 입력 — `[날짜] [시간]` + `[오늘][내일]` 칩.
 *
 * 🔴 **`components/DateTimePicker.tsx` 를 고치는 대신 이 래퍼를 새로 만들었다**(25차).
 *    이유 둘:
 *    ① 그 공용 컴포넌트는 포털 밖 **4개 파일**이 같이 쓰는데 `.field`·`.btn`·
 *       `.btn-ghost` 전역 클래스와 인라인 style 을 쓴다 — 시안 모양으로 고치면
 *       `/quote`·`/admin/quotes`·`/admin/orders` 가 같이 바뀐다.
 *    ② **상한(`max`)을 지원하지 않는다.** 25차는 "시작일 + 30일" 상한이 필요하다.
 *
 * ⚠️ 값 형식은 원본과 같은 `"YYYY-MM-DDTHH:mm"`(타임존 오프셋 없음)이다 —
 *    저장할 때는 반드시 `lib/localDateTime.ts` 의 `localInputToISOString()` 을
 *    거칠 것(원칙 41번). 여기서 ISO 로 바꾸지 않는다.
 */

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 06:00 ~ 22:00, 30분 단위 — 원본 DateTimePicker 와 같은 목록
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${pad(h)}:00`);
  if (h !== 22) TIME_OPTIONS.push(`${pad(h)}:30`);
}

export default function Pv2DateTimeField({
  label,
  value,
  onChange,
  minDateTime,
  maxDate,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** 이 시점 이전은 고를 수 없다 ("YYYY-MM-DDTHH:mm") */
  minDateTime?: string;
  /** 이 날짜 이후는 고를 수 없다 ("YYYY-MM-DD") */
  maxDate?: string;
  /** 제한 이유를 알려주는 짧은 안내 */
  hint?: string;
}) {
  const [datePart, timePart] = value ? value.split("T") : ["", ""];
  const [minDatePart, minTimePart] = minDateTime ? minDateTime.split("T") : ["", ""];

  function applyDate(d: string) {
    onChange(d ? `${d}T${timePart || "09:00"}` : "");
  }
  function applyTime(t: string) {
    onChange(datePart ? `${datePart}T${t}` : "");
  }
  function quickPick(daysFromToday: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    onChange(`${toDateStr(d)}T${timePart || "09:00"}`);
  }

  const today = toDateStr(new Date());
  const tomorrow = toDateStr(new Date(new Date().setDate(new Date().getDate() + 1)));
  const isToday = datePart === today;
  const isTomorrow = datePart === tomorrow;

  // 🔴 하한·상한을 벗어난 날짜는 칩으로도 고를 수 없어야 한다 — 칩이 `min` 을
  //    우회하면 과거 날짜가 그대로 들어간다(원칙 6번이 막으려던 바로 그 구멍).
  const outOfRange = (d: string) =>
    (minDatePart && d < minDatePart) || (maxDate && d > maxDate) ? true : false;

  // 선택한 날짜가 하한과 같은 날이면 그 시각 이후만 고를 수 있다
  const timeOptions =
    minDatePart && datePart === minDatePart
      ? TIME_OPTIONS.filter((t) => t >= minTimePart)
      : TIME_OPTIONS;

  return (
    <div className="pv2-field">
      <label className="pv2-field-label">{label}</label>
      <div className="pv2-dt-row">
        <input
          className="pv2-input"
          type="date"
          value={datePart}
          min={minDatePart || undefined}
          max={maxDate || undefined}
          onChange={(e) => applyDate(e.target.value)}
          aria-label={`${label} 날짜`}
        />
        <select
          className="pv2-select"
          value={timePart}
          onChange={(e) => applyTime(e.target.value)}
          aria-label={`${label} 시간`}
        >
          <option value="">시간 선택</option>
          {timeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="pv2-dt-chips">
        <button
          type="button"
          className={`pv2-chip${isToday ? " pv2-chip-on" : ""}`}
          onClick={() => quickPick(0)}
          disabled={outOfRange(today)}
        >
          오늘
        </button>
        <button
          type="button"
          className={`pv2-chip${isTomorrow ? " pv2-chip-on" : ""}`}
          onClick={() => quickPick(1)}
          disabled={outOfRange(tomorrow)}
        >
          내일
        </button>
        {hint && <span className="pv2-dt-hint">{hint}</span>}
      </div>
    </div>
  );
}
