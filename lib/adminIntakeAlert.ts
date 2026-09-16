// ─────────────────────────────────────────────────────────────────────────────
// 고객 접수 알림 — 정의처 (38차 A장)
//
// 알릴 접수는 **셋뿐**이다: 견적문의 · 화주신청 · 발주요청.
// 🔴 **여기가 유일한 정의처다** — 라벨·경로·소리·켜짐 여부를 화면 파일에 다시 적지
//    말 것. 세 곳이 각자 적으면 배지와 알림이 갈린다(34차 `unlinkedWonQuotes` ·
//    35차 `marginCalc` · 36차 `receivableCalc` 와 같은 결).
//
// 🔴 **「운송 중 문제 발생」을 여기에 더하지 말 것**(사용자 확정 2026-09-16) —
//    그것은 고객 접수가 아니라 내부 사건이라 성격이 다르다.
// 🔴 **`approvedQuotes`(수주인데 오더 없는 건)도 여기에 없다** — 같은 배지 state 에
//    있지만 접수가 아니라 **담당자가 이어서 할 일**이다. 새 손님이 온 것이 아니므로
//    소리로 부를 일이 아니다.
// ─────────────────────────────────────────────────────────────────────────────

/** 🔴 `components/TopNav.tsx` 의 `counts` 키와 **같은 이름**이다 — 바꾸면 감지가 끊긴다. */
export type IntakeKind = "portalRequests" | "publicQuotes" | "applications";

/**
 * 🔴 경로는 **실측값**이다(2026-09-16).
 *    38차 지시서는 `/admin/inquiries`·`/admin/customer-requests` 라 적었는데
 *    **둘 다 없는 경로다.** 지시서에서 옮겨 적지 말고 `app/admin/` 을 볼 것.
 */
export const INTAKE_ALERTS: Record<IntakeKind, { label: string; href: string }> = {
  // 🔴 발주요청이 맨 앞이다 — 기존 화주가 실제 운송을 의뢰하는 것이라 답이 늦으면
  //    바로 돈이 걸린다(사용자 원문: *「발주요청이 가장 급하다」*).
  portalRequests: { label: "발주요청", href: "/admin/portal-requests" },
  publicQuotes: { label: "견적문의", href: "/admin/public-quotes" },
  applications: { label: "화주신청", href: "/admin/applications" },
};

export const INTAKE_KINDS: IntakeKind[] = ["portalRequests", "publicQuotes", "applications"];

// ── 소리 켜짐/꺼짐 ───────────────────────────────────────────────────────────
//
// 🔴 **끄면 소리만 멈추고 배지·배너는 그대로다.** 배지는 38차 이전부터 있던 기능이라
//    이 토글이 건드릴 것이 아니다.
// 🔴 **기본값은 「켜짐」이다** — 저장된 값이 없으면 켜진 것으로 본다.

const SOUND_KEY = "admin-intake-alert-sound";

export function isIntakeSoundOn(): boolean {
  if (typeof window === "undefined") return true;
  try {
    // 🔴 사생활 보호 모드 등에서 localStorage 접근 자체가 던진다 — 그때도 켜짐이다.
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setIntakeSoundOn(on: boolean): void {
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
//
// 🔴 **브라우저 자동재생 정책** — 그 탭에서 사용자가 한 번이라도 클릭·키 입력을 한
//    뒤에만 소리가 난다. 그전에는 `AudioContext` 가 `suspended` 로 남고 **소리가 조용히
//    안 난다.** 🔴 **이 함수는 절대 던지지 않는다** — 호출부가 `try` 로 감싸지 않아도
//    배너·탭 제목은 그대로 떠야 한다(완료조건 6번).

let audioCtx: AudioContext | null = null;

/** 짧은 두 음(솔 → 도) 차임. 소리가 났으면 true. 🔴 절대 던지지 않는다. */
export async function playIntakeChime(): Promise<boolean> {
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

    const now = audioCtx.currentTime;
    // 880Hz(라) → 1318.5Hz(미) 두 음. 각 130ms.
    [
      { freq: 880, at: 0 },
      { freq: 1318.5, at: 0.14 },
    ].forEach(({ freq, at }) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      // 🔴 게인을 0 에서 올렸다 내린다 — 바로 켜고 끄면 「딱」 하는 잡음이 난다.
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.18, now + at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.13);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.14);
    });
    return true;
  } catch {
    // 🔴 소리가 막혀도 조용히 넘어간다 — 배너는 호출부가 그대로 띄운다.
    return false;
  }
}

// ── 늘어난 것만 고르기 ───────────────────────────────────────────────────────
//
// 🔴 **화면 안에 묻어 두지 않고 순수 함수로 뺀 것은 잴 수 있게 하기 위해서다.**
//    규칙이 셋이나 되는데(첫 조회 · 감소 · 키별 판정) `useEffect` 안에 있으면
//    브라우저를 띄우지 않고는 한 줄도 확인할 수 없다.

export type IntakeCounts = Record<IntakeKind, number>;
export type IntakeRise = { kind: IntakeKind; count: number };

/**
 * 직전 건수와 지금 건수를 대고 **늘어난 것만** 돌려준다.
 *
 * 🔴 `prev` 를 **그 자리에서 갱신한다**(호출부가 `useRef` 에 들고 있는 그 객체다).
 *
 * 규칙 셋 —
 *   ① 그 키를 처음 보면 기억만 하고 울리지 않는다 (화면을 열자마자 울리면 안 된다)
 *   ② 줄어들거나 같으면 울리지 않는다 (담당자가 처리한 것이다)
 *   ③ 키마다 따로 판정한다 — 세 건수가 각자 다른 시점에 도착하므로(폴링 둘 ·
 *      Realtime 하나) 「첫 조회인가」를 하나로 묶으면 늦게 오는 쪽이 처음부터 울린다
 */
export function collectIntakeRises(
  prev: Partial<IntakeCounts>,
  next: IntakeCounts
): IntakeRise[] {
  const rises: IntakeRise[] = [];
  for (const kind of INTAKE_KINDS) {
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
