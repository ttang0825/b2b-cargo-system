import { supabaseAdminAuth } from "@/lib/supabaseAdminAuthClient";

export type StaffInfo = { id: string; name: string; role: "admin" | "staff" };

// "지금 로그인한 직원이 누구/무슨 role인지"는 한 번 로그인하면 세션 동안 거의 안
// 바뀌는데도, TopNav와 각 화면이 각자 getCurrentStaffRole() 등을 호출하면서
// auth.getUser()+staff_accounts 조회가 페이지마다 중복으로 나가던 문제가 있었음
// (auth.getUser()는 getSession()과 달리 매번 서버에 검증 요청을 보냄). 같은 세션
// 안에서는 최초 1회만 조회하고 이후엔 아래 캐시를 재사용한다.
let cachedStaff: StaffInfo | null = null;
let cacheLoaded = false;
let inFlight: Promise<StaffInfo | null> | null = null;

const CHANGE_EVENT = "current-staff-changed";

// 본인 정보 수정(/admin/my-account)·role 변경(/admin/staff)처럼 "지금 로그인한
// 직원" 행 자체가 바뀌는 시점에 refreshCurrentStaffCache()/clearCurrentStaffCache()가
// 이 이벤트를 쏴서, TopNav 등 캐시를 구독 중인 화면이 다음 폴링/재방문을 기다리지
// 않고 바로 최신 이름/role을 반영하게 함 (lib/notifyBadgeRefresh.ts와 동일한 패턴)
export function onCurrentStaffChange(handler: (info: StaffInfo | null) => void) {
  function listener(e: Event) {
    handler((e as CustomEvent<StaffInfo | null>).detail);
  }
  window.addEventListener(CHANGE_EVENT, listener as EventListener);
  return () => window.removeEventListener(CHANGE_EVENT, listener as EventListener);
}

function broadcastChange(info: StaffInfo | null) {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: info }));
}

async function fetchStaffInfo(): Promise<StaffInfo | null> {
  const {
    data: { user },
  } = await supabaseAdminAuth.auth.getUser();
  if (!user) return null;
  const { data } = await supabaseAdminAuth
    .from("staff_accounts")
    .select("name,role")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { id: user.id, name: data.name, role: data.role as "admin" | "staff" };
}

async function getStaffInfoCached(): Promise<StaffInfo | null> {
  if (cacheLoaded) return cachedStaff;
  if (!inFlight) {
    inFlight = fetchStaffInfo().finally(() => {
      inFlight = null;
    });
  }
  cachedStaff = await inFlight;
  cacheLoaded = true;
  return cachedStaff;
}

// 본인 이름 저장, role 변경(관리자가 본인 role을 바꾼 경우 포함) 직후 호출할 것 —
// 캐시를 비우고 새로 조회한 뒤 구독 중인 화면에 알림
export async function refreshCurrentStaffCache(): Promise<StaffInfo | null> {
  cacheLoaded = false;
  cachedStaff = null;
  inFlight = null;
  const info = await getStaffInfoCached();
  broadcastChange(info);
  return info;
}

// 로그아웃 시 호출할 것 — 캐시를 비워서 다음 로그인 때 새로 조회하게 함
export function clearCurrentStaffCache(): void {
  cacheLoaded = false;
  cachedStaff = null;
  inFlight = null;
  broadcastChange(null);
}

// 클라이언트에서 companies/quotes/orders 등을 anon key로 직접 insert/update할 때,
// created_by/updated_by에 채워 넣을 "지금 로그인한 직원의 id"를 가져온다.
export async function getCurrentStaffId(): Promise<string | null> {
  const info = await getStaffInfoCached();
  return info?.id || null;
}

// 삭제 버튼 숨김, 운임기준표 수정 가능 여부 등 화면에서 "지금 로그인한 직원이
// 관리자인지" 확인할 때 사용. 실제 데이터 보호는 서버 API의 admin 체크가 담당하고,
// 이건 UI 표시용 (버튼 숨김/비활성화)이라는 점에 유의 — 이중 체크 중 화면단 체크.
export async function getCurrentStaffRole(): Promise<"admin" | "staff" | null> {
  const info = await getStaffInfoCached();
  return info?.role || null;
}

// 견적/화주등록신청/공개문의 처리 시 "처리자 이름"을 직접 타이핑하는 대신, 지금
// 로그인한 직원의 이름을 자동으로 채워 넣을 때 사용
export async function getCurrentStaffName(): Promise<string | null> {
  const info = await getStaffInfoCached();
  return info?.name || null;
}

// id/이름/role을 한 번에 조회 — 상단메뉴 로그인 정보 표시, 내 계정 화면 등에서 사용
export async function getCurrentStaffInfo(): Promise<StaffInfo | null> {
  return getStaffInfoCached();
}
