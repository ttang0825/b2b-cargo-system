// 내부관리(/admin) 아이디 로그인의 판정 로직 — 32차.
//
// 🔴 왜 라우트에서 분리했나. 로그인은 목(mock) Supabase 로 흉내내기 어려운데,
//    이 차수의 완료조건이 「세 가지 실패의 응답이 **완전히 같은가**」와
//    「응답·로그 어디에도 이메일이 없는가」다. 판정만 순수 함수로 떼어내면
//    다섯 갈래(없는 아이디 / 퇴사 / 비번 틀림 / 성공 / 잠금)를 주입으로 전수
//    시험할 수 있다. 라우트는 이 함수를 부르고 결과를 그대로 응답으로 옮기기만 한다.
//
// 🔴 화주포털 로그인(/customer/login)과 섞지 말 것 — 아이디 체계도 다르고
//    (포털은 아이디가 곧 합성 Auth 이메일), 세션 저장소도 갈라져 있다.

/** 아이디 규칙: 영문 소문자와 숫자만 · 4~20자 · 첫 글자는 영문. */
export const LOGIN_ID_PATTERN = /^[a-z][a-z0-9]{3,19}$/;

/**
 * 🔴 실패 문구는 **한 종류뿐이다.** 「없는 아이디」·「비밀번호 틀림」·「퇴사 처리됨」을
 *    갈라 보여주면, 아이디를 넣어보는 것만으로 **누가 재직 중인지가 새어 나간다.**
 *    「사용자에게 친절하게」를 이유로 나누지 말 것 — 완료조건 7번이다.
 */
export const LOGIN_FAILED_MESSAGE = "아이디 또는 비밀번호가 올바르지 않습니다.";

/**
 * 잠금 문구만 다르다. 🟢 이 판정의 근거는 「방금 그 사람이 입력한 문자열」이라
 * 계정이 있는지 없는지를 말해주지 않는다 — 없는 아이디로 10번 틀려도 똑같이 잠긴다.
 * 그래서 갈라도 새는 것이 없고, 대신 진짜 직원이 왜 안 되는지 알 수 있다.
 */
export const LOGIN_LOCKED_MESSAGE =
  "로그인 시도가 너무 많았습니다. 5분 후에 다시 시도해주세요.";

export const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 실패를 세는 구간
export const LOGIN_MAX_FAILURES = 10; // 이만큼 틀리면
export const LOGIN_LOCK_MS = 5 * 60 * 1000; // 이만큼 잠긴다

export type StaffLoginRecord = {
  email: string;
  status: string;
  must_change_password: boolean;
};

export type StaffLoginDeps = {
  /** login_id(소문자)로 직원을 찾는다. 없으면 null. */
  findStaffByLoginId: (loginId: string) => Promise<StaffLoginRecord | null>;
  /** 이메일+비밀번호로 실제 로그인. 성공하면 true. */
  signIn: (email: string, password: string) => Promise<boolean>;
};

// 🔴 성공 결과에 **이메일을 담지 않는다.** 담아 두면 라우트가 무심코 응답에
//    넣기 쉽다(완료조건 6번: 응답 본문·로그 어디에도 이메일 문자열 0건).
//    세션은 signIn 이 이미 세웠으므로 라우트는 이메일을 알 필요가 없다.
// ⚠️ 판별자를 boolean 이 아니라 문자열로 둔다 — 이 저장소는 `strict: false` 라
//    `if (!result.ok)` 로는 타입이 좁혀지지 않는다(실제로 컴파일 에러가 났다).
export type StaffLoginResult =
  | { kind: "ok"; mustChangePassword: boolean }
  | { kind: "failed" }
  | { kind: "locked" };

/**
 * 실패 횟수를 세는 아주 가벼운 장치.
 *
 * ⚠️ **한계를 알고 쓸 것.** 값이 프로세스 메모리에만 있어서, Vercel 처럼 인스턴스가
 *    여러 개이고 수시로 재활용되는 환경에서는 **완벽하게 막지 못한다.** 한 연결로
 *    반복해서 두드리는 흔한 경우를 막는 과속방지턱이지 벽이 아니다.
 *
 * 🔴 표를 만들지 않은 이유가 둘 있다.
 *    ① IP 를 저장하면 개인정보라 **처리방침 제2조에 항목을 더해야 한다**(이번 범위 밖).
 *       그래서 아이디만 센다.
 *    ② 이 차수의 완료조건이 `_migrations` **26행**이라, 표를 만들면 27행이 된다.
 *    제대로 된 지속 저장이 필요해지면 별도 차수에서 표와 함께 할 일이다.
 */
export class LoginAttemptTracker {
  private failures = new Map<string, number[]>();

  /** 잠겨 있는지. 잠금은 「구간 안 실패가 상한 이상」인 동안 유지된다. */
  isLocked(key: string, now = Date.now()): boolean {
    const recent = this.recent(key, now);
    if (recent.length < LOGIN_MAX_FAILURES) return false;
    const last = recent[recent.length - 1];
    return now - last < LOGIN_LOCK_MS;
  }

  recordFailure(key: string, now = Date.now()): void {
    const recent = this.recent(key, now);
    recent.push(now);
    this.failures.set(key, recent);
    // 표가 없으니 스스로 치운다 — 안 그러면 아이디를 무작위로 넣는 것만으로
    // 메모리가 계속 는다.
    if (this.failures.size > 500) this.sweep(now);
  }

  /** 로그인에 성공하면 그 아이디의 실패 기록을 지운다. */
  clear(key: string): void {
    this.failures.delete(key);
  }

  private recent(key: string, now: number): number[] {
    const all = this.failures.get(key) || [];
    return all.filter((t) => now - t < LOGIN_WINDOW_MS);
  }

  private sweep(now: number): void {
    for (const [k, times] of this.failures) {
      const kept = times.filter((t) => now - t < LOGIN_WINDOW_MS);
      if (kept.length === 0) this.failures.delete(k);
      else this.failures.set(k, kept);
    }
  }
}

/**
 * 🔴 없는 아이디일 때도 **비밀번호 확인을 한 번 태운다.** 안 하면 「빨리 실패했다」는
 *    사실만으로 그 아이디가 없다는 것이 드러난다(응답시간도 같아야 한다는 요구).
 *    실제로 존재할 수 없는 주소를 쓴다 — `.invalid` 는 표준이 예약해 둔 TLD 라
 *    누군가 이 주소로 계정을 만들 수 없다.
 */
const TIMING_DUMMY_EMAIL = "no-such-staff@wecarry-admin.invalid";

export async function resolveStaffLogin(
  deps: StaffLoginDeps,
  input: { loginId: string; password: string },
  tracker?: LoginAttemptTracker,
  now: number = Date.now()
): Promise<StaffLoginResult> {
  const key = input.loginId.trim().toLowerCase();

  if (tracker?.isLocked(key, now)) {
    return { kind: "locked" };
  }

  // 형식이 안 맞아도 조용히 같은 실패로 처리한다 — 「규칙에 안 맞는 아이디입니다」라고
  // 알려주면 규칙을 모르는 공격자에게 규칙을 가르쳐 주는 셈이다.
  const staff = LOGIN_ID_PATTERN.test(key) ? await deps.findStaffByLoginId(key) : null;

  const usable = staff && staff.status === "active" ? staff : null;
  const ok = await deps.signIn(usable ? usable.email : TIMING_DUMMY_EMAIL, input.password);

  if (!usable || !ok) {
    tracker?.recordFailure(key, now);
    return { kind: "failed" };
  }

  tracker?.clear(key);
  return { kind: "ok", mustChangePassword: !!usable.must_change_password };
}
