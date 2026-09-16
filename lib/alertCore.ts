// ─────────────────────────────────────────────────────────────────────────────
// 알림 공용 코어 — 소리 · 늘어난 것 고르기 · 탭 제목 (38차)
//
// 🔴 **관리자와 화주포털이 **같이** 쓰는 곳이다.** 한쪽에만 적으면 조용히 갈린다
//    (34차 `unlinkedWonQuotes` · 35차 `marginCalc` · 36차 `receivableCalc` 와 같은 결).
//
// 🔴 **여기에는 라벨도 경로도 없다.** 그것은 쓰는 쪽이 정한다 —
//      관리자  `lib/adminIntakeAlert.ts`   (접수 셋: 견적문의 · 화주신청 · 발주요청)
//      포털    `lib/portalAlert.ts`         (넷: 견적 · 배차 · 정산 · 공지)
//    🔴 **여기에 어느 한쪽의 말을 넣지 말 것** — 넣는 순간 반대편이 남의 말을 쓰게 된다.
//
// 🔴 **CSS 도 JSX 도 없다**(순수 함수뿐) — 그래서 `.portal-v2` 스코프와 관리자 화면이
//    서로를 끌고 오지 않는다(원칙 57번). `lib/arrivalType.ts` 와 같은 자리다.
// ─────────────────────────────────────────────────────────────────────────────

// ── 소리 켜짐/꺼짐 ─────────────────────────────────────────────────
//
// 🔴 **끄면 소리만 멈추고 배지·배너는 그대로다.**
// 🔴 **기본값은 「켜짐」이다** — 저장된 값이 없으면 켜진 것으로 본다.
// 🔴 **관리자와 포털이 같은 칸을 쓴다**(브라우저당 한 벌) — 한 사람이 둘 다 쓰는
//    경우가 드물고, 볼륨·소리는 **그 자리의 취향**이라 화면마다 다를 이유가 없다.

const SOUND_KEY = "admin-intake-alert-sound";

export function isAlertSoundOn(): boolean {
  if (typeof window === "undefined") return true;
  try {
    // 🔴 사생활 보호 모드 등에서 localStorage 접근 자체가 던진다 — 그때도 켜짐이다.
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setAlertSoundOn(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // 저장이 안 돼도 이번 세션에서는 동작해야 하므로 넘어간다
  }
}

// ── 알림음 ──────────────────────────────────────────────────────────────────
//
// 🔴 **음원 파일을 쓰지 않고 WebAudio 로 합성한다.** 이유 둘 —
//    ① 이 저장소는 public 이고 바이너리를 늘리지 않는다
//    ② 파일을 `public/` 에 두면 코드가 **문자열로만** 가리켜 `grep` 참조가 0건이 되고,
//       그러면 §9 「지우면 안 되는 파일」 목록에 한 줄을 더해야 한다(함정 18번의 그 자리).
//    합성음은 그 두 가지가 아예 생기지 않는다.
//    🔴 **소리 종류가 셋이 된 뒤에도 그대로다** — 「종류를 늘리려면 음원을 받아야 한다」로
//    가지 말 것. 음 높이와 길이만 바꾸면 되므로 파일이 필요 없다.
//
// 🔴 **브라우저 자동재생 정책** — 그 탭에서 사용자가 한 번이라도 클릭·키 입력을 한
//    뒤에만 소리가 난다. 그전에는 `AudioContext` 가 `suspended` 로 남고 **소리가 조용히
//    안 난다.** 🔴 **이 함수는 절대 던지지 않는다** — 호출부가 `try` 로 감싸지 않아도
//    배너·탭 제목은 그대로 떠야 한다(완료조건 6번).

/** 볼륨 3단계. 🔴 값은 **최고 게인**이고 `1` 에 가까울수록 찢어진다 — 0.5 를 넘기지 말 것. */
export type AlertVolume = "low" | "mid" | "high";
/** 소리 3종. 🔴 `chime` 이 기본값이고 **38차 A장이 처음 넣은 그 소리 그대로**다. */
export type AlertTone = "chime" | "ding" | "rise";

export const ALERT_VOLUMES: { value: AlertVolume; label: string; peak: number }[] = [
  { value: "low", label: "작게", peak: 0.07 },
  // 🔴 `mid` 0.18 은 A장이 쓰던 그 값이다 — 기본값을 쓰던 사람에게 소리가 달라지면 안 된다.
  { value: "mid", label: "보통", peak: 0.18 },
  { value: "high", label: "크게", peak: 0.38 },
];

type ToneNote = { freq: number; at: number; dur: number };

export const ALERT_TONES: { value: AlertTone; label: string; notes: ToneNote[] }[] = [
  // 🔴 A장의 그 소리다(880Hz 라 → 1318.5Hz 미). **음 높이·길이를 바꾸지 말 것** —
  //    바꾸면 아무것도 안 고른 담당자의 소리가 말없이 달라진다.
  {
    value: "chime",
    label: "두 음",
    notes: [
      { freq: 880, at: 0, dur: 0.14 },
      { freq: 1318.5, at: 0.14, dur: 0.14 },
    ],
  },
  // 한 번만 「딩」 — 하루에 여러 건 올 때 가장 덜 거슬린다
  { value: "ding", label: "단음", notes: [{ freq: 1046.5, at: 0, dur: 0.42 }] },
  // 세 음이 올라간다 — 시끄러운 사무실에서 가장 잘 들린다
  {
    value: "rise",
    label: "세 음",
    notes: [
      { freq: 659.3, at: 0, dur: 0.11 },
      { freq: 880, at: 0.1, dur: 0.11 },
      { freq: 1174.7, at: 0.2, dur: 0.22 },
    ],
  },
];

const VOLUME_KEY = "admin-intake-alert-volume";
const TONE_KEY = "admin-intake-alert-tone";

// 🔴 **기억하는 곳은 브라우저(localStorage)다 — DB 가 아니다.**
//    사용자 확정이 「직원 전원 같은 알림」이라 **누가 받을지는 갈리지 않고**, 볼륨·소리는
//    그 사람이 앉은 **자리의 취향**이다(사무실 데스크탑과 휴대폰이 달라야 자연스럽다).
//    🔴 이것을 `staff_accounts` 컬럼으로 옮기지 말 것 — 수신 설정 화면을 만들지 않기로
//    한 38차 0-3 확정과 어긋나고, DB 변경 0 이던 A장이 DB 변경을 갖게 된다.
function readChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key);
    // 🔴 저장된 값이 목록에 없으면 기본값이다 — 옛 값이 남아 있어도 조용히 깨지지 않는다.
    return allowed.includes(v as T) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeChoice(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 저장이 안 돼도 이번 세션에서는 동작해야 하므로 넘어간다(`setIntakeSoundOn` 과 같다)
  }
}

export function getAlertVolume(): AlertVolume {
  return readChoice(VOLUME_KEY, ALERT_VOLUMES.map((v) => v.value), "mid");
}
export function setAlertVolume(v: AlertVolume): void {
  writeChoice(VOLUME_KEY, v);
}
export function getAlertTone(): AlertTone {
  return readChoice(TONE_KEY, ALERT_TONES.map((t) => t.value), "chime");
}
export function setAlertTone(t: AlertTone): void {
  writeChoice(TONE_KEY, t);
}

let audioCtx: AudioContext | null = null;

/**
 * 알림음을 낸다. 소리가 났으면 true. 🔴 절대 던지지 않는다.
 *
 * 🔴 **인자를 안 주면 저장된 값을 읽는다** — 부르는 곳(`TopNav` 의 감지 effect)이
 *    볼륨·소리를 알 필요가 없다. 인자는 **설정 화면이 「고른 그 소리」를 바로 들려줄 때**만
 *    쓴다(저장이 끝나기 전에도 정확히 그 소리가 나야 하므로).
 */
export async function playAlertChime(opts?: {
  volume?: AlertVolume;
  tone?: AlertTone;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;

    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === "suspended") {
      // 🔴 **`resume()` 은 제스처가 없으면 거절하지 않고 「영영 안 끝난다」.**
      //    (실측 2026-09-16 · Chromium) 그냥 `await` 하면 이 함수가 돌아오지 않아
      //    호출할 때마다 끝나지 않는 약속이 하나씩 쌓인다. 그래서 **짧게 기다리고
      //    포기한다** — 어차피 소리는 부가 기능이고 배너는 이미 떴다.
      //    🔴 이 경주를 빼지 말 것. 화면이 멀쩡해 보여서 눈으로는 안 잡힌다.
      await Promise.race([
        audioCtx.resume().catch(() => undefined),
        new Promise((r) => setTimeout(r, 300)),
      ]);
    }
    if (audioCtx.state !== "running") return false;

    const volume = opts?.volume ?? getAlertVolume();
    const tone = opts?.tone ?? getAlertTone();
    // 🔴 목록에 없는 값이 들어와도 소리는 나야 한다 — 기본값으로 떨어뜨린다.
    const peak = (ALERT_VOLUMES.find((v) => v.value === volume) || ALERT_VOLUMES[1]).peak;
    const notes = (ALERT_TONES.find((t) => t.value === tone) || ALERT_TONES[0]).notes;

    const now = audioCtx.currentTime;
    notes.forEach(({ freq, at, dur }) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      // 🔴 게인을 0 에서 올렸다 내린다 — 바로 켜고 끄면 「딱」 하는 잡음이 난다.
      //    🔴 `exponentialRamp` 는 0 을 못 받는다(0.0001 이 그래서 있다) — 0 으로 바꾸지 말 것.
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(peak, now + at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur - 0.01);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(now + at);
      osc.stop(now + at + dur);
    });
    return true;
  } catch {
    // 🔴 소리가 막혀도 조용히 넘어간다 — 배너는 호출부가 그대로 띄운다.
    return false;
  }
}

// ── 늘어난 것만 고르기 ─────────────────────────────────────────────
//
// 🔴 **화면 안에 묻어 두지 않고 순수 함수로 뻐 것은 재어 보기 위해서다.**
//    규칙이 셋이나 되는데(첫 조회 · 감소 · 키별 판정) `useEffect` 안에 있으면
//    브라우저를 띄우지 않고는 한 줄도 확인할 수 없다.

export type AlertRise<K extends string> = { kind: K; count: number };

/**
 * 직전 건수와 지금 건수를 대고 **늘어난 것만** 돌려준다.
 *
 * 🔴 `prev` 를 **그 자리에서 갱신한다**(호출부가 `useRef` 에 들고 있는 그 객체다).
 *
 * 규칙 셋 —
 *   ① 그 키를 처음 보면 기억만 하고 울리지 않는다 (화면을 열자마자 울리면 안 된다)
 *   ② 줄어들거나 같으면 울리지 않는다 (담당자·화주가 이미 본 것이다)
 *   ③ 키마다 따로 판정한다 — 건수가 각자 다른 시점에 도착하므로(폴링 · Realtime)
 *      「첫 조회인가」를 하나로 묶으면 늦게 오는 쪽이 처음부터 울린다
 */
export function collectRises<K extends string>(
  keys: readonly K[],
  prev: Partial<Record<K, number>>,
  next: Record<K, number>
): AlertRise<K>[] {
  const rises: AlertRise<K>[] = [];
  for (const kind of keys) {
    const now = next[kind];
    const before = prev[kind];
    prev[kind] = now;
    if (before === undefined) continue; // ①
    if (now <= before) continue; // ②
    rises.push({ kind, count: now - before });
  }
  return rises;
}

// ── 탭 제목 ─────────────────────────────────────────────────────────────────
//
// 🔴 **다른 탭을 보고 있을 때 유일하게 보이는 신호다.** 배너는 그 탭 안에만 있고
//    소리는 자동재생 정책에 막힐 수 있다.

/** `(3) 위캐리 내부관리` 처럼 앞에 건수를 붙인다. 0이면 뗀다. 돌려주는 값은 붙인 뒤 제목. */
export function applyUnseenTitle(unseen: number, doc?: Document): string {
  const d = doc ?? (typeof document === "undefined" ? undefined : document);
  if (!d) return "";
  // 🔴 내가 붙인 접두사를 **먼저 떼고** 다시 붙인다 — 안 떼면 `(1) (2) 위캐리…` 가 된다.
  const base = d.title.replace(/^\(\d+\)\s*/, "");
  d.title = unseen > 0 ? `(${unseen}) ${base}` : base;
  return d.title;
}
