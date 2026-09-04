"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
// 🔴 희망 톤수는 배열 그대로다(22차 이후 11종). 로그인한 화주만 보는 화면이라
//   공개 화면의 금지 표현 기준(32차·12차)이 적용되지 않는다 — 사용자 결정 2026-08-26.
//   공개 4개 화면(`/`·`/vehicles`·`/quote`·`/apply`)은 여전히 6종이니 헷갈리지 말 것.
import { VEHICLE_TYPES_ALL, formatPhoneNumber } from "@/lib/constants";
// 🔴 상하차조건은 **DB 8종 그대로** 노출한다. 시안은 6종으로 줄여 그렸지만 합치면 안 된다
//   (사용자 확정 2026-08-27): `호이스트`(차량 자체 장착, 기사 단독 처리)와 `크레인`(별도
//   장비 수배 필요)은 현장 준비가 갈리고, 라벨을 바꾸면 견적 계산이 `option_name`
//   문자열 완전일치로 매칭한 뒤 못 찾고 `continue` 해서 **예외도 경고도 없이 가산이 빠진다**.
import { LOADING_METHOD_OPTIONS } from "@/lib/loadingMethods";
// 🔴 차량형태 선택지는 DB(`rate_surcharges`)가 정본이고, **표시 순서만** 코드가 정한다.
//    DB 에만 있고 코드에 없는 옵션은 버리지 않고 맨 뒤에 붙인다(정의처 주석 참고).
import { orderBodyTypes } from "@/lib/vehicleBodyTypes";
import Pv2AddressField from "@/components/pv2/Pv2AddressField";
import Pv2DateTimeField, { ArrivalType } from "@/components/pv2/Pv2DateTimeField";
import Pv2PromptModal from "@/components/pv2/Pv2PromptModal";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import { localInputToISOString } from "@/lib/localDateTime";
import { PORTAL_ORDER_THIRD_PARTY_CONSENT } from "@/lib/legalInfo";
import Pv2Select from "@/components/pv2/Pv2Select";
import { CUSTOMER_COLLECTION_AXIS_LABEL } from "@/lib/settlementLabels";
import {
  loadPresets,
  savePreset,
  sanitizeCargoPayload,
  type CargoPresetPayload,
  type RequestPresetPayload,
  type CustomerPreset,
} from "@/lib/customerPresets";

const REQUEST_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  대기중: { bg: "#fff1e2", text: "#d9730d" },
  승인됨: { bg: "#e6f7ec", text: "#1b9c57" },
  반려: { bg: "var(--danger-soft)", text: "var(--danger)" },
};

const SINGLE_SELECT_CATEGORIES = ["차량형태", "물품특성", "운송시간", "왕복/편도"];

// 🔴 적재구분 선택지. 값(`exclusive`/`mixable`)은 `quotes`·`orders`·
//   `portal_order_requests` 가 공유하는 저장값이고, 라벨은 화면 표시용이다.
//   **라벨을 값으로 쓰지 말 것** — 4차부터 저장돼 온 기존 행과 어긋난다.
const LOADING_TYPE_CHOICES = [
  { value: "exclusive" as const, label: "독차" },
  { value: "mixable" as const, label: "혼적가능" },
];

/**
 * 🔴 정산방식 (27차 리뷰 4라운드) — **화주가 고르는 것은 이 둘뿐이다**(사용자 확정 A안).
 *    관리자 화면(`components/CollectionMethodInput.tsx`)에는 청구주기(건별/월정산)
 *    축이 하나 더 있지만 **여기에는 넣지 않는다** — 월정산 여부는 화주별 계약 사항
 *    (`companies.billing_cutoff_day`)이라 담당자가 정하고, 화주에게 물으면 답할 수
 *    없는 질문이 된다. 🔴 나중에 "축이 하나 빠졌다"며 더하지 말 것.
 */
const COLLECTION_METHOD_CHOICES = [
  // 🔴 **화주가 보는 말**이다(5라운드 확정) — 담당자 화면의 「주선사 정산」/「선착불」과
  //   일부러 다르다(27차 ④ 상태 라벨과 같은 구조). 값은 그대로 `broker`/`driver_direct` 다.
  //   🔴 라벨은 `lib/settlementLabels.ts` 의 `getCustomerCollectionMethodLabel()` 과
  //   **반드시 같은 문자열**이어야 한다 — 폼과 견적서가 다른 말을 쓰면 안 된다.
  { value: "broker" as const, label: "위캐리 수금" },
  { value: "driver_direct" as const, label: "선착불(차주 직접수금)" },
];

/**
 * 🔴 당착·내착일 때 `requested_dropoff_at` 에 넣는 **자리 채움 시각**이다.
 *    `components/pv2/Pv2DateTimeField.tsx` 의 같은 값과 반드시 일치해야 한다 —
 *    상차일을 바꿀 때 이 화면이 하차 날짜를 다시 계산하기 때문이다.
 */
const ARRIVAL_FILLER_TIME = "23:59";

/** 🔴 선착불일 때만 묻는다(C안) — 주선사 정산에는 지급조건이라는 개념이 없다 */
const DIRECT_POINT_CHOICES = [
  { value: "pickup" as const, label: "선불(상차지 지급)" },
  { value: "dropoff" as const, label: "착불(하차지 지급)" },
  { value: "undecided" as const, label: "협의중" },
];

type SavedLocation = {
  id: string;
  address: string | null;
  address_detail: string | null;
  location_name: string | null;
  location_type: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  sido: string | null;
  sigungu: string | null;
};
type Surcharge = { category: string; option_name: string };

const EMPTY_LEG_CONTACT = {
  origin_company_name: "",
  origin_contact_name: "",
  origin_contact_phone: "",
  destination_company_name: "",
  destination_contact_name: "",
  destination_contact_phone: "",
};

export default function PortalRequestPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [cargoPresets, setCargoPresets] = useState<CustomerPreset<CargoPresetPayload>[]>([]);
  const [notePresets, setNotePresets] = useState<CustomerPreset<RequestPresetPayload>[]>([]);
  // 🔴 방금 불러온 프리셋 이름 — 드롭다운 옆에 보조로 띄운다(26차 리뷰 2라운드).
  //    불러오기 드롭다운은 값을 고르는 칸이 아니라 **동작 버튼**이라 `value=""` 로 고정돼
  //    있고(고른 뒤 아래 칸을 자유롭게 고칠 수 있으니 값으로 붙잡아 두면 폼과 어긋난다),
  //    그래서 무엇을 불러왔는지가 화면에 하나도 안 남아 있었다.
  // 🔴 **아래 칸을 고쳐도 지우지 않는다**(사용자 확정 2026-09-04) — 이 라벨은 저장도
  //    제출도 되지 않는 순수 표시라 값이 달라져도 담당자에게 가는 것은 실제 입력값이다.
  //    고칠 때마다 지우려면 6칸 변화를 전부 감시해야 하는데 그만한 이득이 없다.
  //    지우는 순간은 **다른 프리셋을 불러올 때**(교체) 하나뿐이다.
  const [cargoPresetName, setCargoPresetName] = useState<string | null>(null);
  const [notePresetName, setNotePresetName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 🔴 「지금」 상차 (27차 리뷰 3라운드) — 24시콜 오더와 같은 자리에 둔 칩이다.
  //    켜져 있으면 날짜·시간 입력이 잠기고, **제출 직전에 그 순간으로 다시 맞춘다**
  //    (폼을 오래 열어두면 눌렀던 시각이 이미 과거가 되어 하한 검증에 걸린다).
  const [pickupNow, setPickupNow] = useState(false);
  /**
   * 🔴 「당착」·「내착」 (27차 리뷰 4라운드) — 24시콜 오더의 그것이다.
   *    당착 = 상차 당일 도착 · 내착 = 다음 날 도착이며 **시각은 무관하다.**
   *    이 state 가 값의 정본이고 `requested_dropoff_at` 에 들어가는 23:59 는 자리 채움이다.
   */
  const [dropoffArrival, setDropoffArrival] = useState<ArrivalType>(null);
  const [success, setSuccess] = useState(false);
  const [presetMsg, setPresetMsg] = useState<string | null>(null);
  // 프리셋 이름 입력 팝업 — window.prompt 대체(PR #103 리뷰 2·9번)
  const [namePrompt, setNamePrompt] = useState<{ kind: "cargo" | "note"; initial: string } | null>(
    null
  );
  // 🔴 제3자 제공 동의(20차). `form`과 분리된 별도 state라 **서버로 명시적으로 함께 보내야**
  // 한다 — 14차 전의 `/quote`가 정확히 이 값을 안 보내서 동의가 저장되지 않고 있었다.
  const [thirdPartyAgreed, setThirdPartyAgreed] = useState(false);
  /** 제3자 제공 동의의 **세부 4항목**만 접는다(5라운드) — 고지·거부권 문장은 항상 보인다 */
  const [consentOpen, setConsentOpen] = useState(false);
  const [saveOrigin, setSaveOrigin] = useState(false);
  const [saveDestination, setSaveDestination] = useState(false);
  const [form, setForm] = useState({
    origin: "",
    originDetail: "",
    originSido: "",
    originSigungu: "",
    destination: "",
    destinationDetail: "",
    destinationSido: "",
    destinationSigungu: "",
    ...EMPTY_LEG_CONTACT,
    vehicle_type: VEHICLE_TYPES_ALL[0] as string,
    차량형태: "",
    상차조건: LOADING_METHOD_OPTIONS[0] as string,
    하차조건: LOADING_METHOD_OPTIONS[0] as string,
    물품특성: "",
    운송시간: "",
    "왕복/편도": "",
    // 🔴 적재구분 — 시안에 없지만 PR #103 리뷰 6번에서 확정. `quotes`/`orders` 는
    //   4차부터 이 값을 갖고 있었는데 화주가 고를 자리가 없어 담당자가 매번 되물었다.
    loading_type: "exclusive" as "exclusive" | "mixable",
    // 🔴 정산방식 — 값은 `quotes`/`orders` 와 같은 문자열이다(라벨을 저장하지 말 것).
    //   기본은 「주선사 정산」이다: WeCarry 가 수금·지급하는 것이 기본 거래 형태이고,
    //   관리자 견적 등록 폼도 같은 값으로 시작한다(`app/admin/quotes/page.tsx`).
    collection_method: "broker" as "broker" | "driver_direct",
    direct_collection_point: null as "pickup" | "dropoff" | "undecided" | null,
    waitingMinutes: "",
    waypointCount: "",
    item: "",
    requested_pickup_at: "",
    requested_dropoff_at: "",
    notes: "",
  });

  // 🔴 **희망 상차 일시의 하한** — 원칙 6번 위반을 고치는 자리다.
  //   `app/admin/quotes/page.tsx` 와 `app/quote/page.tsx` 는 하한을 걸어뒀는데
  //   **이 화면만 빠져 있어서 화주가 과거 날짜로 발주할 수 있었다**(23차 조사 §10-2).
  //
  const pickupRange = (() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const minDate = toDate(now);
    // 🔴 하한은 **오늘 날짜·현재 시각**이다(PR #103 리뷰 7번에서 확정).
    //   25차에는 `max(오늘, LEGAL_EFFECTIVE_DATE)` 였는데, 시행일까지 기다리면 그 전에는
    //   화주가 발주 자체를 못 넣는다(「오늘」·「내일」 칩이 둘 다 비활성이었다).
    //   ⚠️ 시행일 전 접수 건에는 적용될 약관이 아직 없다 — 그 건은 담당자가 확인한다.
    //   ⚠️ 브라우저 로컬 시각을 그대로 쓴다. 화주는 한국에서 접속하므로 KST 다.
    const minTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    // 상한은 오늘 + 30일 — 너무 먼 미래는 운임·차량 사정이 달라져 확정할 수 없다
    const end = new Date(`${minDate}T00:00:00`);
    end.setDate(end.getDate() + 30);
    return { min: `${minDate}T${minTime}`, max: toDate(end), minDate };
  })();

  /**
   * 🔴 상차 일시가 바뀌면 당착·내착 날짜도 **같이 다시 계산한다.**
   *    안 하면 화주가 당착을 고른 뒤 상차일을 미뤘을 때 하차일만 옛 날짜로 남아,
   *    화면에는 「당착」이라 적혀 있는데 저장값은 상차 이전이 된다.
   */
  function setPickupAt(v: string) {
    setForm((prev) => {
      const next = { ...prev, requested_pickup_at: v };
      if (dropoffArrival && v) {
        const d = new Date(`${v.slice(0, 10)}T00:00`);
        d.setDate(d.getDate() + (dropoffArrival === "next_day" ? 1 : 0));
        const pad = (n: number) => String(n).padStart(2, "0");
        next.requested_dropoff_at = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
          d.getDate()
        )}T${ARRIVAL_FILLER_TIME}`;
      }
      return next;
    });
  }

  // 거리 정보가 없는 화면이라, 상차 후 고정 30분 이후로만 하차일시를 선택하게 함
  // 🔴 25차에는 2시간이었다 — PR #103 리뷰 8번에서 30분으로 확정. 시내 단거리는
  //    2시간을 강제하면 실제 도착 시각보다 한참 뒤로만 적을 수 있었다.
  const DROPOFF_MIN_GAP_MIN = 30;
  const minDropoffDateTime = (() => {
    if (!form.requested_pickup_at) return undefined;
    const d = new Date(form.requested_pickup_at);
    d.setMinutes(d.getMinutes() + DROPOFF_MIN_GAP_MIN);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  })();

  function optionsOf(category: string) {
    return surcharges.filter((s) => s.category === category).map((s) => s.option_name);
  }

  async function loadSavedLocations(cid: string) {
    // 🔴 20차 컬럼 5개를 함께 읽는다 — 「저장된 상차지 불러오기」가 주소뿐 아니라
    //   상세주소·담당자명·연락처까지 채워야 하기 때문이다(완료조건 21).
    const { data } = await supabase
      .from("customer_locations")
      .select(
        "id,address,address_detail,location_name,location_type,contact_name,contact_phone,sido,sigungu"
      )
      .eq("company_id", cid);
    setSavedLocations((data || []) as SavedLocation[]);
  }

  async function loadPresetLists(cid: string) {
    const [cargo, note] = await Promise.all([
      loadPresets<CargoPresetPayload>(supabase, cid, "cargo"),
      loadPresets<RequestPresetPayload>(supabase, cid, "request"),
    ]);
    // 🔴 실패를 삼키지 않는다 — 조용히 빈 목록이 되면 "저장했는데 안 나타난다" 가 된다
    const loadError = cargo.error || note.error;
    if (loadError) setError(`저장된 프리셋을 불러오지 못했습니다: ${loadError}`);
    setCargoPresets(cargo.rows);
    setNotePresets(note.rows);
  }

  async function loadSurcharges() {
    // 21차 — rate_surcharges 에 RLS 가 켜지면서 직원 전용이 됐다(가산 금액이 같이 들어
    // 있어 화주에게 열 수 없다, 28차 비공개 확정). 선택지 이름만 서버 API 로 받는다.
    let list: Surcharge[] = [];
    try {
      // 🔴 브라우저·Next 캐시를 타지 않게 한다 — 서버 쪽 캐시는
      //   `lib/supabaseServiceClient.ts` 가 막지만, 여기도 같이 꺼야 완전하다.
      const res = await fetch("/api/customer/surcharge-options", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) list = (json.data || []) as Surcharge[];
    } catch {
      // 목록을 못 받아도 화면은 뜨게 둔다(선택지가 비는 것으로 드러난다)
    }
    setSurcharges(list);
    setForm((prev) => {
      const next = { ...prev };
      for (const cat of SINGLE_SELECT_CATEGORIES) {
        const first = list.find((s) => s.category === cat)?.option_name;
        if (!first) continue;
        if (!(next as any)[cat]) (next as any)[cat] = first;
      }
      return next;
    });
  }

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const { data: account } = await supabase
        .from("customer_accounts")
        .select("id,company_id")
        .eq("auth_user_id", session.user.id)
        .single();
      if (account) {
        setCompanyId(account.company_id);

        const { data: company } = await supabase
          .from("companies")
          .select("address")
          .eq("id", account.company_id)
          .single();
        if (company?.address) {
          setForm((prev) => ({ ...prev, origin: company.address }));
        }

        await Promise.all([
          loadSavedLocations(account.company_id),
          loadPresetLists(account.company_id),
          loadSurcharges(),
        ]);
      }
      setLoading(false);
    }
    init();

    // ⚠️ **`portal_order_requests` Realtime 구독을 없앴다** — 이 화면이 더 이상 요청
    //    목록을 그리지 않아서 이벤트를 받아도 할 일이 없다(리뷰 ⑥).
    //    🔴 **사이드바 「발주 요청」 배지는 그대로 동작한다** — 그 구독과 카운트는
    //       `CustomerPortalShell` 에 따로 있고, 이 화면에 들어오면 확인 처리도 거기서 한다.
  }, []);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /** 🔴 「⇄ 출발지·도착지 바꾸기」 — 주소·상세·상호·담당자·연락처 **6칸 전부** 맞바꾼다.
   *   주소만 바꾸면 담당자 정보가 반대편에 남아 엉뚱한 사람에게 전화가 간다. */
  function swapLegs() {
    setForm((prev) => ({
      ...prev,
      origin: prev.destination,
      originDetail: prev.destinationDetail,
      originSido: prev.destinationSido,
      originSigungu: prev.destinationSigungu,
      origin_company_name: prev.destination_company_name,
      origin_contact_name: prev.destination_contact_name,
      origin_contact_phone: prev.destination_contact_phone,
      destination: prev.origin,
      destinationDetail: prev.originDetail,
      destinationSido: prev.originSido,
      destinationSigungu: prev.originSigungu,
      destination_company_name: prev.origin_company_name,
      destination_contact_name: prev.origin_contact_name,
      destination_contact_phone: prev.origin_contact_phone,
    }));
  }

  /** 저장된 배송지 불러오기 — 담당자명·연락처·상세주소까지 채운다(완료조건 21) */
  function applyLocation(side: "origin" | "destination", loc: SavedLocation) {
    setForm((prev) =>
      side === "origin"
        ? {
            ...prev,
            origin: loc.address || "",
            originDetail: loc.address_detail || "",
            originSido: loc.sido || "",
            originSigungu: loc.sigungu || "",
            origin_contact_name: loc.contact_name || prev.origin_contact_name,
            origin_contact_phone: loc.contact_phone || prev.origin_contact_phone,
          }
        : {
            ...prev,
            destination: loc.address || "",
            destinationDetail: loc.address_detail || "",
            destinationSido: loc.sido || "",
            destinationSigungu: loc.sigungu || "",
            destination_contact_name: loc.contact_name || prev.destination_contact_name,
            destination_contact_phone: loc.contact_phone || prev.destination_contact_phone,
          }
    );
  }

  /** 🔴 프리셋 불러오기 — 현재 목록에 없는 값은 조용히 버리고 나머지만 채운다.
   *   오류를 던지면 프리셋 하나 때문에 폼 전체가 막힌다(20차가 미룬 처리). */
  function applyCargoPreset(preset: CustomerPreset<CargoPresetPayload>) {
    const clean = sanitizeCargoPayload(preset.payload, {
      vehicleTypes: VEHICLE_TYPES_ALL,
      bodyTypes: optionsOf("차량형태"),
      itemConditions: optionsOf("물품특성"),
      loadingMethods: LOADING_METHOD_OPTIONS,
    });
    setForm((prev) => ({
      ...prev,
      vehicle_type: clean.vehicle_type ?? prev.vehicle_type,
      차량형태: clean.body_type ?? prev.차량형태,
      item: clean.item ?? prev.item,
      물품특성: clean.item_condition ?? prev.물품특성,
      상차조건: clean.load_condition ?? prev.상차조건,
      하차조건: clean.unload_condition ?? prev.하차조건,
    }));
  }

  async function saveCargoPresetAs(name: string) {
    if (!companyId) return;
    setNamePrompt(null);
    const payload: CargoPresetPayload = {
      vehicle_type: form.vehicle_type || undefined,
      body_type: form.차량형태 || undefined,
      item: form.item.trim() || undefined,
      item_condition: form.물품특성 || undefined,
      load_condition: form.상차조건 || undefined,
      unload_condition: form.하차조건 || undefined,
    };
    const { error: saveError } = await savePreset(
      supabase,
      companyId,
      "cargo",
      name,
      payload as Record<string, unknown>
    );
    if (saveError) {
      setError(saveError);
      return;
    }
    setPresetMsg(`「${name.trim()}」을(를) 자주 쓰는 화물에 저장했습니다.`);
    loadPresetLists(companyId);
  }

  async function saveNotePresetAs(name: string) {
    if (!companyId || !form.notes.trim()) return;
    setNamePrompt(null);
    const { error: saveError } = await savePreset(supabase, companyId, "request", name, {
      notes: form.notes.trim(),
    });
    if (saveError) {
      setError(saveError);
      return;
    }
    setPresetMsg(`「${name.trim()}」을(를) 자주 쓰는 요청에 저장했습니다.`);
    loadPresetLists(companyId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.origin.trim() || !form.destination.trim()) {
      setError("출발지와 도착지를 입력해주세요.");
      return;
    }
    // 🔴 품목은 **필수**다(PR #103 리뷰) — 무엇을 싣는지 모르면 차급·차량형태를 못 정해
    //   담당자가 반드시 되물어야 한다. 연락처는 반대로 선택이다(위 주석 참고).
    if (!form.item.trim()) {
      setError("품목을 입력해주세요. 무엇을 싣는지 알아야 차량을 정할 수 있습니다.");
      return;
    }
    if (!thirdPartyAgreed) {
      setError("상·하차지 담당자 정보 제3자 제공에 동의해주셔야 접수할 수 있습니다.");
      return;
    }
    if (!companyId) {
      setError("계정 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }
    // 🔴 화면의 `min`/`max` 만으로는 부족하다 — 콘솔에서 값을 직접 넣으면 우회된다
    //   (원칙 25번). 제출 직전에 한 번 더 막는다.
    if (form.requested_pickup_at && form.requested_pickup_at < pickupRange.min) {
      setError(
        `희망 상차 일시는 ${pickupRange.minDate} 이후로 선택해주세요. 그 이전 날짜는 접수할 수 없습니다.`
      );
      return;
    }
    if (form.requested_pickup_at && form.requested_pickup_at.slice(0, 10) > pickupRange.max) {
      setError(`희망 상차 일시는 ${pickupRange.max} 까지 선택할 수 있습니다.`);
      return;
    }
    // 🔴 당착·내착은 **시각이 무관한 선택지**라 +30분 규칙을 적용하지 않는다 —
    //    상차가 23:40 인 당착 건이 "상차 후 30분 이후"에 걸려 접수가 막힌다.
    if (!dropoffArrival && form.requested_pickup_at && form.requested_dropoff_at) {
      const diffMs =
        new Date(form.requested_dropoff_at).getTime() - new Date(form.requested_pickup_at).getTime();
      if (diffMs < DROPOFF_MIN_GAP_MIN * 60 * 1000) {
        setError(`희망 하차 일시는 상차 후 최소 ${DROPOFF_MIN_GAP_MIN}분 이후로 설정해주세요.`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    setSuccess(false);

    const fullOrigin = [form.origin, form.originDetail].filter((v) => v.trim()).join(" ");
    const fullDestination = [form.destination, form.destinationDetail].filter((v) => v.trim()).join(" ");

    // 🔴 `portal_order_requests`에 직접 insert하지 말 것(20차에 서버 API로 이전).
    // `consents`는 RLS를 켜고 정책이 0개라 **로그인한 화주도 동의 기록을 남길 수 없다** —
    // service_role을 쓰는 서버가 접수와 동의를 함께 처리해야 한다.
    // ⚠️ `company_id`·`requested_by`를 보내지 않는다. 서버가 세션에서 직접 구한다(원칙 30번).
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setSaving(false);
        setError("로그인이 만료되었습니다. 다시 로그인해주세요.");
        return;
      }
      const res = await fetch("/api/customer/order-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          origin: fullOrigin,
          origin_sido: form.originSido || null,
          origin_sigungu: form.originSigungu || null,
          destination: fullDestination,
          destination_sido: form.destinationSido || null,
          destination_sigungu: form.destinationSigungu || null,
          origin_company_name: form.origin_company_name.trim() || null,
          origin_contact_name: form.origin_contact_name.trim() || null,
          origin_contact_phone: form.origin_contact_phone.trim() || null,
          destination_company_name: form.destination_company_name.trim() || null,
          destination_contact_name: form.destination_contact_name.trim() || null,
          destination_contact_phone: form.destination_contact_phone.trim() || null,
          vehicle_type: form.vehicle_type,
          body_type: form.차량형태 || null,
          load_condition: form.상차조건 || null,
          unload_condition: form.하차조건 || null,
          item_condition: form.물품특성 || null,
          transport_time: form.운송시간 || null,
          trip_type: form["왕복/편도"] || null,
          waiting_minutes: form.waitingMinutes ? Number(form.waitingMinutes) : null,
          waypoint_count: form.waypointCount ? Number(form.waypointCount) : null,
          item: form.item || null,
          loading_type: form.loading_type,
          // 🔴 지급조건은 선착불일 때만 보낸다 — 서버도 같은 규칙으로 한 번 더 거른다
          collection_method: form.collection_method,
          direct_collection_point:
            form.collection_method === "driver_direct" ? form.direct_collection_point : null,
          dropoff_arrival_type: dropoffArrival,
          // 🔴 「지금」이면 **제출하는 그 순간**으로 다시 맞춘다 — 칩을 누른 시각을
          //    그대로 보내면 폼을 오래 열어둔 경우 과거 시각이 되어 하한에 걸린다.
          requested_pickup_at: pickupNow
            ? new Date().toISOString()
            : localInputToISOString(form.requested_pickup_at),
          requested_dropoff_at: localInputToISOString(form.requested_dropoff_at),
          notes: form.notes || null,
          agreed: thirdPartyAgreed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaving(false);
        setError(data.error || "요청 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
    } catch {
      setSaving(false);
      setError("요청 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    // 🔴 담당자 정보까지 함께 저장한다(완료조건 22) — 주소만 저장하면 다음에 불러올 때
    //   담당자를 매번 다시 입력해야 해서 「불러오기」의 의미가 없다.
    //   ⚠️ 주소와 상세주소는 나눠서 저장한다(20차 `address_detail` 컬럼) — 합쳐 넣으면
    //   불러올 때 상세주소만 따로 채울 수 없다.
    const toSave: any[] = [];
    if (saveOrigin && form.origin.trim())
      toSave.push({
        company_id: companyId,
        location_name: form.origin_company_name.trim() || form.origin.trim(),
        address: form.origin.trim(),
        address_detail: form.originDetail.trim() || null,
        location_type: "상차지",
        contact_name: form.origin_contact_name.trim() || null,
        contact_phone: form.origin_contact_phone.trim() || null,
        sido: form.originSido || null,
        sigungu: form.originSigungu || null,
      });
    if (saveDestination && form.destination.trim())
      toSave.push({
        company_id: companyId,
        location_name: form.destination_company_name.trim() || form.destination.trim(),
        address: form.destination.trim(),
        address_detail: form.destinationDetail.trim() || null,
        location_type: "하차지",
        contact_name: form.destination_contact_name.trim() || null,
        contact_phone: form.destination_contact_phone.trim() || null,
        sido: form.destinationSido || null,
        sigungu: form.destinationSigungu || null,
      });
    if (toSave.length > 0) {
      await supabase.from("customer_locations").insert(toSave);
      await loadSavedLocations(companyId);
    }

    setSaving(false);
    setSuccess(true);
    // 🔴 동의는 **발주 건별**이다. 체크가 남아 있으면 다음 건을 보낼 때 화주가 그 건에
    // 대해 의식적으로 동의하지 않았는데도 동의 행이 기록된다 — 기록이 거짓이 된다.
    setThirdPartyAgreed(false);
    setSaveOrigin(false);
    setSaveDestination(false);
    // 「지금」도 건별이다 — 남겨두면 다음 건의 상차 시각이 조용히 접수 시각이 된다
    setPickupNow(false);
    // 🔴 당착·내착도 건별이다 — 남겨두면 하차일시를 비운 다음 건에 옛 도착구분이 붙는다
    setDropoffArrival(null);
    setForm((prev) => ({
      ...prev,
      destination: "",
      destinationDetail: "",
      destinationSido: "",
      destinationSigungu: "",
      destination_company_name: "",
      destination_contact_name: "",
      destination_contact_phone: "",
      item: "",
      requested_pickup_at: "",
      requested_dropoff_at: "",
      notes: "",
      waitingMinutes: "",
      waypointCount: "",
    }));
  }


  const pickupLocations = savedLocations.filter((l) => l.location_type !== "하차지");
  const dropoffLocations = savedLocations.filter((l) => l.location_type === "하차지");

  function locLabel(l: SavedLocation) {
    return l.location_name || l.address || "이름 없는 배송지";
  }

  /** ① 한 쪽(출발지/도착지) 열 — 시안 좌우 대칭이라 한 함수로 그린다 */
  function renderLeg(side: "origin" | "destination") {
    const isFrom = side === "origin";
    const list = isFrom ? pickupLocations : dropoffLocations;
    return (
      <div className="pv2-leg">
        <div className="pv2-leg-head">
          <span className={`pv2-leg-dot ${isFrom ? "pv2-leg-dot-from" : "pv2-leg-dot-to"}`} />
          <span className="pv2-leg-title">{isFrom ? "출발지" : "도착지"}</span>
          <span className="pv2-leg-sub">{isFrom ? "상차지 정보 *" : "하차지 정보 *"}</span>
        </div>
        <Pv2Select
          className="pv2-select-load"
          value=""
          onChange={(v) => {
            const found = list.find((l) => l.id === v);
            if (found) applyLocation(side, found);
          }}
          ariaLabel={isFrom ? "저장된 상차지 불러오기" : "저장된 하차지 불러오기"}
          /* 🔴 안내 문구는 **트리거에만** 둔다 — 목록 첫 줄에 또 넣으면 같은 글이
             두 번 보인다(리뷰 ④). 저장된 배송지만 목록에 들어간다. */
          placeholder={isFrom ? "저장된 상차지 불러오기" : "저장된 하차지 불러오기"}
          emptyLabel="저장된 배송지가 없습니다"
          options={list.map((l) => ({ value: l.id, label: locLabel(l) }))}
        />
        <Pv2AddressField
          value={isFrom ? form.origin : form.destination}
          detailValue={isFrom ? form.originDetail : form.destinationDetail}
          onChange={(addr, sido, sigungu) =>
            setForm((prev) =>
              isFrom
                ? { ...prev, origin: addr, originSido: sido, originSigungu: sigungu }
                : { ...prev, destination: addr, destinationSido: sido, destinationSigungu: sigungu }
            )
          }
          onDetailChange={(v) => setField(isFrom ? "originDetail" : "destinationDetail", v)}
          placeholder={isFrom ? "출발지 주소 검색 또는 직접 입력 *" : "도착지 주소 검색 또는 직접 입력 *"}
          detailPlaceholder={
            isFrom ? "상세주소 (동/층/호수, 창고 위치 등)" : "상세주소 (동/층/호수, 하차장 위치 등)"
          }
          inputClassName="pv2-input pv2-input-sm"
        />
        <div className="pv2-leg-2col">
          <input
            className="pv2-input pv2-input-sm"
            value={isFrom ? form.origin_company_name : form.destination_company_name}
            onChange={(e) =>
              setField(isFrom ? "origin_company_name" : "destination_company_name", e.target.value)
            }
            placeholder="현장 상호"
            aria-label={isFrom ? "상차지 현장 상호" : "하차지 현장 상호"}
          />
          <input
            className="pv2-input pv2-input-sm"
            value={isFrom ? form.origin_contact_name : form.destination_contact_name}
            onChange={(e) =>
              setField(isFrom ? "origin_contact_name" : "destination_contact_name", e.target.value)
            }
            placeholder="담당자명"
            aria-label={isFrom ? "상차지 담당자명" : "하차지 담당자명"}
          />
        </div>
        {/* ⚠️ 담당자 연락처는 **선택**이다(PR #103 리뷰에서 확정) — 필수로 두면 화주가
            현장 담당자를 모를 때 발주 자체를 못 넣는다. 담당자가 전화로 확인한다.
            🔴 **`(선택)` 글자를 붙이지 말 것** — 그 글자를 보면 적을 수 있는 정보도 안 적는다.
            🔴 값이 들어오면 **제3자 개인정보**이므로 아래 동의는 그대로 필요하다(47차). */}
        <input
          className="pv2-input pv2-input-sm"
          value={isFrom ? form.origin_contact_phone : form.destination_contact_phone}
          onChange={(e) =>
            setField(
              isFrom ? "origin_contact_phone" : "destination_contact_phone",
              formatPhoneNumber(e.target.value)
            )
          }
          placeholder="담당자 연락처 (010-0000-0000)"
          aria-label={isFrom ? "상차지 담당자 연락처" : "하차지 담당자 연락처"}
        />
        <label className="pv2-check">
          <input
            type="checkbox"
            checked={isFrom ? saveOrigin : saveDestination}
            onChange={(e) => (isFrom ? setSaveOrigin : setSaveDestination)(e.target.checked)}
          />
          {isFrom ? "이 출발지를 배송지 목록에 저장" : "이 도착지를 배송지 목록에 저장"}
        </label>
      </div>
    );
  }

  /** ②③ 공용 드롭다운 필드 */
  function renderSelect(label: string, key: string, options: readonly string[]) {
    return (
      <div className="pv2-field">
        <label className="pv2-field-label" htmlFor={`pv2-f-${key}`}>
          {label}
        </label>
        <Pv2Select
          id={`pv2-f-${key}`}
          value={(form as any)[key] || ""}
          onChange={(v) => setField(key as keyof typeof form, v)}
          ariaLabel={label}
          /* 차량형태 21종처럼 긴 목록은 잘리고 스크롤된다 */
          scroll={options.length > 12}
          options={options.map((o) => ({ value: o, label: o }))}
        />
      </div>
    );
  }

  if (loading) return <div className="pv2-empty">불러오는 중...</div>;

  return (
    <>
      <div className="pv2-page-head">
        <h1 className="pv2-page-title">발주 요청</h1>
        <p className="pv2-page-desc">
          구간을 요청해주시면 담당자가 확인 후 운임을 확정해 정식 운송오더로 접수해드립니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="pv2-form-stack">
        {/* ① 운송 구간 · 현장 정보 */}
        <div className="pv2-form-block">
          <div className="pv2-form-block-head">
            <span className="pv2-step-num">1</span>
            <span className="pv2-form-block-title">운송 구간 · 현장 정보</span>
            <button type="button" className="pv2-block-action" onClick={swapLegs}>
              <span aria-hidden="true">⇄</span>
              <span>출발지·도착지 바꾸기</span>
            </button>
          </div>
          <div className="pv2-swap-grid">
            <div className="pv2-swap-mark" aria-hidden="true">
              →
            </div>
            {renderLeg("origin")}
            {renderLeg("destination")}
          </div>
        </div>

        {/* ② 일정 */}
        <div className="pv2-form-block">
          <div className="pv2-form-block-head">
            <span className="pv2-step-num">2</span>
            <span className="pv2-form-block-title">일정</span>
          </div>
          <div className="pv2-grid-sched">
            <Pv2DateTimeField
              label="희망 상차 일시"
              value={form.requested_pickup_at}
              onChange={setPickupAt}
              minDateTime={pickupRange.min}
              maxDate={pickupRange.max}
              nowChip
              nowSelected={pickupNow}
              onNowChange={setPickupNow}
              hint={pickupNow ? "지금 바로 상차 — 시간은 접수 시각으로 들어갑니다" : undefined}
            />
            <Pv2DateTimeField
              label="희망 하차 일시"
              value={form.requested_dropoff_at}
              onChange={(v) => setField("requested_dropoff_at", v)}
              minDateTime={minDropoffDateTime}
              maxDate={pickupRange.max}
              arrivalChips
              arrivalValue={dropoffArrival}
              onArrivalChange={setDropoffArrival}
              pickupDate={form.requested_pickup_at.slice(0, 10)}
              hint={
                dropoffArrival
                  ? dropoffArrival === "same_day"
                    ? "당착 — 상차 당일 도착, 시각은 무관합니다"
                    : "내착 — 상차 다음 날 도착, 시각은 무관합니다"
                  : `상차 +${DROPOFF_MIN_GAP_MIN}분 이후`
              }
            />
            {renderSelect("운송시간", "운송시간", optionsOf("운송시간"))}
          </div>
        </div>

        {/* ③ 화물 · 차량 — 🔴 5라운드에 ②↔③ 순서를 바꿨다(사용자 확정).
            상차 일시를 먼저 정해야 어떤 차가 잡히는지 이야기가 되기 때문이다.
            🔴 되돌리려면 블록 두 개를 통째로 옮기고 번호 배지도 같이 고칠 것. */}
        <div className="pv2-form-block">
          <div className="pv2-form-block-head">
            <span className="pv2-step-num">3</span>
            <span className="pv2-form-block-title">화물 · 차량</span>
            <button type="button" className="pv2-block-action" onClick={() => setNamePrompt({ kind: "cargo", initial: form.item.trim() || "자주 쓰는 화물" })}>
              자주 쓰는 화물로 저장
            </button>
          </div>
          {/* 🔴 바깥을 `pv2-load-row`(flex + wrap)로 두고 드롭다운에 `wrapClassName` 을 준다 —
              요청사항 블록과 같은 구조다. 이래야 이름 라벨이 옆에 서고, 모바일(≤700px)에서
              드롭다운이 100% 폭이 될 때 라벨이 **저절로 아래로 접힌다**(가로 넘침 방지). */}
          <div className="pv2-load-row" style={{ marginBottom: 16 }}>
            <Pv2Select
              className="pv2-select-load"
              wrapClassName="pv2-load-slot"
              value=""
              onChange={(v) => {
                const found = cargoPresets.find((p) => p.id === v);
                if (found) {
                  applyCargoPreset(found);
                  setCargoPresetName(found.name);
                }
              }}
              ariaLabel="자주 쓰는 화물 불러오기"
              placeholder="자주 쓰는 화물 불러오기"
              emptyLabel="저장된 화물이 없습니다"
              options={cargoPresets.map((p) => ({ value: p.id, label: p.name }))}
            />
            {cargoPresetName && <span className="pv2-load-current">{cargoPresetName}</span>}
          </div>
          <div className="pv2-grid-4">
            {renderSelect("희망 톤수", "vehicle_type", VEHICLE_TYPES_ALL)}
            {renderSelect("차량형태", "차량형태", orderBodyTypes(optionsOf("차량형태")))}
            {renderSelect("물품특성", "물품특성", optionsOf("물품특성"))}
            {renderSelect("왕복/편도", "왕복/편도", optionsOf("왕복/편도"))}
            {/* 🔴 8종 그대로 — 시안 6종으로 합치지 말 것(파일 머리 주석 참고) */}
            {renderSelect("상차조건", "상차조건", LOADING_METHOD_OPTIONS)}
            {renderSelect("하차조건", "하차조건", LOADING_METHOD_OPTIONS)}
            <div className="pv2-field">
              <label className="pv2-field-label" htmlFor="pv2-f-wait">
                대기시간(분)
              </label>
              <input
                id="pv2-f-wait"
                className="pv2-input pv2-input-grid"
                inputMode="numeric"
                value={form.waitingMinutes}
                onChange={(e) => setField("waitingMinutes", e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="무료 20분 초과분만 가산"
              />
            </div>
            <div className="pv2-field">
              <label className="pv2-field-label" htmlFor="pv2-f-way">
                경유지 수
              </label>
              <input
                id="pv2-f-way"
                className="pv2-input pv2-input-grid"
                inputMode="numeric"
                value={form.waypointCount}
                onChange={(e) => setField("waypointCount", e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
              />
            </div>
          </div>
          {/* 🔴 적재구분 — 세 번 옮겼다. 되돌리기 전에 이 기록을 볼 것.
                25차      블록 맨 위의 **큰 라디오 두 장**(설명문까지 딸린 카드)
                리뷰 ②    "너무 부각된다" → 드롭다운
                리뷰 ⑦    "전처럼 고르는 방식으로, 칸 크기는 다른 항목과 같게" → 버튼 2개
                리뷰 ⑧    "전처럼 **작은 원형에 체크**하는 방식이 더 좋다" → **지금 이것**
              그래서 `<input type="radio">` 를 되살리되 **카드·설명문은 넣지 않았다** —
              25차가 부각돼 보였던 원인이 원형 자체가 아니라 그 카드였기 때문이다.
              🔴 위치는 8개 그리드와 품목 **사이**다 — 그리드 안으로 되돌리면
              칸이 9개가 되어 4열 배치가 한 줄 더 생긴다.
              🔴 칸 폭은 여전히 그리드 한 칸이라 위 열과 세로로 맞는다.
              🔴 값은 `quotes`/`orders` 와 같은 `exclusive`/`mixable` 문자열이다 —
              화면 라벨(독차/혼적가능)을 그대로 저장하지 말 것. */}
          <div className="pv2-field" style={{ marginTop: 14 }}>
            <span className="pv2-field-label">적재구분</span>
            <div className="pv2-choice-row">
              {LOADING_TYPE_CHOICES.map((opt) => (
                <label
                  key={opt.value}
                  className={`pv2-choice${form.loading_type === opt.value ? " is-on" : ""}`}
                >
                  <input
                    type="radio"
                    name="pv2-loading-type"
                    value={opt.value}
                    checked={form.loading_type === opt.value}
                    onChange={() => setForm((prev) => ({ ...prev, loading_type: opt.value }))}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          {/* 🔴 정산방식 (27차 리뷰 4라운드) — 13차에 `quotes`/`orders`/`dispatches`/
                `invoices` 가 이 축을 갖게 됐는데 **화주가 고를 자리가 한 곳도 없었다.**
                담당자가 발주 요청을 견적으로 옮길 때마다 되물어야 했다(적재구분과 같은 결).
                🔴 자리는 적재구분 바로 아래다 — 둘 다 "운임이 아니라 거래 조건"이라
                   같은 칩 줄로 묶어 두는 편이 훑기 쉽다.
                🔴 화면 라벨(주선사 정산/선착불)을 저장값으로 쓰지 말 것 — 값은
                   `broker`/`driver_direct` 다. */}
          <div className="pv2-field" style={{ marginTop: 14 }}>
            <span className="pv2-field-label">{CUSTOMER_COLLECTION_AXIS_LABEL}</span>
            <div className="pv2-choice-row">
              {COLLECTION_METHOD_CHOICES.map((opt) => (
                <label
                  key={opt.value}
                  className={`pv2-choice${form.collection_method === opt.value ? " is-on" : ""}`}
                >
                  <input
                    type="radio"
                    name="pv2-collection-method"
                    value={opt.value}
                    checked={form.collection_method === opt.value}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        collection_method: opt.value,
                        // 🔴 주선사 정산으로 돌아오면 지급조건을 **지운다** — 남겨두면
                        //   개념이 없는 값이 저장되고, 마이그레이션 단언이 막는다.
                        direct_collection_point:
                          opt.value === "driver_direct"
                            ? prev.direct_collection_point || "undecided"
                            : null,
                      }))
                    }
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            {form.collection_method === "driver_direct" && (
              <div className="pv2-subchoice">
                <span className="pv2-subchoice-label">지급조건</span>
                <div className="pv2-choice-row pv2-choice-row-auto">
                  {DIRECT_POINT_CHOICES.map((opt) => (
                    <label
                      key={opt.value}
                      className={`pv2-choice pv2-choice-auto${
                        form.direct_collection_point === opt.value ? " is-on" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="pv2-direct-point"
                        value={opt.value}
                        checked={form.direct_collection_point === opt.value}
                        onChange={() =>
                          setForm((prev) => ({ ...prev, direct_collection_point: opt.value }))
                        }
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="pv2-field" style={{ marginTop: 14 }}>
            <label className="pv2-field-label" htmlFor="pv2-f-item">
              품목 *
            </label>
            <input
              id="pv2-f-item"
              className="pv2-input"
              value={form.item}
              onChange={(e) => setField("item", e.target.value)}
              placeholder="예: 파렛트 2p / 박스 40개, 중량 800kg"
            />
          </div>
        </div>

        {/* ④ 요청사항 */}
        <div className="pv2-form-block">
          <div className="pv2-form-block-head">
            <span className="pv2-step-num">4</span>
            <span className="pv2-form-block-title">요청사항</span>
            <button
              type="button"
              className="pv2-block-action"
              onClick={() => setNamePrompt({ kind: "note", initial: form.notes.trim().slice(0, 20) })}
              disabled={!form.notes.trim()}
            >
              현재 요청 저장
            </button>
          </div>
          {/* 🔴 여기에 「요청사항 삭제」 드롭다운을 다시 만들지 말 것(PR #104 리뷰 3라운드).
              프리셋 관리(추가·수정·삭제)는 **배송지·화물 관리 화면 한 곳**으로 모았다 —
              배송지·화물과 관리 방식이 갈리면 화주가 어디서 지우는지 매번 헷갈린다.
              이 화면에는 "불러오기"와 "현재 요청 저장"만 남는다. */}
          <div className="pv2-load-row">
            <Pv2Select
              className="pv2-select-load"
              wrapClassName="pv2-load-slot"
              value=""
              onChange={(v) => {
                const found = notePresets.find((p) => p.id === v);
                if (found) {
                  setField("notes", found.payload?.notes || "");
                  setNotePresetName(found.name);
                }
              }}
              ariaLabel="자주 쓰는 요청 불러오기"
              placeholder="자주 쓰는 요청 불러오기"
              emptyLabel="저장된 요청이 없습니다"
              options={notePresets.map((p) => ({ value: p.id, label: p.name }))}
            />
            {notePresetName && <span className="pv2-load-current">{notePresetName}</span>}
          </div>
          <textarea
            className="pv2-textarea"
            rows={3}
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="상하차 조건 관련 요청, 기타 참고사항"
            aria-label="요청사항"
          />
        </div>

        {/* 🔴 제3자 제공 동의(47차). 시안에는 없지만 **빼면 처리방침 제4조 약속을 어긴다** —
            "실제 운송 접수(발주) 시점에 별도의 동의를 받은 후에만" 차주에게 제공한다고
            약속하고 있다. 상·하차지 담당자의 성명·연락처는 화주 본인이 아니라 제3자의
            개인정보다.
            ⚠️ 문구를 여기 직접 적지 말 것 — `lib/legalInfo.ts`가 유일 정의처다. */}
        <div className="pv2-form-block pv2-consent">
          <div className="pv2-consent-title">{PORTAL_ORDER_THIRD_PARTY_CONSENT.title}</div>
          {/* 🔴 **접힌 상태에 남는 것은 제목 · 「자세히 보기」 · 체크박스 셋뿐이다.**
              5라운드에 세부 4항목과 확인 문장을 접었고, 6라운드에 거부권 안내(refusal),
              7라운드에 고지 문장(intro)까지 접으라고 사용자가 차례로 확정했다.
              🔴 **세 라운드 모두 "접는 것이지 없애는 것이 아니다"** — 문구는 하나도 지우지
              않았고 「자세히 보기」가 체크박스 바로 위에 있다. 옛 라운드 기록(「intro 는
              접지 말 것」)을 근거로 되돌리지 말 것.
              🔴 **그래서 제목이 유일하게 남는 설명이다.** `title` 이
              「[필수] 상·하차지 담당자 정보 제3자 제공 동의」라서 접힌 화면에서도 무엇에
              동의하는지가 읽히고, 체크박스의 「위 제3자 제공에」가 그 제목을 가리킨다.
              **제목을 짧게 줄이거나 접음 안으로 넣지 말 것** — 그러면 접힌 화면에
              체크박스만 남아 동의를 구하는 문장이 통째로 사라진다.
              ⚠️ 개인정보보호법 제15조 2항이 고지와 거부권 안내를 요구한다 — 접어도
              화면에 있긴 하지만 **문구 자체가 변호사 검토 대상이다**(47차 이후 계속). */}
          <button
            type="button"
            className="pv2-consent-more"
            aria-expanded={consentOpen}
            onClick={() => setConsentOpen((v) => !v)}
          >
            {consentOpen ? "자세히 접기" : "자세히 보기"}
            <span className={`pv2-consent-caret${consentOpen ? " is-open" : ""}`} aria-hidden="true">
              ▼
            </span>
          </button>
          {consentOpen && (
            <div className="pv2-consent-detail">
              <p className="pv2-consent-p">{PORTAL_ORDER_THIRD_PARTY_CONSENT.intro}</p>
              <ul className="pv2-consent-list">
                {PORTAL_ORDER_THIRD_PARTY_CONSENT.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="pv2-consent-p">{PORTAL_ORDER_THIRD_PARTY_CONSENT.confirm}</p>
              <p className="pv2-consent-p">{PORTAL_ORDER_THIRD_PARTY_CONSENT.refusal}</p>
            </div>
          )}
          <label className="pv2-consent-check">
            <input
              type="checkbox"
              checked={thirdPartyAgreed}
              onChange={(e) => setThirdPartyAgreed(e.target.checked)}
            />
            <span>위 제3자 제공에 동의합니다.</span>
          </label>
        </div>

        {error && <div className="pv2-alert pv2-alert-error">{error}</div>}
        {presetMsg && (
          <div className="pv2-alert pv2-alert-ok" onClick={() => setPresetMsg(null)}>
            {presetMsg}
          </div>
        )}

        {/* 🔴 접수되면 **제출 버튼과 안내문을 이 배너로 갈아치운다**(시안 `sc-if sent`).
            둘을 같이 두면 방금 보낸 사람이 한 번 더 누르게 된다. */}
        {success ? (
          <div className="pv2-sent" role="status">
            <span className="pv2-sent-mark" aria-hidden="true">
              ✓
            </span>
            <div className="pv2-sent-text">
              발주 요청이 접수되었습니다. 담당자 확인 후 견적을 보내드립니다.
            </div>
            <Link className="pv2-sent-go" href="/customer/quotes">
              견적 확인 가기
            </Link>
            <button type="button" className="pv2-sent-new" onClick={() => setSuccess(false)}>
              새 요청 작성
            </button>
          </div>
        ) : (
          <div className="pv2-submit-wrap">
            <button className="pv2-submit" type="submit" disabled={saving}>
              {saving ? "요청 중..." : "운송 요청 보내기"}
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
            <div className="pv2-submit-note">
              요청 후 담당자가 운임을 확정하면 문자와 견적 확인 화면으로 안내됩니다.
            </div>
          </div>
        )}
      </form>

      {namePrompt && (
        <Pv2PromptModal
          title={namePrompt.kind === "cargo" ? "자주 쓰는 화물로 저장" : "자주 쓰는 요청으로 저장"}
          desc={
            namePrompt.kind === "cargo"
              ? "지금 입력한 톤수·차량형태·품목·상하차조건을 이름 하나로 저장합니다. 다음 발주에서 그 이름으로 한 번에 불러올 수 있습니다."
              : "지금 입력한 요청사항을 이름 하나로 저장합니다. 다음 발주에서 그 이름으로 한 번에 불러올 수 있습니다."
          }
          defaultValue={namePrompt.initial}
          placeholder={namePrompt.kind === "cargo" ? "예: 가산 파렛트 2p" : "예: 야간 하차 안내"}
          onConfirm={(name) =>
            namePrompt.kind === "cargo" ? saveCargoPresetAs(name) : saveNotePresetAs(name)
          }
          onCancel={() => setNamePrompt(null)}
        />
      )}

    </>
  );
}
