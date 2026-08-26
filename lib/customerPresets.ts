// 화주포털 "자주 쓰는 화물 / 자주 쓰는 요청" 프리셋 — 유일 정의처 (21차 지시서 기준
// 25차에 구현). 테이블·정책은 20차에 이미 만들어져 있고 이 파일이 첫 사용처다.
//
// 🔴 되돌리면 안 되는 설계 3가지 (20차 확정 — `migrations/2026-08-26_customer_presets.sql`)
//   ① 테이블을 둘로 나누지 말 것. "화물"과 "요청"은 `preset_type` 한 컬럼으로 가른다
//      (CHECK 제약이 `cargo`/`request` 두 값만 허용한다).
//   ② `payload`(jsonb)를 정규화된 컬럼으로 펼치지 말 것 — 프리셋은 **폼에 채워넣기
//      용도**이지 집계 대상이 아니다. 이렇게 두면 프리셋 종류가 늘어도 테이블이 안 는다.
//   ③ RLS 정책의 재직 계정 조건을 빼지 말 것 — 빼면 비활성화된 계정이 프리셋을 읽고
//      쓸 수 있게 된다. 🔴 **이 파일에는 그 조건이 없다**(클라이언트가 남의 계정 상태를
//      조회할 수 없다). 조건은 DB 정책 `customer_manage_own_presets` 가 조회·저장 양쪽에
//      걸고 있으므로 **그 정책을 손대지 말 것.**
//
// ⚠️ payload 안의 값들은 **저장 시점 문자열 스냅샷**이다. 옵션 이름이 바뀌면 안 맞을 수
//   있으므로 불러올 때는 반드시 `sanitizeCargoPayload()` 를 거칠 것 — 아래 참고.

import type { SupabaseClient } from "@supabase/supabase-js";

export type PresetType = "cargo" | "request";

/** "자주 쓰는 화물" — 발주 요청 ② 블록에 채워 넣는 값들 */
export type CargoPresetPayload = {
  vehicle_type?: string;
  body_type?: string;
  item?: string;
  item_condition?: string;
  load_condition?: string;
  unload_condition?: string;
};

/** "자주 쓰는 요청" — 발주 요청 ④ 블록 textarea */
export type RequestPresetPayload = {
  notes?: string;
};

export type CustomerPreset<P = Record<string, unknown>> = {
  id: string;
  name: string;
  preset_type: PresetType;
  payload: P;
  created_at: string;
};

const SELECT_COLS = "id,name,preset_type,payload,created_at";

export async function loadPresets<P = Record<string, unknown>>(
  supabase: SupabaseClient,
  companyId: string,
  presetType: PresetType
): Promise<CustomerPreset<P>[]> {
  const { data } = await supabase
    .from("customer_presets")
    .select(SELECT_COLS)
    .eq("company_id", companyId)
    .eq("preset_type", presetType)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data || []) as CustomerPreset<P>[];
}

export async function savePreset(
  supabase: SupabaseClient,
  companyId: string,
  presetType: PresetType,
  name: string,
  payload: Record<string, unknown>
): Promise<{ error: string | null }> {
  // 🔴 `payload` 는 통째로 jsonb 한 칸에 들어간다. 컬럼으로 펼치지 말 것(설계 ②).
  const { error } = await supabase.from("customer_presets").insert({
    company_id: companyId,
    preset_type: presetType,
    name: name.trim(),
    payload,
  });
  return { error: error ? error.message : null };
}

export async function deletePreset(
  supabase: SupabaseClient,
  presetId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("customer_presets").delete().eq("id", presetId);
  return { error: error ? error.message : null };
}

/**
 * 🔴 불러올 때 **현재 목록에 없는 값은 조용히 버리고 나머지만 채운다.**
 *
 * payload 는 저장 시점 스냅샷이라, 옵션 이름이 바뀌거나 없어지면 그 값이 지금 목록에
 * 없을 수 있다. 이때 오류를 던지면 **프리셋 하나 때문에 폼 전체가 막힌다** — 화주는
 * 왜 안 되는지 알 수 없고 그 프리셋을 지우기 전엔 발주를 못 한다.
 * 20차가 "21차에서 처리할 것"으로 남긴 처리이며 여기가 그 자리다.
 *
 * 자유 입력(`item`)은 목록이 없으므로 그대로 통과시킨다.
 */
export function sanitizeCargoPayload(
  payload: CargoPresetPayload | null | undefined,
  options: {
    vehicleTypes: readonly string[];
    bodyTypes: readonly string[];
    itemConditions: readonly string[];
    loadingMethods: readonly string[];
  }
): CargoPresetPayload {
  const p = payload || {};
  const keep = (value: string | undefined, list: readonly string[]) =>
    value && list.includes(value) ? value : undefined;

  return {
    vehicle_type: keep(p.vehicle_type, options.vehicleTypes),
    body_type: keep(p.body_type, options.bodyTypes),
    item: typeof p.item === "string" && p.item.trim() ? p.item : undefined,
    item_condition: keep(p.item_condition, options.itemConditions),
    load_condition: keep(p.load_condition, options.loadingMethods),
    unload_condition: keep(p.unload_condition, options.loadingMethods),
  };
}

/** 카드 요약 줄 — 값이 없는 항목은 빼고 가운뎃점으로 잇는다 */
export function cargoPresetSummary(payload: CargoPresetPayload | null | undefined): {
  head: string;
  tail: string;
} {
  const p = payload || {};
  const head = [p.vehicle_type, p.body_type, p.item].filter(Boolean).join(" · ");
  const tail = [
    p.item_condition,
    p.load_condition ? `상차 ${p.load_condition}` : "",
    p.unload_condition ? `하차 ${p.unload_condition}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return { head, tail };
}
