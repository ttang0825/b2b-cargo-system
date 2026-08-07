import type { SupabaseClient } from "@supabase/supabase-js";

// 화주포털 로그인 아이디("we"+YYMMDD(발급일, KST)+2자리 순번)·임시비밀번호(6자리
// 랜덤 숫자) 생성 + 계정발급(관리자 수동발급 / /apply 승인 자동생성) 두 진입점이
// 공유하는 로직. 인증 자체는 여전히 Supabase Auth(이메일+비밀번호) 그대로 쓰되,
// 실제 발송되지 않는 합성 이메일({login_id}@wecarry-portal.internal)로 등록한다.
// customer_accounts.email은 로그인용이 아니라 "연락처 이메일"(선택)로만 쓰임.
const SYNTHETIC_EMAIL_DOMAIN = "wecarry-portal.internal";

export function syntheticLoginEmail(loginId: string) {
  return `${loginId}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function generateTempPassword(): string {
  let pw = "";
  for (let i = 0; i < 6; i++) {
    pw += Math.floor(Math.random() * 10).toString();
  }
  return pw;
}

function todayKstYYMMDD(): string {
  // 서버(Vercel)는 UTC로 동작하므로 KST 기준 날짜를 명시적으로 계산해야
  // 자정 전후 발급건의 날짜가 밀리지 않음
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value.slice(2);
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}${m}${d}`;
}

async function nextLoginIdCandidate(admin: SupabaseClient): Promise<string> {
  const prefix = `we${todayKstYYMMDD()}`;
  const { count } = await admin
    .from("customer_accounts")
    .select("id", { count: "exact", head: true })
    .ilike("login_id", `${prefix}%`);
  const seq = (count || 0) + 1;
  return `${prefix}${String(seq).padStart(2, "0")}`;
}

export interface IssuePortalAccountParams {
  company_id: string;
  name?: string | null;
  email?: string | null; // 연락처 이메일(선택) — 로그인용 아님
  contact_mobile?: string | null;
}

export interface IssuedPortalAccount {
  login_id: string;
  password: string;
  auth_user_id: string;
  email: string | null;
}

// 아이디 순번이 동시발급으로 충돌하는 드문 경우를 대비해, "먼저 조회해서 없으면
// insert" 패턴 + customer_accounts.login_id UNIQUE 제약 + insert 23505(유니크 위반)
// 캐치 후 재시도로 처리(CLAUDE.md "먼저 조회해서 없으면 insert" 원칙과 동일 패턴).
export async function issuePortalAccount(
  admin: SupabaseClient,
  params: IssuePortalAccountParams
): Promise<{ data: IssuedPortalAccount | null; error: string | null }> {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const loginId = await nextLoginIdCandidate(admin);
    const password = generateTempPassword();
    const syntheticEmail = syntheticLoginEmail(loginId);

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
    });
    if (userError || !userData?.user) {
      return { data: null, error: userError?.message || "포털 계정 생성에 실패했습니다." };
    }

    const { error: linkError } = await admin.from("customer_accounts").insert({
      auth_user_id: userData.user.id,
      company_id: params.company_id,
      login_id: loginId,
      name: params.name || null,
      email: params.email || null,
      contact_mobile: params.contact_mobile || null,
      must_change_password: true,
    });

    if (!linkError) {
      return {
        data: { login_id: loginId, password, auth_user_id: userData.user.id, email: params.email || null },
        error: null,
      };
    }

    // 방금 만든 Auth 계정은 실패 시 항상 롤백
    await admin.auth.admin.deleteUser(userData.user.id);
    if ((linkError as { code?: string }).code !== "23505") {
      return { data: null, error: linkError.message };
    }
    // 23505(login_id 유니크 위반)면 다음 순번으로 재시도
  }
  return { data: null, error: "아이디 발급 중 충돌이 반복되어 실패했습니다. 다시 시도해주세요." };
}

// 관리자 매개 비밀번호 재발급(기존 계정) — 아이디는 그대로 두고 비밀번호만 재발급
export function reissueTempPassword(): string {
  return generateTempPassword();
}
