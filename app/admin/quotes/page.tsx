"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { insertWithDailyNumber } from "@/lib/generateNumber";
import { getCurrentStaffId, getCurrentStaffRole } from "@/lib/currentStaff";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import { formatPhoneNumber, VEHICLE_TYPES_ALL } from "@/lib/constants";
import { calcInclusiveAmount } from "@/lib/vat";
import { mapToLegacySettlementType } from "@/lib/settlementLabels";
import { LOADING_METHOD_OPTIONS } from "@/lib/loadingMethods";
import DateRangeFilter, {
  DatePreset,
  CustomDateRange,
  EMPTY_CUSTOM_RANGE,
  getDateRange,
} from "@/components/DateRangeFilter";
import DateTimePicker from "@/components/DateTimePicker";
import AddressSearch from "@/components/AddressSearch";
import MoneyInput from "@/components/MoneyInput";
import CollectionMethodInput, { CollectionMethodValue } from "@/components/CollectionMethodInput";
import PickupDropoffContactFields, {
  EMPTY_PICKUP_DROPOFF_CONTACT,
} from "@/components/PickupDropoffContactFields";
import {
  getMixedLoadingDiscountTiers,
  pickMixedDiscountTier,
  MixedLoadingDiscountTierRow,
} from "@/lib/mixedLoadingDiscountSettings";
import MixedDiscountStandardHint from "@/components/MixedDiscountStandardHint";
import { localInputToISOString, toLocalDateTimeInput } from "@/lib/localDateTime";
import { applyMixedDiscount } from "@/lib/settlementCalc";
import { roundToUnit } from "@/lib/roundToUnit";
// 🔴 차량형태 선택지는 DB(`rate_surcharges`)가 정본이고 **표시 순서만** 코드가 정한다.
//    모르는 옵션은 버리지 않고 맨 뒤에 붙인다(`lib/vehicleBodyTypes.ts` 참고).
import { orderBodyTypes, bodyTypeInfo } from "@/lib/vehicleBodyTypes";
import CompanySearchBox from "@/components/CompanySearchBox";
import { CUSTOMER_APPROVED_LABEL, formatCustomerApprovedAt } from "@/lib/quoteApproval";
// 🔴 관리자 화면도 `상담중` 을 「확인중」으로 그린다(사용자 지시 2026-09-16).
//    DB 값은 그대로이고 **보이는 글자만** 바꾼다 — 정의처는 이 파일 하나다.
import { quoteStatusAdminStyle } from "@/lib/quoteStatusLabels";
import RecurringContractBadge from "@/components/RecurringContractBadge";
import { fetchUnlinkedWonQuoteIds } from "@/lib/unlinkedWonQuotes";
import AdminMobileList from "@/components/AdminMobileList";
import DraggablePanel from "@/components/DraggablePanel";
import CallScriptPanel from "@/components/CallScriptPanel";
import RequiredMark from "@/components/RequiredMark";
import {
  minDropoffDateTime as minDropoffDateTimeOf,
  isDropoffGapOk,
  DROPOFF_MIN_GAP_LABEL,
} from "@/lib/dropoffGap";
import { autoTransportTime } from "@/lib/transportTimeAuto";
import {
  arrivalNoteLine,
  buildNotesWithArrival,
  arrivalTypeLabel,
  arrivalTypeHint,
  ARRIVAL_TIME_FREE_NOTE,
} from "@/lib/arrivalType";

// .field input 전역 CSS(width:100%, padding, border-radius 등)가 텍스트
// 입력창 기준이라 체크박스/라디오에 그대로 적용되면 뭉개져 보임 — 명시적으로
// 원래 크기로 되돌림
// 목록 조회 상한. 🔴 직접지정으로 긴 구간을 고르면 여기에 걸리므로 화면이 알려야 한다
//    (다른 세 목록 화면과 같은 장치다 — 이 화면에만 없었다).
const ALL_PERIOD_LIMIT = 50;
const FILTERED_PERIOD_LIMIT = 200;

const CHECKBOX_STYLE: React.CSSProperties = { width: "auto", flexShrink: 0 };

type Tier = {
  distance_from_km: number;
  distance_to_km: number | null;
  vehicle_type: string;
  base_fare: number;
};

type Surcharge = {
  category: string;
  option_name: string;
  rate_pct: number;
  flat_amount: number;
};

type ExtraFee = {
  vehicle_type: string;
  free_waiting_minutes: number;
  waiting_fee_per_unit: number | null;
  waypoint_fee: number | null;
};

type CompanyLite = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  status: string;
  /** 36차 A장 — 계약 청구주기. 🔴 「제안」이고 이 건의 값이 진실이다 */
  billing_cycle_default?: string | null;
};

/** 견적목록 맨 위에 얹는 대기 중 발주요청 한 줄 */
type PendingRequestRow = {
  id: string;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  item: string | null;
  created_at: string;
  companies: { name: string; is_recurring_contract?: boolean | null; recurring_contract_ended_on?: string | null } | null;
};

type QuoteRow = {
  id: string;
  quote_no: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  final_amount: number | null;
  status: string;
  created_at: string;
  guest_name: string | null;
  approved_by_customer_at: string | null;
  // 🔴 정기계약 두 컬럼은 「배지를 그릴 수 있는가」의 유일한 근거다(33차 B장).
  //    빼면 배지가 조용히 사라진다 — `RecurringContractBadge` 는 값이 없으면 아무것도 안 그린다.
  companies: {
    name: string;
    is_recurring_contract?: boolean | null;
    recurring_contract_ended_on?: string | null;
  } | null;
};

const SINGLE_SELECT_CATEGORIES = [
  "차량형태",
  "물품특성",
  "운송시간",
  "왕복/편도",
];

// 영업 퍼널 순서 (견적 저장 시 상태를 "뒤로 되돌리지" 않고 앞으로만 진행시키기 위한 기준)
const STATUS_ORDER = [
  "미접촉",
  "연락시도",
  "연락완료",
  "추후연락",
  "제안서발송",
  "견적요청",
  "견적발송",
  "첫거래완료",
  "재거래발생",
  "반복화주",
  "월정산화주",
];

function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function wonVatIncluded(n: number | null | undefined) {
  if (!n) return null;
  return calcInclusiveAmount(n).toLocaleString("ko-KR") + "원";
}

function QuotesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromRequestId = searchParams.get("from_request");
  const fromQuoteRequestId = searchParams.get("from_quote_request");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 대기 중인 화주 발주요청 — 견적목록 **맨 위에 고정**해서 보여준다(34차 지적 2번,
   * 사용자 확정). 날짜순으로 섞지 않는 이유: 처리해야 할 일이라 오래된 건이 아래로
   * 묻히면 안 되고, 기간 필터·정렬이 **견적 행에만** 걸려 기존 동작이 안 바뀐다.
   * 🔴 **`error` 를 버리고 빈 배열로 두지 말 것** — 조회가 실패하면 화면이
   *    「새 요청이 없다」로 보인다. 이 차수에서 가장 위험한 실패 모드다.
   * 🔴 **기존 「화주요청」 메뉴는 그대로 둔다**(사용자 확정) — 같은 것이 두 곳에
   *    보이는 것이 의도다. 이번 차수의 변경 범위를 좁히기 위한 것이니 지우지 말 것.
   */
  const [pendingRequests, setPendingRequests] = useState<PendingRequestRow[]>([]);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  /**
   * 「수주인데 운송오더가 없는 견적」의 id — `TopNav` 「견적 관리」 배지가 세는 것과
   * **같은 규칙**이다(`lib/unlinkedWonQuotes.ts`).
   * 🔴 신고 *"견적관리 부분에 계속해서 알림 표시 4건이 남아 있다"* 의 해소가 이것이다 —
   *    배지가 숫자만 말하고 **어느 건인지 볼 화면이 없어서** 지울 수가 없었다.
   * 🔴 조회 실패는 빈 집합으로 두되(표시가 없어질 뿐 목록은 멀쩡하다) `needOrderError`
   *    로 화면에 남긴다 — 조용히 삼키지 않는다(원칙 55번).
   */
  const [needOrderIds, setNeedOrderIds] = useState<Set<string>>(new Set());
  const [needOrderError, setNeedOrderError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState<DatePreset>("all");
  // 직접지정 구간(2026-09-17). `period === "custom"` 일 때만 쓰인다.
  const [customRange, setCustomRange] = useState<CustomDateRange>(EMPTY_CUSTOM_RANGE);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [distanceAutoCalculated, setDistanceAutoCalculated] = useState(false);
  const [allowManualDistance, setAllowManualDistance] = useState(false);
  /**
   * 🔴 화주가 고른 하차 도착구분(당착/내착). 견적 폼에는 저장 컬럼이 없고 **화면 표시
   *    전용**이다 — `quotes` 에 도착구분 컬럼을 만들지 않는다는 결정(28차 결정 1) 그대로다.
   *    값 자체는 특이사항 한 줄로 이어져 오더·배차까지 살아 있다.
   */
  const [dropoffArrivalType, setDropoffArrivalType] = useState<string | null>(null);
  /**
   * 🔴 「지금」 칩 (36차 PR 2 리뷰 2라운드 — 포털 발주요청과 같은 칩).
   *    저장 컬럼이 아니라 **제출 직전에 상차 시각을 다시 지금으로 맞추기 위한 표시**다.
   *    누른 시각 그대로 두면 담당자가 폼을 채우는 동안 시각이 과거가 된다.
   */
  const [pickupNow, setPickupNow] = useState(false);
  const [useManualFinalAmount, setUseManualFinalAmount] = useState(false);
  const [finalAmountOverride, setFinalAmountOverride] = useState("");
  const [ratesLoading, setRatesLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mixedDiscountTiers, setMixedDiscountTiers] = useState<MixedLoadingDiscountTierRow[]>([]);

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
    getMixedLoadingDiscountTiers().then(({ rows }) => setMixedDiscountTiers(rows));
  }, []);

  // 🔴 **화주포털 배송지와 같은 칸을 읽는다**(2026-09-15) — 그전에는 주소·시도·시군구
  //    셋만 읽어서, 화주가 포털에서 적어 둔 **상호·담당자·상세주소가 견적 폼으로
  //    이어지지 않았다.** 담당자는 같은 정보를 손으로 다시 적고 있었다.
  //    🔴 칸을 줄이지 말 것 — 줄이면 그 상태로 되돌아간다.
  type SavedLocation = {
    id: string;
    company_name: string | null;
    location_name: string | null;
    address: string | null;
    address_detail: string | null;
    location_type: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    sido: string | null;
    sigungu: string | null;
  };
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [saveOrigin, setSaveOrigin] = useState(false);
  const [saveDestination, setSaveDestination] = useState(false);

  const [customerMode, setCustomerMode] = useState<"company" | "guest">(
    "company"
  );
  const [companySearch, setCompanySearch] = useState("");
  const [companyResults, setCompanyResults] = useState<CompanyLite[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyLite | null>(
    null
  );

  // ── 견적 상세 입력 접기 (2026-09-16 · 소수정 ③) ────────────────────────────
  //
  // 사용자 지시: *"견적관리에서 처음에 견적 적는곳이 화주업체검색까지만 노출되어
  // 있고 그아래 정보들은 펼칠수 있게 하자. (…) 그러면 견적목록도 한눈에 들어올것
  // 같다."* — 목적은 **목록을 보이게 하는 것**이지 입력을 줄이는 것이 아니다.
  //
  // 🔴 **`<details>` 를 쓰지 않았다** — 열림을 코드가 정해야 하는 자리가 넷이고
  //    (화주 선택 · 개인/신규 전환 · 프리필 진입 · 저장 성공 후 접기),
  //    `<details>` 는 사용자가 연 것과 코드가 연 것을 구분할 수 없다.
  // 🔴 **`display: none` 이 아니라 조건부 렌더다** — 숨긴 채로 두면 `required` 가
  //    달린 주소 칸이 DOM 에 남아 브라우저가 *"invalid form control is not
  //    focusable"* 로 **제출을 조용히 막는다.** 폼 값은 전부 `form` state 에 있어서
  //    떼었다 붙여도 잃는 것이 없다.
  // 🔴 **저장에 실패했을 때 접지 말 것** — 담당자가 방금 적은 것이 통째로 사라진
  //    것처럼 보인다(접어도 값은 남지만 그것을 알 길이 없다).
  // 🔴 프리필로 들어오면 **처음부터 펼친다** — 「견적 작성」을 눌러 온 사람은 이미
  //    적으러 온 것이라, 접힌 화면을 한 번 더 누르게 하면 그냥 손해다.
  const [detailsOpen, setDetailsOpen] = useState(
    () => !!(fromRequestId || fromQuoteRequestId)
  );

  const [form, setForm] = useState({
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    origin: "",
    originDetail: "",
    originSido: "",
    originSigungu: "",
    destination: "",
    destinationDetail: "",
    destinationSido: "",
    destinationSigungu: "",
    ...EMPTY_PICKUP_DROPOFF_CONTACT,
    distance_km: "",
    vehicle_type: "1톤",
    collection_method: "broker" as CollectionMethodValue["collection_method"],
    billing_cycle: "per_order" as CollectionMethodValue["billing_cycle"],
    direct_collection_point: null as CollectionMethodValue["direct_collection_point"],
    loading_type: "exclusive" as "exclusive" | "mixable",
    mixed_shipper_consent: false,
    mixed_discount_type: null as "amount" | "percent" | null,
    mixed_discount_amount: "",
    mixed_discount_percent: "",
    mixed_note: "",
    item: "",
    차량형태: "카고",
    상차조건: LOADING_METHOD_OPTIONS[0],
    하차조건: LOADING_METHOD_OPTIONS[0],
    물품특성: "일반화물",
    운송시간: "평일 주간",
    "왕복/편도": "편도",
    waitingMinutes: "",
    waypointCount: "",
    requested_pickup_at: "",
    requested_dropoff_at: "",
    notes: "",
  });

  async function loadRateData() {
    setRatesLoading(true);
    const [t, s, e] = await Promise.all([
      supabase.from("rate_distance_tiers").select("*"),
      supabase.from("rate_surcharges").select("*"),
      supabase.from("rate_vehicle_extra_fees").select("*"),
    ]);
    setTiers((t.data as Tier[]) || []);
    setSurcharges((s.data as Surcharge[]) || []);
    setExtraFees((e.data as ExtraFee[]) || []);
    setRatesLoading(false);
  }

  async function loadQuotes(
    preset: DatePreset = period,
    custom: CustomDateRange = customRange
  ) {
    setLoading(true);
    const { from, to } = getDateRange(preset, custom);
    let query = supabase
      .from("quotes")
      .select(
        "id,quote_no,origin,destination,vehicle_type,final_amount,status,created_at,guest_name,approved_by_customer_at,companies(name,is_recurring_contract,recurring_contract_ended_on)"
      )
      .order("created_at", { ascending: false })
      .limit(preset === "all" ? ALL_PERIOD_LIMIT : FILTERED_PERIOD_LIMIT);
    if (from) query = query.gte("created_at", from);
    // 🔴 `to` 는 **다음 날 자정**이라 `lt` 여야 끝날 그 자체가 포함된다(정의처 주석).
    if (to) query = query.lt("created_at", to);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setQuotes(data as any as QuoteRow[]);
    setLoading(false);
  }

  // 🔴 대기 중 발주요청만 가져온다(`status='대기중'`). 승인되면 견적이 되므로 사라진다.
  //    정렬은 **불러온 뒤 코드에서** 한다 — `.order()` 를 없는 컬럼에 걸면 조용히 400 이다.
  async function loadPendingRequests() {
    const { data, error } = await supabase
      .from("portal_order_requests")
      .select(
        "id,origin,destination,vehicle_type,item,created_at,companies(name,is_recurring_contract,recurring_contract_ended_on)"
      )
      .eq("status", "대기중");
    if (error) {
      // 🔴 삼키지 말 것 — 빈 목록은 「새 요청이 없다」와 구분이 안 된다.
      setRequestsError(error.message);
      setPendingRequests([]);
      return;
    }
    setRequestsError(null);
    setPendingRequests(
      ((data as any as PendingRequestRow[]) || []).sort((a, b) =>
        (b.created_at || "").localeCompare(a.created_at || "")
      )
    );
  }

  async function loadNeedOrder() {
    const { ids, error } = await fetchUnlinkedWonQuoteIds();
    setNeedOrderIds(ids);
    setNeedOrderError(error);
  }

  // 최초 진입 시 운임기준 데이터 + 견적 목록 로드
  useEffect(() => {
    loadRateData();
    loadQuotes("all");
    loadPendingRequests();
    loadNeedOrder();
  }, []);

  // 기간 필터 변경 시 목록만 다시 로드
  useEffect(() => {
    loadQuotes(period, customRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customRange.from, customRange.to]);

  // 화주 발주요청을 승인해서 넘어온 경우, 요청 내용을 견적 폼에 미리 채워줌
  useEffect(() => {
    async function prefillFromRequest() {
      if (!fromRequestId) return;
      const { data: reqData } = await supabase
        .from("portal_order_requests")
        .select(
          "id,company_id,origin,origin_sido,origin_sigungu,destination,destination_sido,destination_sigungu,origin_company_name,origin_contact_name,origin_contact_phone,destination_company_name,destination_contact_name,destination_contact_phone,vehicle_type,body_type,item,load_condition,unload_condition,item_condition,transport_time,urgency,trip_type,loading_type,collection_method,direct_collection_point,requested_billing_cycle,dropoff_arrival_type,waiting_minutes,waypoint_count,requested_pickup_at,requested_dropoff_at,notes,companies(id,name,phone,address,status,billing_cycle_default)"
        )
        .eq("id", fromRequestId)
        .single();
      if (!reqData) return;

      setCustomerMode("company");
      if (reqData.companies) {
        setSelectedCompany(reqData.companies as any);
      }
      // 🔴 화면 표시용 — 하차 시각이 빈 채로 채워지는 이유를 담당자에게 알려준다(28차 §3).
      setDropoffArrivalType(((reqData as any).dropoff_arrival_type as string) || null);
      setForm((prev) => ({
        ...prev,
        origin: reqData.origin || "",
        originSido: reqData.origin_sido || "",
        originSigungu: reqData.origin_sigungu || "",
        destination: reqData.destination || "",
        destinationSido: reqData.destination_sido || "",
        destinationSigungu: reqData.destination_sigungu || "",
        origin_company_name: reqData.origin_company_name || "",
        origin_contact_name: reqData.origin_contact_name || "",
        origin_contact_phone: reqData.origin_contact_phone || "",
        destination_company_name: reqData.destination_company_name || "",
        destination_contact_name: reqData.destination_contact_name || "",
        destination_contact_phone: reqData.destination_contact_phone || "",
        vehicle_type: reqData.vehicle_type || prev.vehicle_type,
        차량형태: reqData.body_type || prev.차량형태,
        상차조건: reqData.load_condition || prev.상차조건,
        하차조건: reqData.unload_condition || prev.하차조건,
        물품특성: reqData.item_condition || prev.물품특성,
        운송시간: reqData.transport_time || prev.운송시간,
        "왕복/편도": reqData.trip_type || prev["왕복/편도"],
        waitingMinutes:
          reqData.waiting_minutes != null ? String(reqData.waiting_minutes) : prev.waitingMinutes,
        waypointCount:
          reqData.waypoint_count != null ? String(reqData.waypoint_count) : prev.waypointCount,
        item: reqData.item || "",
        // 🔴 화주가 발주 요청에서 고른 적재구분을 그대로 이어받는다(PR #103 리뷰 6번).
        //   빠뜨리면 화주가 "혼적가능"을 골라도 견적이 독차로 계산돼 할인이 사라진다.
        loading_type: ((reqData as any).loading_type as "exclusive" | "mixable") || prev.loading_type,
        // 🔴 화주가 발주 요청에서 고른 정산방식을 그대로 이어받는다(27차 리뷰 4라운드).
        //   빠뜨리면 화주가 선착불을 골라도 견적이 주선사 정산으로 저장돼, 담당자가
        //   되물어야 하고 화주에게 나가는 견적서의 정산방식도 사실과 달라진다.
        collection_method:
          ((reqData as any).collection_method as "broker" | "driver_direct") || prev.collection_method,
        // 🔴 36차 B장 — 청구주기도 이어받는다. ⚠️ 이 자리에는 한동안 *「청구주기는
        //   발주 요청에 없다」* 는 주석이 있었는데 **B장이 그 칸을 만들었다.**
        //   🔴 그래도 **요청값이지 확정이 아니다** — 담당자가 이 화면에서 바꿀 수 있고,
        //   화주 계약과 다르면 정산방식 칸에 「계약과 다름」이 뜬다.
        billing_cycle:
          ((reqData as any).requested_billing_cycle as "per_order" | "monthly") ||
          ((reqData as any).companies?.billing_cycle_default as "per_order" | "monthly") ||
          prev.billing_cycle,
        direct_collection_point:
          (reqData as any).collection_method === "driver_direct"
            ? ((reqData as any).direct_collection_point as any) || "undecided"
            : null,
        requested_pickup_at: reqData.requested_pickup_at
          ? toLocalDateTimeInput(reqData.requested_pickup_at)
          : prev.requested_pickup_at,
        requested_dropoff_at: reqData.requested_dropoff_at
          ? toLocalDateTimeInput(reqData.requested_dropoff_at)
          : prev.requested_dropoff_at,
        // 🔴 **당착·내착을 특이사항에 남긴다** — `quotes` 에는 도착구분 컬럼이 없어서
        //   이 줄이 없으면 화주가 「당착」을 골랐다는 사실이 견적 전환에서 통째로
        //   사라진다(원칙 42번 정보 손실 금지). 저장된 하차 일시의 23:59 는 자리
        //   채움이라 그것만으로는 담당자가 뜻을 알 수 없다.
        //   ⚠️ 담당자가 지울 수 있는 한 줄이며, 그대로 두면 견적서 특이사항에도 남는다.
        notes:
          [
            reqData.notes,
            // 🔴 문구는 `lib/arrivalType.ts` 하나다 — 여기 다시 적으면 제출 직전의
            //    중복 판정이 어긋나 같은 줄이 두 번 들어간다.
            arrivalNoteLine((reqData as any).dropoff_arrival_type),
          ]
            .filter(Boolean)
            .join("\n") || prev.notes,
      }));
    }
    prefillFromRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromRequestId]);

  // 공개 견적문의를 견적관리로 전환해서 넘어온 경우, 문의 내용을 견적 폼에 미리 채워줌
  useEffect(() => {
    async function prefillFromQuoteRequest() {
      if (!fromQuoteRequestId) return;
      // public_quote_requests는 anon SELECT 정책이 없는 테이블이라, 서비스 롤 키를 쓰는
      // 서버 API를 통해서만 조회 가능 (anon 클라이언트로 직접 조회하면 항상 빈 결과가 옴)
      const res = await fetch("/api/admin/public-quote-requests");
      if (!res.ok) return;
      const { data: allRequests } = await res.json();
      const reqData = (allRequests || []).find((r: any) => r.id === fromQuoteRequestId);
      if (!reqData) return;

      // 연락처로 기존 화주가 있는지 확인해서 있으면 기존 화주 모드로, 없으면 개인/신규 고객으로 프리필
      const [byPhone, byContactMobile] = await Promise.all([
        supabase.from("companies").select("id,name,phone,address,status,billing_cycle_default").eq("phone", reqData.phone).limit(1),
        supabase.from("companies").select("id,name,phone,address,status,billing_cycle_default").eq("contact_mobile", reqData.phone).limit(1),
      ]);
      const matchedCompany = byPhone.data?.[0] || byContactMobile.data?.[0] || null;

      if (matchedCompany) {
        setCustomerMode("company");
        setSelectedCompany(matchedCompany as any);
      } else {
        setCustomerMode("guest");
        setForm((prev) => ({
          ...prev,
          guest_name: reqData.name || "",
          guest_phone: reqData.phone || "",
          guest_email: reqData.email || "",
        }));
      }

      setForm((prev) => ({
        ...prev,
        origin: reqData.origin || "",
        originSido: reqData.origin_sido || "",
        originSigungu: reqData.origin_sigungu || "",
        destination: reqData.destination || "",
        destinationSido: reqData.destination_sido || "",
        destinationSigungu: reqData.destination_sigungu || "",
        vehicle_type: reqData.vehicle_type || prev.vehicle_type,
        item: reqData.item || "",
        상차조건: reqData.pickup_loading_method || prev.상차조건,
        하차조건: reqData.dropoff_loading_method || prev.하차조건,
        requested_pickup_at: reqData.requested_pickup_at
          ? toLocalDateTimeInput(reqData.requested_pickup_at)
          : prev.requested_pickup_at,
        notes: reqData.notes || prev.notes,
      }));
    }
    prefillFromQuoteRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromQuoteRequestId]);

  useEffect(() => {
    let active = true;
    async function search() {
      if (companySearch.trim().length < 1) {
        setCompanyResults([]);
        return;
      }
      const { data } = await supabase
        .from("companies")
        .select("id,name,phone,address,status,billing_cycle_default")
        .ilike("name", `%${companySearch}%`)
        .limit(8);
      if (active) setCompanyResults((data as CompanyLite[]) || []);
    }
    const t = setTimeout(search, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [companySearch]);

  useEffect(() => {
    async function loadLocations() {
      if (customerMode !== "company" || !selectedCompany) {
        setSavedLocations([]);
        return;
      }
      const { data, error: locError } = await supabase
        .from("customer_locations")
        .select(
          "id,company_name,location_name,address,address_detail,location_type,contact_name,contact_phone,sido,sigungu"
        )
        .eq("company_id", selectedCompany.id);
      // 🔴 `error` 를 삼키지 말 것(원칙 55번) — 조용히 빈 목록이 되면 「저장된 주소가
      //    분명히 있는데 칩이 안 뜬다」가 되고 원인을 짚을 단서가 없다.
      if (locError) {
        setError(`저장된 주소를 불러오지 못했습니다: ${locError.message}`);
        setSavedLocations([]);
        return;
      }
      setSavedLocations((data || []) as SavedLocation[]);
    }
    loadLocations();
  }, [selectedCompany, customerMode]);

  /** 저장된 배송지 칩을 눌렀을 때 — 주소뿐 아니라 상호·담당자·상세주소까지 채운다.
   *  🔴 **화주포털 발주 폼의 `applyLocation()` 과 같은 규칙이다** — 비어 있는 칸만
   *     채우지 않고 **현장 정보는 그 배송지 값이 이긴다**(주소를 바꿨는데 옛 담당자가
   *     남아 있으면 그게 더 위험하다). 값이 없으면 지금 적힌 것을 그대로 둔다. */
  function applySavedLocation(side: "origin" | "destination", l: SavedLocation) {
    setForm((prev) =>
      side === "origin"
        ? {
            ...prev,
            origin: l.address || "",
            originDetail: l.address_detail || "",
            originSido: l.sido || "",
            originSigungu: l.sigungu || "",
            origin_company_name: l.company_name || prev.origin_company_name,
            origin_contact_name: l.contact_name || prev.origin_contact_name,
            origin_contact_phone: l.contact_phone || prev.origin_contact_phone,
          }
        : {
            ...prev,
            destination: l.address || "",
            destinationDetail: l.address_detail || "",
            destinationSido: l.sido || "",
            destinationSigungu: l.sigungu || "",
            destination_company_name: l.company_name || prev.destination_company_name,
            destination_contact_name: l.contact_name || prev.destination_contact_name,
            destination_contact_phone: l.contact_phone || prev.destination_contact_phone,
          }
    );
  }

  /** 칩에 찍을 이름 — 별칭 → 상호 → 주소. 포털 카드와 같은 순서다. */
  function savedLocLabel(l: SavedLocation) {
    return l.location_name || l.company_name || l.address || "이름 없음";
  }

  // 카카오 API로 출발지/도착지 실제 도로거리를 자동 계산
  async function handleAutoDistance() {
    if (!form.origin.trim() || !form.destination.trim()) {
      setError("거리를 자동계산하려면 출발지와 도착지를 먼저 입력해주세요.");
      return;
    }
    setCalculatingDistance(true);
    setError(null);
    try {
      const res = await fetch("/api/distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: form.origin, destination: form.destination }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "거리 계산에 실패했습니다.");
        return;
      }
      setForm((prev) => ({ ...prev, distance_km: String(data.distance_km) }));
      setDistanceAutoCalculated(true);
      setAllowManualDistance(false);
    } catch {
      setError("거리 계산 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setCalculatingDistance(false);
    }
  }

  // 출발지/도착지(도로명주소)가 둘 다 채워지면 버튼 클릭 없이 자동으로 거리계산.
  // 타이핑 중에 매번 호출되지 않도록 디바운스 적용, 상세주소 입력은 감지 대상에서 제외.
  // "직접 입력한 거리를 사용" 체크박스를 켠 경우엔 자동계산으로 덮어쓰지 않음.
  useEffect(() => {
    if (!form.origin.trim() || !form.destination.trim()) return;
    if (allowManualDistance) return;
    const t = setTimeout(() => {
      handleAutoDistance();
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.origin, form.destination]);

  function findOption(category: string, name: string) {
    return surcharges.find(
      (s) => s.category === category && s.option_name === name
    );
  }

  const calc = useMemo(() => {
    const distance = Number(form.distance_km) || 0;
    // 거리 상한(distance_to_km) 오름차순으로 정렬한 뒤, distance가 들어가는 첫 구간을 고른다.
    // distance_from_km을 보지 않는 이유: 구간이 0~10 / 11~20 으로 끊겨 있어 정수 사이가
    // 비어 있고(10.4km 등 소수 거리가 어느 구간에도 안 걸림), 거리 API는 소수 첫째 자리까지
    // 돌려준다. 구간 라벨이 "10km 이내"이므로 10.0까지가 그 구간이고 10.1부터는 다음 구간이다.
    // 상한이 없는 마지막 구간(distance_to_km === null)은 Infinity로 취급해 항상 뒤로 보낸다.
    const tierMatch = tiers
      .filter((t) => t.vehicle_type === form.vehicle_type)
      .sort(
        (a, b) =>
          (a.distance_to_km ?? Infinity) - (b.distance_to_km ?? Infinity)
      )
      .find((t) => t.distance_to_km === null || distance <= t.distance_to_km);
    if (!tierMatch) return null;

    const base = tierMatch.base_fare;

    const selections: [string, string][] = [
      ["차량형태", form.차량형태],
      ["물품특성", form.물품특성],
      ["운송시간", form.운송시간],
      ["왕복/편도", form["왕복/편도"]],
    ];

    let ratePctTotal = 0;
    let flatTotal = 0;
    const breakdown: { label: string; amount: number }[] = [];

    for (const [cat, opt] of selections) {
      const found = findOption(cat, opt);
      if (!found) continue;
      if (found.rate_pct) {
        ratePctTotal += found.rate_pct;
        breakdown.push({
          label: `${opt} (${(found.rate_pct * 100).toFixed(0)}%)`,
          amount: base * found.rate_pct,
        });
      }
      if (found.flat_amount) {
        flatTotal += found.flat_amount;
        breakdown.push({ label: opt, amount: found.flat_amount });
      }
    }

    // 상차조건 / 하차조건은 각각 별도 작업이라 상하차방식 가산기준을 양쪽에 개별 적용
    for (const [prefix, opt] of [
      ["상차", form.상차조건],
      ["하차", form.하차조건],
    ] as [string, string][]) {
      const found = findOption("상하차방식", opt);
      if (!found) continue;
      if (found.rate_pct) {
        ratePctTotal += found.rate_pct;
        breakdown.push({
          label: `${prefix} ${opt} (${(found.rate_pct * 100).toFixed(0)}%)`,
          amount: base * found.rate_pct,
        });
      }
      if (found.flat_amount) {
        flatTotal += found.flat_amount;
        breakdown.push({ label: `${prefix} ${opt}`, amount: found.flat_amount });
      }
    }

    const extra = extraFees.find((e) => e.vehicle_type === form.vehicle_type);
    let waitingExtra = 0;
    const waitingMin = Number(form.waitingMinutes) || 0;
    // 🔴 폴백 20분 — `rate_vehicle_extra_fees` 에 그 차급 행이 없을 때만 쓰인다.
    //   무료 대기시간은 DB 값이 정본이고(담당자가 `/admin/rates` 에서 바꾼다), 이 숫자는
    //   행이 통째로 빠진 비정상 상황의 안전값이다. 2026-08-27 에 30 → 20 으로 맞췄다
    //   (PR #103 리뷰 4번 + `migrations/2026-08-27_free_wait_20min.sql`).
    const freeMin = extra?.free_waiting_minutes ?? 20;
    if (extra?.waiting_fee_per_unit && waitingMin > freeMin) {
      const units = Math.ceil((waitingMin - freeMin) / 30);
      waitingExtra = units * extra.waiting_fee_per_unit;
      breakdown.push({ label: `대기료(${waitingMin}분)`, amount: waitingExtra });
    }

    let waypointExtra = 0;
    const waypointCount = Number(form.waypointCount) || 0;
    if (extra?.waypoint_fee && waypointCount > 0) {
      waypointExtra = waypointCount * extra.waypoint_fee;
      breakdown.push({
        label: `경유지 ${waypointCount}곳`,
        amount: waypointExtra,
      });
    }

    // 🔴 **가산 소계를 격자에 올린다**(운임기준표 v12 C장 · `lib/roundToUnit.ts`).
    //    A장이 기본운임을, B장이 가산 정액을 격자에 올렸는데도 **왕복 요율 ·
    //    대기료 · 경유지비**가 만원을 깨뜨린다(대기료·경유지비는 13행 중 각 4행이
    //    5,000 단위다 — 2026-09-15 실측).
    // 🔴 **개별 가산 줄이 아니라 소계에 건다** — 줄마다 반올림하면 작은 요율 줄이
    //    통째로 올라가 과다 청구가 된다.
    // 🔴 **대기료·경유지비를 이 소계 밖으로 빼지 말 것** — 빼면 최종금액이 만원에서
    //    벗어난다.
    const pctAmount = base * ratePctTotal;
    const surchargeTotal = roundToUnit(
      pctAmount + flatTotal + waitingExtra + waypointExtra,
      form.vehicle_type
    );
    const rawFinal = Math.max(base + surchargeTotal, 0);

    // 혼적가능 + 화주동의 + 할인조건이 설정된 견적은, 실제 정보망/화주에게
    // 안내하는 가격이 혼적여부에 따라 둘로 나뉘지 않는다는 실사용 피드백에
    // 따라 최종 견적금액 자체에 할인을 바로 반영한다(배차 단계 "혼적 실행"은
    // 이제 순수 기록용 플래그로, 가격에 다시 손대지 않음)
    let final = rawFinal;
    if (
      form.loading_type === "mixable" &&
      form.mixed_shipper_consent &&
      form.mixed_discount_type
    ) {
      const discounted = applyMixedDiscount(
        rawFinal,
        form.loading_type,
        form.mixed_discount_type,
        Number(form.mixed_discount_amount) || 0,
        Number(form.mixed_discount_percent) || 0
      );
      // 🔴 **할인액도 격자에 올린다** — 율(%) 방식이 임의의 끝자리를 만들기 때문이다.
      //    `rawFinal` 이 이미 만원 배수라 여기서 반올림하면 `final` 도 만원 배수가 된다.
      // 🔴 **`applyMixedDiscount()` 의 결과를 그대로 `final` 로 쓰지 말 것** —
      //    그러면 할인이 걸린 견적만 만원에서 벗어난다.
      const discountAmount = roundToUnit(rawFinal - discounted, form.vehicle_type);
      if (discountAmount > 0) {
        breakdown.push({
          label:
            form.mixed_discount_type === "percent"
              ? `혼적 할인(${form.mixed_discount_percent}%)`
              : "혼적 할인",
          amount: -discountAmount,
        });
        // 🔴 `discounted` 가 아니라 **반올림한 할인액을 뺀 값**이다(위 참고).
        final = Math.max(rawFinal - discountAmount, 0);
      }
    }

    return { base, surchargeTotal, final, breakdown, tierMatch };
  }, [tiers, surcharges, extraFees, form]);

  // 입력된 거리에 해당하는 표준 혼적 할인율 구간 (없으면 null — 거리를 아직 안 넣은 상태)
  const mixedDiscountTier = useMemo(
    () => pickMixedDiscountTier(mixedDiscountTiers, Number(form.distance_km) || null),
    [mixedDiscountTiers, form.distance_km]
  );

  // 최소 하차일시 — 🔴 **거리와 무관하게 상차 +30분**이다(36차 D장). 정의처는
  // `lib/dropoffGap.ts` 하나이고 화주포털 발주요청도 같은 값을 쓴다.
  const minDropoffDateTime = useMemo(
    () => minDropoffDateTimeOf(form.requested_pickup_at),
    [form.requested_pickup_at]
  );

  const minDropoffLabel = form.requested_pickup_at ? DROPOFF_MIN_GAP_LABEL : undefined;

  // 희망 상차일시를 정하면 운송시간을 자동으로 맞춰준다 (담당자가 직접 바꿀 수 있다).
  //
  // 🔴 **규칙은 `lib/transportTimeAuto.ts` 하나다**(39차 C장) — 견적문의·발주요청이 같은
  //    함수를 쓴다. 여기에 조건을 다시 적으면 세 화면이 다른 답을 내고, 화주가 본 금액과
  //    담당자가 본 금액이 갈린다.
  // ⚠️ **그전에는 이 자리에 규칙이 인라인으로 있었고 틀렸다** — `출퇴근/혼잡`·`새벽` 을
  //    아예 안 썼고(`hour < 8 || hour >= 20` 을 전부 야간으로 봤다), `평일` 부분일치라
  //    `평일 주간`·`평일 야간` 중 배열 순서대로 먼저 오는 쪽이 잡혔다.
  useEffect(() => {
    if (!form.requested_pickup_at) return;
    const options = surcharges
      .filter((s) => s.category === "운송시간")
      .map((s) => s.option_name);
    const matched = autoTransportTime(form.requested_pickup_at, options);
    if (matched) setForm((prev) => ({ ...prev, 운송시간: matched }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.requested_pickup_at, surcharges]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 🔴 **같은 발주요청으로 견적이 두 번 만들어지면 안 된다**(34차).
    //    화주신청 승인 API 와 같은 패턴이다 — 화면 state 를 믿지 말고 **저장 직전에
    //    그 행을 다시 읽어** 이미 처리됐으면 거절한다(원칙 44번과 같은 결).
    //    목록은 `status='대기중'` 만 보여주지만, 탭을 열어둔 채 다른 사람이 먼저
    //    처리했으면 그 탭의 화면은 낡은 상태다.
    if (fromRequestId) {
      const { data: reqNow, error: reqErr } = await supabase
        .from("portal_order_requests")
        .select("id,status,quote_id")
        .eq("id", fromRequestId)
        .maybeSingle();
      if (reqErr) {
        setError(`발주요청 상태를 확인하지 못했습니다: ${reqErr.message}`);
        return;
      }
      if (!reqNow) {
        setError("발주요청을 찾을 수 없습니다. 목록을 새로고침해주세요.");
        return;
      }
      if (reqNow.quote_id || reqNow.status !== "대기중") {
        setError(
          "이 발주요청은 이미 견적으로 전환되었습니다. 목록을 새로고침해주세요."
        );
        return;
      }
    }

    if (customerMode === "company" && !selectedCompany) {
      setError("화주 업체를 검색해서 선택해주세요.");
      return;
    }
    // 🔴 개인·신규 고객의 필수는 **연락처**다(위 폼 주석 참고). 이름은 선택이다.
    if (customerMode === "guest" && !form.guest_phone.trim()) {
      setError("개인/신규 고객 연락처를 입력해주세요.");
      return;
    }
    if (!form.origin.trim()) {
      setError("출발지를 입력해주세요.");
      return;
    }
    if (!form.destination.trim()) {
      setError("도착지를 입력해주세요.");
      return;
    }
    if (!form.distance_km || Number(form.distance_km) <= 0) {
      setError("거리(km)를 입력해주세요.");
      return;
    }
    // 🔴 품목 필수(사용자 지시 2026-09-15) — 화면 표시(`field-required`)와 **한 벌이다.**
    if (!form.item.trim()) {
      setError("품목을 입력해주세요.");
      return;
    }
    if (!distanceAutoCalculated && !allowManualDistance) {
      setError(
        "거리 자동계산을 먼저 실행해주세요. 직접 입력한 값을 쓰시려면 거리 입력창 아래 체크박스를 선택해주세요."
      );
      return;
    }
    // 🔴 입력창 하한과 **같은 규칙을 제출 직전에 한 번 더** 본다 — 하한을 정하기 전에
    //    하차를 먼저 골라 두면 입력창만으로는 막히지 않는다.
    // 🔴 **당착·내착은 이 규칙의 예외다**(27차) — 시각이 무관한 선택지라, 상차가
    //    23:40 인 당착 건이 「상차 후 30분」에 걸려 접수가 막힌다. 포털이 같은 자리에서
    //    같은 예외를 둔다. 🔴 예외를 지우면 밤 시간대 당착 건을 아예 못 넣는다.
    if (
      !dropoffArrivalType &&
      !isDropoffGapOk(form.requested_pickup_at, form.requested_dropoff_at)
    ) {
      setError(`희망 하차일시는 ${DROPOFF_MIN_GAP_LABEL}.`);
      return;
    }
    if (!calc) {
      setError("해당 거리에 맞는 운임기준을 찾지 못했습니다. 거리를 확인해주세요.");
      return;
    }

    setSaving(true);

    const fullOrigin = [form.origin, form.originDetail]
      .filter((v) => v.trim())
      .join(" ");
    const fullDestination = [form.destination, form.destinationDetail]
      .filter((v) => v.trim())
      .join(" ");

    const staffId = await getCurrentStaffId();
    // 🔴 **`quote_no` 를 여기에 직접 넣지 말 것** — `insertWithDailyNumber` 가 채운다.
    //    번호가 겹치면(그날 건을 지웠거나 동시에 저장하면) 그 함수가 **다시 뽑아
    //    재시도**한다. 직접 넣으면 재시도가 같은 번호를 다시 쓴다.
    //    ⚠️ 이 자리가 실제로 저장을 통째로 막았다(2026-09-16 · `lib/generateNumber.ts`).
    const { data: newQuote, error } = await insertWithDailyNumber("quotes", "Q", {
        created_by: staffId,
        company_id: customerMode === "company" ? selectedCompany!.id : null,
        // 이름은 선택이라 빈 값이면 null 로 — 목록이 `guest_name ||` 로 대체 표기한다
        guest_name: customerMode === "guest" ? form.guest_name.trim() || null : null,
        guest_phone:
          customerMode === "guest" ? form.guest_phone || null : null,
        guest_email:
          customerMode === "guest" ? form.guest_email || null : null,
        origin: fullOrigin || null,
        origin_sido: form.originSido || null,
        origin_sigungu: form.originSigungu || null,
        destination: fullDestination || null,
        destination_sido: form.destinationSido || null,
        destination_sigungu: form.destinationSigungu || null,
        origin_company_name: form.origin_company_name.trim() || null,
        origin_contact_name: form.origin_contact_name.trim() || null,
        origin_contact_phone: form.origin_contact_phone.trim() || null,
        destination_company_name: form.destination_company_name.trim() || null,
        destination_contact_name: form.destination_contact_name.trim() || null,
        destination_contact_phone: form.destination_contact_phone.trim() || null,
        distance_km: Number(form.distance_km) || null,
        vehicle_type: form.vehicle_type,
        collection_method: form.collection_method,
        billing_cycle: form.billing_cycle,
        direct_collection_point:
          form.collection_method === "driver_direct" ? form.direct_collection_point : null,
        ...(mapToLegacySettlementType(form.collection_method, form.billing_cycle, form.direct_collection_point)
          ? {
              settlement_type: mapToLegacySettlementType(
                form.collection_method,
                form.billing_cycle,
                form.direct_collection_point
              ),
            }
          : {}),
        loading_type: form.loading_type,
        mixed_shipper_consent: form.loading_type === "mixable" ? form.mixed_shipper_consent : false,
        mixed_discount_type: form.loading_type === "mixable" ? form.mixed_discount_type : null,
        mixed_discount_amount: Number(form.mixed_discount_amount) || 0,
        mixed_discount_percent: Number(form.mixed_discount_percent) || 0,
        mixed_note: form.loading_type === "mixable" ? form.mixed_note || null : null,
        item: form.item || null,
        base_fare: calc.base,
        surcharge_amount: calc.surchargeTotal,
        discount_amount: 0,
        final_amount:
          useManualFinalAmount && finalAmountOverride ? Number(finalAmountOverride) : calc.final,
        status: "상담중",
        // 🔴 「지금」이면 **제출하는 그 순간**으로 다시 맞춘다 — 칩을 누른 시각을 그대로
        //    쓰면 폼을 채우는 동안 흐른 시간만큼 과거가 된다(포털과 같은 처리).
        requested_pickup_at: pickupNow
          ? new Date().toISOString()
          : localInputToISOString(form.requested_pickup_at),
        requested_dropoff_at: localInputToISOString(form.requested_dropoff_at),
        // 🔴 **당착·내착을 특이사항 한 줄로 남긴다** — `quotes` 에 도착구분 컬럼이
        //    없어서(28차 결정 1) 이 줄이 유일한 전달 경로다. 이미 들어 있으면(포털
        //    요청에서 넘어온 건) **다시 붙이지 않는다.**
        notes: buildNotesWithArrival(form.notes, dropoffArrivalType) || null,
        selected_options: {
          톤수: form.vehicle_type,
          차량형태: form.차량형태,
          상차조건: form.상차조건,
          하차조건: form.하차조건,
          물품특성: form.물품특성,
          운송시간: form.운송시간,
          "왕복/편도": form["왕복/편도"],
          대기시간_분: Number(form.waitingMinutes) || 0,
          경유지수: Number(form.waypointCount) || 0,
        },
    });

    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    // 견적을 받은 화주는 영업상태를 "견적요청" 이상으로 자동 승격 (이미 더 진행된 상태면 건드리지 않음)
    if (customerMode === "company" && selectedCompany) {
      const currentIdx = STATUS_ORDER.indexOf(selectedCompany.status);
      const targetIdx = STATUS_ORDER.indexOf("견적요청");
      if (currentIdx !== -1 && currentIdx < targetIdx) {
        await supabase
          .from("companies")
          .update({ status: "견적요청" })
          .eq("id", selectedCompany.id);
      }
    }

    // 가산 항목 세부 내역을 quote_items에 저장
    if (newQuote && calc.breakdown.length > 0) {
      await supabase.from("quote_items").insert(
        calc.breakdown.map((b) => ({
          quote_id: newQuote.id,
          item_name: b.label,
          amount: Math.round(b.amount),
        }))
      );
    }

    // 체크했다면 이번 출발지/도착지를 이 화주의 자주 쓰는 주소로 저장
    if (customerMode === "company" && selectedCompany) {
      const toSave = [];
      // 🔴 **화주포털이 저장하는 모양과 같아야 한다**(2026-09-15) — 그전에는 상세주소를
      //    주소에 합쳐 넣고(`fullOrigin`) 상호·담당자를 아예 안 남겨서, 견적에서 저장한
      //    배송지는 포털에서 불러와도 담당자 칸이 비어 있었다.
      //    🔴 `fullOrigin` 을 여기에 되돌리지 말 것 — 그 변수는 `quotes` 처럼 상세주소
      //    칸이 **없는** 표에 넣을 때 쓰는 것이다.
      if (saveOrigin && form.origin.trim())
        toSave.push({
          company_id: selectedCompany.id,
          company_name: form.origin_company_name.trim() || null,
          location_name: form.origin.trim(),
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
          company_id: selectedCompany.id,
          company_name: form.destination_company_name.trim() || null,
          location_name: form.destination.trim(),
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
      }
    }

    // 화주 발주요청에서 넘어온 경우, 요청 상태를 승인됨으로 갱신하고 이 견적과 연결
    if (fromRequestId && newQuote) {
      await supabase
        .from("portal_order_requests")
        .update({ status: "승인됨", quote_id: newQuote.id })
        .eq("id", fromRequestId);
      // 목록 맨 위의 「발주요청」 행이 바로 사라지도록 다시 조회한다
      loadPendingRequests();
    }

    // 공개 견적문의에서 전환해 넘어온 경우, 문의 상태를 연락완료로 갱신하고 이 견적과 연결
    if (fromQuoteRequestId && newQuote) {
      await supabase
        .from("public_quote_requests")
        .update({
          status: "연락완료",
          quote_id: newQuote.id,
          updated_by: staffId,
        })
        .eq("id", fromQuoteRequestId);
    }

    setSaving(false);
    setSelectedCompany(null);
    setCompanySearch("");
    setSaveOrigin(false);
    setSaveDestination(false);
    setForm({
      ...form,
      guest_name: "",
      guest_phone: "",
      guest_email: "",
      origin: "",
      originDetail: "",
      originSido: "",
      originSigungu: "",
      destination: "",
      destinationDetail: "",
      destinationSido: "",
      destinationSigungu: "",
      ...EMPTY_PICKUP_DROPOFF_CONTACT,
      distance_km: "",
      collection_method: "broker",
      billing_cycle: "per_order",
      direct_collection_point: null,
      loading_type: "exclusive",
      mixed_shipper_consent: false,
      mixed_discount_type: null,
      mixed_discount_amount: "",
      mixed_discount_percent: "",
      mixed_note: "",
      item: "",
      waitingMinutes: "",
      waypointCount: "",
      requested_pickup_at: "",
      requested_dropoff_at: "",
      notes: "",
    });
    setDistanceAutoCalculated(false);
    setAllowManualDistance(false);
    setUseManualFinalAmount(false);
    setFinalAmountOverride("");
    // 🔴 「지금」·「당착/내착」도 **건별이다** — 안 비우면 다음 견적의 상차 시각이 조용히
    //    접수 시각이 되고, 하차일시를 비운 건에 옛 도착구분 줄이 따라 붙는다
    //    (포털 발주 폼이 같은 이유로 같게 비운다).
    setPickupNow(false);
    setDropoffArrivalType(null);
    // 🔴 **저장에 성공했을 때만 접는다**(소수정 ③). 위의 실패 분기들은 전부 이 줄에
    //    닿기 전에 `return` 한다 — 실패했는데 접으면 방금 적은 것이 사라진 것처럼 보인다.
    //    접는 이유는 사용자 지시 그대로다: 저장하고 나면 **목록이 한눈에 들어와야 한다.**
    setDetailsOpen(false);
    loadQuotes(period);
  }

  async function handleDeleteQuote(id: string, quoteNo: string | null) {
    const confirmed = window.confirm(
      `견적 "${quoteNo}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;
    const res = await fetch("/api/admin/delete-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "quotes", id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "삭제에 실패했습니다.");
      return;
    }
    loadQuotes(period);
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">견적 관리</h1>
          <p className="page-desc">
            거리구간 × 톤수 기본운임에 가산기준을 조합해 자동 계산합니다.
            기존 화주 또는 개인/신규 고객 모두 견적 가능합니다. (부가세 별도)
          </p>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {!ratesLoading && tiers.length === 0 && (
        <div className="error-box">
          운임기준 데이터가 아직 없습니다. 먼저{" "}
          <Link href="/admin/rates" style={{ textDecoration: "underline" }}>
            운임기준표
          </Link>
          가 등록되어 있는지 확인해주세요.
        </div>
      )}

      <div
        className="quote-form-layout"
        style={{
          display: "grid",
          /* 🔴 계산 패널을 **고정 폭**으로 뺐다(리뷰 2라운드 — *"자동계산결과창은 폭이
             좀더 좁아도 된다"*). `0.8fr` 로 두면 화면이 넓어질수록 패널만 커지고 정작
             입력칸이 안 넓어진다 — 남는 폭이 전부 입력 쪽으로 가게 한다.
             🔴 `minmax(0, 1fr)` 의 `0` 을 빼지 말 것 — 그리드 칸의 기본 최소폭이
                `auto` 라 안쪽 긴 주소 문자열이 칸을 밀어 패널이 찌그러진다. */
          gridTemplateColumns: "minmax(0, 1fr) 340px",
          gap: 20,
          alignItems: "start",
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: 20 }}>
          {/* 🔴 `req-marks` 가 필수 표시의 스코프다(34차) — 이 클래스가 붙은 안에서만
              별표가 빨개지고 입력칸에 왼쪽 선이 붙는다. **다른 화면에 칠하지 말 것**
              (사용자 확정: 이번 범위는 견적관리 화면뿐). 공용 부품 `AddressSearch` 도
              같은 별표 부품을 쓰지만, 색은 이 스코프 밖에서 안 붙는다. */}
          {/* 🔴 `quote-form` 은 **이 폼 하나에만** 거는 스코프다 — 라벨·입력칸 모양을
              화주포털 발주요청에 맞추는 규칙이 여기 안에서만 돌게 하려고 둔 것이다.
              `.field` 를 전역으로 고치면 관리자 31개 화면이 같이 바뀐다. 지우지 말 것. */}
          <form className="req-marks quote-form" onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                className={customerMode === "company" ? "btn" : "btn btn-ghost"}
                style={{ fontSize: 12.5, padding: "7px 12px" }}
                onClick={() => setCustomerMode("company")}
              >
                기존 화주
              </button>
              <button
                type="button"
                className={customerMode === "guest" ? "btn" : "btn btn-ghost"}
                style={{ fontSize: 12.5, padding: "7px 12px" }}
                onClick={() => {
                  setCustomerMode("guest");
                  // 🔴 개인·신규 고객은 **고를 화주가 없다** — 여기서 안 펼치면
                  //    「기존 화주」 쪽에만 자동 펼침이 있는 셈이 되어 한쪽만 동작한다.
                  setDetailsOpen(true);
                }}
              >
                개인 / 신규 고객
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <CollectionMethodInput
                namePrefix="quote_new"
                /* 🔴 36차 — 화주 계약 청구주기와 다르면 「계약과 다름」이 뜬다.
                   막지 않고 알리기만 한다(화주 값은 제안이고 이 건의 값이 진실이다). */
                contractBillingCycle={
                  customerMode === "company" ? selectedCompany?.billing_cycle_default : null
                }
                value={{
                  collection_method: form.collection_method,
                  billing_cycle: form.billing_cycle,
                  direct_collection_point: form.direct_collection_point,
                }}
                onChange={(next) =>
                  setForm({
                    ...form,
                    collection_method: next.collection_method,
                    billing_cycle: next.billing_cycle,
                    direct_collection_point: next.direct_collection_point,
                  })
                }
              />
            </div>

            {customerMode === "company" ? (
              /* 🔴 입력창·목록·키보드 조작은 **`components/CompanySearchBox.tsx` 하나**다
                 (2026-09-22) — 운송오더에 같은 코드가 복사돼 있어서 한쪽만 고치면
                 담당자가 화면마다 다르게 동작하는 검색창을 쓰게 된다.
                 🔴 **고른 뒤에 할 일은 여기 남는다**(청구주기·출발지·펼침) — 그 로직을
                 부품으로 옮기지 말 것. 오더는 「지난 오더 불러오기」로 다르다.
                 🔴 `quote-form-half` — 이 칸은 `.form-grid` **밖**이라 폼 전체 폭
                 (1600px 화면에서 910px)을 먹고 있었다. 회사명은 길어야 스무 글자라
                 그만큼 필요 없다(실사용 지적). 2열 한 칸과 같은 폭으로 묶는다. */
              <CompanySearchBox
                wrapClassName="field quote-form-half"
                query={companySearch}
                onQueryChange={(v) => {
                  setSelectedCompany(null);
                  setCompanySearch(v);
                }}
                results={companyResults}
                selected={selectedCompany}
                showAddress
                onSelect={(c) => {
                  setSelectedCompany(c);
                  setCompanyResults([]);
                  // 🔴 소수정 ③ — 화주를 고르는 순간 아래를 펼친다(사용자 확정
                  //    *"회사명 입력시 자동으로 펼쳐져도 된다"*). 골랐다는 것은
                  //    이제 내용을 적겠다는 뜻이다.
                  setDetailsOpen(true);
                  // 🔴 36차 A장 — 계약 청구주기를 **기본값으로 복사**한다.
                  //   🔴 아직 손대지 않은 초기값(`per_order`)일 때만 갈아끼운다 —
                  //      35차 자동 기입의 「차량만 예외」와 같은 규칙이고,
                  //      담당자가 이미 고른 값을 조용히 덮으면 안 된다.
                  //   🔴 계약이 「미정」(null)이면 건드리지 않는다.
                  if (
                    c.billing_cycle_default === "monthly" &&
                    form.billing_cycle === "per_order"
                  ) {
                    setForm((prev) => ({ ...prev, billing_cycle: "monthly" }));
                  }
                  // 출발지가 비어있으면 화주의 등록 주소를 기본값으로 채워줍니다 (수정 가능)
                  if (c.address && !form.origin.trim()) {
                    setForm((prev) => ({ ...prev, origin: c.address || "" }));
                  }
                }}
              />
            ) : (
              <div className="form-grid quote-form-grid" style={{ padding: 0, marginBottom: 14 }}>
                {/* 🔴 필수는 **연락처**다(사용자 확정 2026-09-11) — 개인·신규 고객은
                    이름을 안 밝히는 경우가 흔하고, 나중에 다시 연락할 수 있어야 하는
                    쪽은 연락처다. 🔴 둘을 맞바꾼 것이니 되돌리지 말 것. */}
                <div className="field">
                  <label>고객명</label>
                  <input
                    value={form.guest_name}
                    onChange={(e) =>
                      setForm({ ...form, guest_name: e.target.value })
                    }
                  />
                </div>
                <div className="field field-required">
                  <label>연락처 <RequiredMark /></label>
                  <input
                    value={form.guest_phone}
                    onChange={(e) =>
                      setForm({ ...form, guest_phone: formatPhoneNumber(e.target.value) })
                    }
                  />
                </div>
              </div>
            )}

            {/* ── 펼침 손잡이 (2026-09-16 · 소수정 ③) ─────────────────────────
                🔴 **`<button type="button">` 이다** — `type` 을 빼면 폼 안의 기본값이
                `submit` 이라 누르는 순간 견적이 저장된다(원칙 34번과 같은 자리).
                🔴 **접혀 있을 때 「몇 가지를 더 적어야 하는지」를 말한다** — 손잡이만
                두면 「여기서 끝인가」로 읽힌다. */}
            <button
              type="button"
              className="quote-form-toggle"
              onClick={() => setDetailsOpen((v) => !v)}
              aria-expanded={detailsOpen}
            >
              {/* 🔴 **글자(`▸`·`▾`)가 아니라 SVG 다** — 실측에서 그 글리프가 폭 6px·
                  높이 14px 로 그려져 **손잡이인지 알아볼 수 없었다**(본문 서체에 맞는
                  모양이 없어 위쪽에 작게 붙는다). PR #129 의 `⋯` 가 네모로 나오던 것과
                  같은 자리다 — **글자로 되돌리지 말 것.** */}
              <svg
                className="quote-form-toggle-caret"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
                style={{ transform: detailsOpen ? "rotate(90deg)" : undefined }}
              >
                <path
                  d="M5 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <strong>{detailsOpen ? "상세 입력 접기" : "상세 입력 펼치기"}</strong>
              {!detailsOpen && (
                <span className="quote-form-toggle-hint">
                  구간 · 일정 · 화물 · 요청사항을 적고 저장합니다
                </span>
              )}
            </button>

            {detailsOpen && (
            <>
            <div className="form-grid quote-form-grid" style={{ padding: 0 }}>
              {/* ── 블록 번호 배지 색 ────────────────────────────────────────────────
                  🔴 **`var(--brand-yellow)`(#ffd833) 다 — 리터럴로 다시 적지 말 것**
                  (34차 계산창 손잡이와 같은 규칙). 43차는 관리자 전체 강조색인
                  `var(--accent)`(파랑)로 뒀는데, 사용자가 *"배지 색도 화주포털처럼
                  옐로우로 바꿔줘"* 로 확정했다(2026-09-11). 화주포털 `.pv2-step-num`
                  과 **같은 값**이라 두 폼이 나란히 같은 색이 된다.
                  🔴 **`var(--pv2-yellow)` 를 쓰지 말 것** — 그 토큰은 `.portal-v2`
                  스코프 안에만 있어서 관리자 화면에서는 **아무 색도 안 나온다.**
                  🔴 글자색 `#1a1a1a` 는 포털 `--pv2-text` 와 같은 값이다 —
                  옐로 위에 `--text-muted` 계열을 올리지 말 것(대비 부족). */}
              {/* ── 1. 운송 구간 · 현장 정보 ──────────────────────────────────────────── */}
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, margin: "6px 0 4px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--brand-yellow)", color: "#1a1a1a", fontSize: 13.5, fontWeight: 700, flexShrink: 0 }}>
                  1
                </span>
                <strong style={{ fontSize: 16.5 }}>운송 구간 · 현장 정보</strong>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>화주포털 발주요청과 같은 순서입니다</span>
              </div>
              {/* ── 출발지 열 / 도착지 열 (34차 리뷰 2라운드) ──────────────────────
                  사용자 지시: *"견적관리에서 정보창 레이아웃을 화주포탈 발주요청과 거의
                  유사하게 구성해줘."* 화주포털 발주요청이 **좌우 두 열**이고, 한 열에
                  「주소 → 현장 상호·담당자명 → 담당자 연락처 → 주소록 저장」이 세로로
                  들어간다. 그 배치를 관리자 쪽 부품으로 그대로 옮긴 것이다.
                  🔴 **포털 부품(`Pv2AddressField`·`Pv2Select`·`.pv2-*`)은 하나도 안 가져왔다** —
                     `.portal-v2` 스코프 전용이라 관리자 31화면이 그 CSS 를 끌어온다.
                     34차 본작업의 「맞춘 것은 배치이지 부품이 아니다」가 그대로 유효하다.
                  🔴 **저장된 주소는 포털처럼 드롭다운이 아니라 칩(badge)이다** — 관리자
                     쪽 기존 방식이고, 드롭다운으로 바꾸면 포털 부품을 끌어와야 한다.
                  ⚠️ 34차 본작업이 *"완전히 갈리지는 않는다 — 범위 밖"* 으로 남겨둔 항목이
                     이번 지시로 범위 안에 들어온 것이다. */}
              {/* 출발지 열 — 🔴 **주소와 그 현장 담당자가 같은 열에 있어야 한다.**
                  전에는 주소 둘이 위에 나란히, 담당자 여섯 칸이 아래에 따로 있어서
                  「이 담당자가 상차인가 하차인가」를 라벨로만 알 수 있었다. */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: "#2563EB",
                      flexShrink: 0,
                    }}
                  />
                  <strong style={{ fontSize: 13 }}>출발지</strong>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>상차지 정보</span>
                </div>
              <AddressSearch
                label="출발지"
                required
                value={form.origin}
                detailValue={form.originDetail}
                placeholder="도로명주소 검색 또는 직접 입력"
                detailPlaceholder="상세주소 (동/층/호수, 창고 위치 등)"
                onChange={(addr, sido, sigungu) =>
                  setForm((prev) => ({ ...prev, origin: addr, originSido: sido, originSigungu: sigungu }))
                }
                onDetailChange={(v) => setForm((prev) => ({ ...prev, originDetail: v }))}
              >
                {savedLocations.filter((l) => l.location_type !== "하차지")
                  .length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    {savedLocations
                      .filter((l) => l.location_type !== "하차지")
                      .map((l) => (
                        <span
                          key={l.id}
                          className="badge"
                          style={{ cursor: "pointer" }}
                          onClick={() => applySavedLocation("origin", l)}
                          title={[l.address, l.address_detail].filter(Boolean).join(" ")}
                        >
                          {savedLocLabel(l)}
                        </span>
                      ))}
                  </div>
                )}
              </AddressSearch>
                <PickupDropoffContactFields
                  value={form}
                  onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                  only="pickup"
                />
              {customerMode === "company" && selectedCompany && (
                <label
                  htmlFor="saveOrigin"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    id="saveOrigin"
                    type="checkbox"
                    checked={saveOrigin}
                    onChange={(e) => setSaveOrigin(e.target.checked)}
                    style={{ margin: 0, flexShrink: 0 }}
                  />
                  이 출발지를 화주 주소록에 저장
                </label>
              )}
              </div>

              {/* 도착지 열 — 🔴 **주소와 그 현장 담당자가 같은 열에 있어야 한다.**
                  전에는 주소 둘이 위에 나란히, 담당자 여섯 칸이 아래에 따로 있어서
                  「이 담당자가 상차인가 하차인가」를 라벨로만 알 수 있었다. */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: "#DC2626",
                      flexShrink: 0,
                    }}
                  />
                  <strong style={{ fontSize: 13 }}>도착지</strong>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>하차지 정보</span>
                </div>
<AddressSearch
                label="도착지"
                required
                value={form.destination}
                detailValue={form.destinationDetail}
                placeholder="도로명주소 검색 또는 직접 입력"
                detailPlaceholder="상세주소 (동/층/호수, 하차장 위치 등)"
                onChange={(addr, sido, sigungu) =>
                  setForm((prev) => ({
                    ...prev,
                    destination: addr,
                    destinationSido: sido,
                    destinationSigungu: sigungu,
                  }))
                }
                onDetailChange={(v) => setForm((prev) => ({ ...prev, destinationDetail: v }))}
              >
                {savedLocations.filter((l) => l.location_type === "하차지")
                  .length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    {savedLocations
                      .filter((l) => l.location_type === "하차지")
                      .map((l) => (
                        <span
                          key={l.id}
                          className="badge"
                          style={{ cursor: "pointer" }}
                          onClick={() => applySavedLocation("destination", l)}
                          title={[l.address, l.address_detail].filter(Boolean).join(" ")}
                        >
                          {savedLocLabel(l)}
                        </span>
                      ))}
                  </div>
                )}
              </AddressSearch>
                <PickupDropoffContactFields
                  value={form}
                  onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                  only="dropoff"
                />
              {customerMode === "company" && selectedCompany && (
                <label
                  htmlFor="saveDestination"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    id="saveDestination"
                    type="checkbox"
                    checked={saveDestination}
                    onChange={(e) => setSaveDestination(e.target.checked)}
                    style={{ margin: 0, flexShrink: 0 }}
                  />
                  이 도착지를 화주 주소록에 저장
                </label>
              )}
              </div>

              {/* 🔴 전체 폭(1600px 화면에서 836px)을 먹던 것을 **2열 한 칸**으로 되돌린다
                  (실사용 지적). 숫자 한 개 + 「자동계산」 버튼뿐이라 그만큼 필요 없었다.
                  🔴 `gridColumn: "1 / -1"` 을 되살리지 말 것. */}
              <div className="field field-required">
                <label>거리(km) <RequiredMark /></label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="number"
                    value={form.distance_km}
                    onChange={(e) => {
                      setForm({ ...form, distance_km: e.target.value });
                      setDistanceAutoCalculated(false);
                    }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{
                      padding: "0 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                    onClick={handleAutoDistance}
                    disabled={calculatingDistance}
                  >
                    {calculatingDistance ? "계산 중..." : "자동계산"}
                  </button>
                </div>
                {form.distance_km && !distanceAutoCalculated && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 6,
                      fontSize: 11.5,
                      color: "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allowManualDistance}
                      onChange={(e) => setAllowManualDistance(e.target.checked)}
                      style={{ margin: 0, width: "auto" }}
                    />
                    자동계산 없이 직접 입력한 거리를 사용합니다
                  </label>
                )}
              </div>

              {/* ── 2. 일정 ──────────────────────────────────────────── */}
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, margin: "6px 0 4px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--brand-yellow)", color: "#1a1a1a", fontSize: 13.5, fontWeight: 700, flexShrink: 0 }}>
                  2
                </span>
                <strong style={{ fontSize: 16.5 }}>일정</strong>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}></span>
              </div>
              {/* 🔴 **상차·하차를 좌우로 놓는다**(리뷰 2라운드 — 포털 발주요청과 같은 배치).
                  전에는 둘 다 `gridColumn: "1 / -1"` 이라 위아래로 길게 늘어져서,
                  「상차 다음이 하차」라는 짝이 한눈에 안 보이고 폼만 세로로 길어졌다.
                  🔴 `gridColumn` 을 다시 붙이지 말 것. */}
              <div>
                {/* 🔴 **안내 문구를 고쳤다** — 「현재 시각 이후로만 선택 가능합니다」라고
                    적고 있었지만 **하한이 걸려 있지 않았다.** 35차가 *"지나간 날짜도 고를
                    수 있어야 한다"*로 확정했기 때문이다(끝난 운송을 뒤늦게 입력하는 일이
                    있다). 문구만 동작과 어긋나 있던 자리이고, 바로 옆에 「지금」 칩이
                    생기면서 더 헷갈리게 돼 같이 고쳤다.
                    🔴 **하한을 새로 걸지 말 것** — 문구를 근거로 `minDateTime` 을 붙이면
                       그 확정이 뒤집힌다. */}
                <DateTimePicker
                  defaultTimeMode="now"
                  label="희망 상차 일시"
                  value={form.requested_pickup_at}
                  onChange={(v) => setForm({ ...form, requested_pickup_at: v })}
                  minDateTimeLabel="지난 날짜도 고를 수 있습니다 (완료된 운송 입력)"
                  nowChip
                  nowSelected={pickupNow}
                  onNowChange={setPickupNow}
                />
                {/* 🔴 「지금」이면 시각 칸이 **비어 보인다** — 시간 드롭다운이 30분 단위라
                    현재 시각(예: 11:17)이 선택지에 없기 때문이다. 하차의 당착 배지와
                    같은 이유·같은 자리에 이유를 적는다. **칸을 비운 채로 두는 것이 맞고**,
                    실제로 저장되는 값은 **제출하는 순간의 시각**이다.
                    🔴 이 안내를 지우면 담당자가 빈 시각을 임의로 채운다(28차가 하차에서
                       겪은 것과 같은 사고다). */}
                {pickupNow && (
                  <div style={{ marginTop: 6 }}>
                    <span className="badge">지금 상차 · 접수 시각</span>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                      견적을 등록하는 순간의 시각으로 저장됩니다
                    </div>
                  </div>
                )}
              </div>
              <div>
                <DateTimePicker
                  defaultTimeMode="now"
                  label="희망 하차 일시"
                  value={form.requested_dropoff_at}
                  onChange={(v) => setForm({ ...form, requested_dropoff_at: v })}
                  /* 🔴 당착·내착이면 +30분 하한을 걸지 않는다 — 시각이 무관한 선택지라
                     23:40 상차 건의 당착이 하한에 걸려 접수가 막힌다(27차 예외). */
                  minDateTime={dropoffArrivalType ? undefined : minDropoffDateTime}
                  minDateTimeLabel={dropoffArrivalType ? undefined : minDropoffLabel}
                  arrivalChips
                  arrivalValue={dropoffArrivalType as any}
                  onArrivalChange={(v) => setDropoffArrivalType(v)}
                  pickupDate={(form.requested_pickup_at || "").split("T")[0] || undefined}
                />
                {/* 🔴 화주가 「당착/내착」을 고른 건은 **시각이 무관하다.** 저장된 23:59 는
                    자리 채움인데 시간 드롭다운이 30분 단위라 선택지에 없어서, 프리필에서
                    **날짜만 채워지고 시각이 빈 값으로 떨어진다**(28차 §3 실측).
                    🔴 그 빈 시각을 담당자가 임의로 채우면 배차가 틀어진다 — 그래서 이유를
                       여기에 적는다. **시각 칸은 비운 채로 두는 것이 맞다.**
                    🔴 표기는 화주요청 목록과 같은 말을 쓴다(`lib/arrivalType.ts`). */}
                {arrivalTypeLabel(dropoffArrivalType) && (
                  <div style={{ marginTop: 6 }}>
                    <span className="badge">
                      {arrivalTypeLabel(dropoffArrivalType)} · {ARRIVAL_TIME_FREE_NOTE}
                    </span>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                      {arrivalTypeHint(dropoffArrivalType)}
                    </div>
                  </div>
                )}
              </div>
              <div className="field">
                <label>운송시간</label>
                <select
                  value={form.운송시간}
                  onChange={(e) => setForm({ ...form, 운송시간: e.target.value })}
                >
                  {surcharges
                    .filter((s) => s.category === "운송시간")
                    .map((o) => (
                      <option key={o.option_name} value={o.option_name}>
                        {o.option_name}
                      </option>
                    ))}
                </select>
                {form.requested_pickup_at && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>
                    희망 상차 일시 기준으로 자동 선택됨 — 필요 시 직접 변경 가능
                  </p>
                )}
              </div>

              {/* ── 3. 화물 · 차량 ──────────────────────────────────────────── */}
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, margin: "6px 0 4px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--brand-yellow)", color: "#1a1a1a", fontSize: 13.5, fontWeight: 700, flexShrink: 0 }}>
                  3
                </span>
                <strong style={{ fontSize: 16.5 }}>화물 · 차량</strong>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}></span>
              </div>
              <div className="field field-required">
                <label>톤수 <RequiredMark /></label>
                <select
                  value={form.vehicle_type}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_type: e.target.value })
                  }
                >
                  {VEHICLE_TYPES_ALL.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>차량형태</label>
                {/* 🔴 **설명 정의처는 `lib/vehicleBodyTypes.ts` 하나다**(2026-09-22 ·
                    사용자 요청 *"차량 형태 선택시 차종의 간단한 정보가 … 커서를 올렸을
                    때 보여지면 좋겠다"*). 화면에 문구를 다시 적지 말 것.
                    🔴 **두 겹으로 보여준다** — `title` 은 펼친 목록에서 커서를 올렸을 때
                    뜨는 **브라우저 기본 풍선말**이고, 아래 줄은 **지금 고른 차종**의
                    설명이다. ⚠️ 풍선말은 브라우저·OS 가 그리는 것이라 안 뜨는 환경이
                    있어서, 그것 하나에만 기대면 **정보가 통째로 안 보일 수 있다.**
                    🔴 그래서 아래 줄을 지우지 말 것.
                    🔴 **네이티브 `select` 를 커스텀 부품으로 바꾸지 말 것** — 원칙 57번은
                    포털 한정이고 관리자 화면은 네이티브를 그대로 쓴다. */}
                <select
                  value={form.차량형태}
                  onChange={(e) => setForm({ ...form, 차량형태: e.target.value })}
                >
                  {orderBodyTypes(
                    surcharges.filter((s) => s.category === "차량형태").map((s) => s.option_name)
                  ).map((name) => (
                    <option key={name} value={name} title={bodyTypeInfo(name) || undefined}>
                      {name}
                    </option>
                  ))}
                </select>
                {/* 🔴 모르는 차종이면 아무것도 안 그린다(`bodyTypeInfo` 가 빈 문자열) —
                    담당자가 `/admin/rates` 에서 넣은 새 옵션이 그 경우다. */}
                {bodyTypeInfo(form.차량형태) && (
                  <p className="quote-bodytype-info">{bodyTypeInfo(form.차량형태)}</p>
                )}
              </div>
              <div className="field">
                <label>물품특성</label>
                <select
                  value={form.물품특성}
                  onChange={(e) => setForm({ ...form, 물품특성: e.target.value })}
                >
                  {surcharges
                    .filter((s) => s.category === "물품특성")
                    .map((o) => (
                      <option key={o.option_name} value={o.option_name}>
                        {o.option_name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="field">
                <label>왕복/편도</label>
                <select
                  value={form["왕복/편도"]}
                  onChange={(e) => setForm({ ...form, "왕복/편도": e.target.value })}
                >
                  {surcharges
                    .filter((s) => s.category === "왕복/편도")
                    .map((o) => (
                      <option key={o.option_name} value={o.option_name}>
                        {o.option_name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="field">
                <label>상차조건</label>
                <select
                  value={form.상차조건}
                  onChange={(e) => setForm({ ...form, 상차조건: e.target.value })}
                >
                  {LOADING_METHOD_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>하차조건</label>
                <select
                  value={form.하차조건}
                  onChange={(e) => setForm({ ...form, 하차조건: e.target.value })}
                >
                  {LOADING_METHOD_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>대기시간(분)</label>
                <input
                  type="number"
                  value={form.waitingMinutes}
                  onChange={(e) =>
                    setForm({ ...form, waitingMinutes: e.target.value })
                  }
                  placeholder="무료 20분 초과분만 가산"
                />
              </div>
              <div className="field">
                <label>경유지 수</label>
                <input
                  type="number"
                  value={form.waypointCount}
                  onChange={(e) =>
                    setForm({ ...form, waypointCount: e.target.value })
                  }
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>적재구분</label>
                <div style={{ display: "flex", flexWrap: "nowrap", gap: 16, fontSize: 13 }}>
                  <label
                    style={{
                      display: "flex",
                      flexShrink: 0,
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <input
                      type="radio"
                      name="loading_type"
                      style={CHECKBOX_STYLE}
                      checked={form.loading_type === "exclusive"}
                      onChange={() => setForm({ ...form, loading_type: "exclusive" })}
                    />
                    독차
                  </label>
                  <label
                    style={{
                      display: "flex",
                      flexShrink: 0,
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <input
                      type="radio"
                      name="loading_type"
                      style={CHECKBOX_STYLE}
                      checked={form.loading_type === "mixable"}
                      onChange={() => setForm({ ...form, loading_type: "mixable" })}
                    />
                    혼적가능
                  </label>
                </div>

                {form.loading_type === "mixable" && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 12,
                      background: "var(--bg)",
                      borderRadius: 8,
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        flexWrap: "nowrap",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        marginBottom: 10,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <input
                        type="checkbox"
                        style={CHECKBOX_STYLE}
                        checked={form.mixed_shipper_consent}
                        onChange={(e) =>
                          setForm({ ...form, mixed_shipper_consent: e.target.checked })
                        }
                      />
                      화주 동의 확인됨
                    </label>

                    <div style={{ display: "flex", flexWrap: "nowrap", gap: 16, fontSize: 13, marginBottom: 10 }}>
                      <label
                        style={{
                          display: "flex",
                          flexShrink: 0,
                          alignItems: "center",
                          gap: 6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <input
                          type="radio"
                          name="mixed_discount_type"
                          style={CHECKBOX_STYLE}
                          checked={form.mixed_discount_type === "percent"}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              mixed_discount_type: "percent",
                              mixed_discount_percent:
                                f.mixed_discount_percent ||
                                (mixedDiscountTier
                                  ? String(mixedDiscountTier.standard_discount_percent)
                                  : ""),
                            }))
                          }
                        />
                        할인율(%)
                      </label>
                      <label
                        style={{
                          display: "flex",
                          flexShrink: 0,
                          alignItems: "center",
                          gap: 6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <input
                          type="radio"
                          name="mixed_discount_type"
                          style={CHECKBOX_STYLE}
                          checked={form.mixed_discount_type === "amount"}
                          onChange={() => setForm({ ...form, mixed_discount_type: "amount" })}
                        />
                        할인금액(원)
                      </label>
                    </div>

                    {form.mixed_discount_type === "percent" && (
                      <div className="field" style={{ maxWidth: 240, marginBottom: 10 }}>
                        <label>혼적 할인율(%)</label>
                        <input
                          type="number"
                          step={0.1}
                          value={form.mixed_discount_percent}
                          onChange={(e) =>
                            setForm({ ...form, mixed_discount_percent: e.target.value })
                          }
                        />
                        <MixedDiscountStandardHint
                          tier={mixedDiscountTier}
                          currentValue={form.mixed_discount_percent}
                        />
                      </div>
                    )}
                    {form.mixed_discount_type === "amount" && (
                      <div className="field" style={{ maxWidth: 200, marginBottom: 10 }}>
                        <label>혼적 할인금액(원)</label>
                        <MoneyInput
                          value={form.mixed_discount_amount}
                          onChange={(v) => setForm({ ...form, mixed_discount_amount: v })}
                        />
                      </div>
                    )}

                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>혼적 주의사항</label>
                      <textarea
                        rows={2}
                        value={form.mixed_note}
                        onChange={(e) => setForm({ ...form, mixed_note: e.target.value })}
                        placeholder="예: 파손주의 화물 별도 적재, 냉동/냉장 화물과 혼적 불가, 위험물 동승 불가 등"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 🔴 품목은 **필수다**(사용자 지시 2026-09-15). 무엇을 싣는지 모르면
                  차량·상하차 방법을 정할 수 없고, 견적서에도 빈칸으로 나간다.
                  🔴 `field-required` 와 `RequiredMark` 와 제출 직전 검사는 **한 벌이다** —
                  표시만 하고 검사를 안 걸면 그냥 통과한다(34차 필수 강조와 같은 규칙). */}
              <div className="field field-required" style={{ gridColumn: "1 / -1" }}>
                <label>품목 <RequiredMark /></label>
                <input
                  value={form.item}
                  onChange={(e) => setForm({ ...form, item: e.target.value })}
                  placeholder="운송할 물품을 입력하세요"
                />
              </div>

              {/* ── 4. 요청사항 ──────────────────────────────────────────── */}
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, margin: "6px 0 4px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--brand-yellow)", color: "#1a1a1a", fontSize: 13.5, fontWeight: 700, flexShrink: 0 }}>
                  4
                </span>
                <strong style={{ fontSize: 16.5 }}>요청사항</strong>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}></span>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>특이사항</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="상하차 조건 관련 참고사항 등"
                />
              </div>
            </div>

            {error && <div className="error-box">{error}</div>}
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "저장 중..." : "견적 저장"}
            </button>
            </>
            )}
          </form>
        </div>

        {/* 오른쪽 칸 — 계산 결과 + 전화응대 매뉴얼 */}
        {/* 🔴 **스크롤을 따라다니는 것은 이 감싸개다**(2026-09-18). 전에는 계산 카드
            자신이 `position: sticky` 였는데, 그 아래에 매뉴얼 창이 하나 더 생기면서
            **둘을 각각 sticky 로 두면 서로 겹친다** — 둘을 함께 묶어 통째로 따라가게
            바꿨다. 🔴 계산 카드에 `position: sticky` 를 되살리지 말 것.
            🔴 `alignSelf: "start"` 를 빼지 말 것 — 그리드 칸은 행 높이만큼 늘어나는데
               감싸개까지 같이 늘어나면 sticky 가 움직일 자리가 없어져 **따라다니기가
               조용히 멈춘다.**
            🔴 `top` 에 **상단바 높이를 더한다** — PR #150 이 상단바를 `sticky` 로 만든
               뒤로 `top: 20` 이면 데스크탑에서 **59px 이 헤더 뒤로 들어간다**(36차 PR 2
               리뷰 2라운드 신고). 숫자를 여기 적지 말 것 — 정의처는
               `--admin-topnav-h`(globals.css)다.
            🔴 높이 상한 + 안쪽 스크롤은 `.quote-side`(globals.css)에 있다 — 매뉴얼이
               길어지면 화면보다 커져서 아래쪽이 영영 안 보이게 된다. */}
        <div
          className="quote-side"
          style={{
            position: "sticky",
            top: "calc(var(--admin-topnav-h, 79px) + 20px)",
            alignSelf: "start",
          }}
        >
        {/* 실시간 계산 결과 */}
        {/* 🔴 **모바일에서는 끌어 옮길 수 있는 떠 있는 창**이 된다(리뷰 3라운드 —
            *"모바일에서 「자동계산결과」창은 팝업으로 기본 아래에 배치되는데 끌어다
            자유롭게 위치조정을 할수 있게"*).
            🔴 **데스크탑에서 계산 카드를 따로 감싸지 말 것** — `DraggablePanel` 이
               모바일이 아니면 children 을 그대로 돌려준다. 위 `.quote-side` 말고 겹을
               하나 더 끼우면 sticky 의 기준이 또 바뀐다. */}
        <DraggablePanel title="자동 계산 결과">
        <div
          className="card"
          style={{ padding: 20 }}
        >
          <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
            자동 계산 결과
          </h3>
          {!calc ? (
            /* 톤수는 기본값이 있는 select라 비어 있을 수 없고, 거리가 비면 0으로
               읽혀 첫 구간에 걸린다. 즉 calc가 null이라는 것은 "아직 안 입력했다"가
               아니라 선택한 톤수의 운임기준 행이 없다는 뜻이다(로딩 중 제외).
               그 원인이 화면에 드러나게 문구를 가른다. */
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {ratesLoading
                ? "운임기준을 불러오는 중입니다."
                : "선택하신 톤수에 해당하는 운임기준이 없습니다. 운임기준표를 확인해주세요."}
            </p>
          ) : (
            <div style={{ fontSize: 13.5 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  기본운임 ({form.vehicle_type})
                </span>
                <span className="num">{won(calc.base)}</span>
              </div>
              {calc.breakdown.map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 12.5,
                    color: "var(--text-muted)",
                  }}
                >
                  <span>{b.amount < 0 ? "-" : "+"} {b.label}</span>
                  <span className="num">{won(Math.abs(b.amount))}</span>
                </div>
              ))}
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  marginTop: 10,
                  paddingTop: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                <span>최종 견적금액</span>
                <span className="num">
                  {won(useManualFinalAmount && finalAmountOverride ? Number(finalAmountOverride) : calc.final)}
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6, marginBottom: 0 }}>
                부가세 별도
                {(() => {
                  const shown = useManualFinalAmount && finalAmountOverride ? Number(finalAmountOverride) : calc.final;
                  const inclusive = wonVatIncluded(shown);
                  return inclusive ? <> (부가세 포함 {inclusive})</> : null;
                })()}
                {useManualFinalAmount && finalAmountOverride && (
                  <> · 자동계산값 {won(calc.final)}에서 직접 수정됨</>
                )}
              </p>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "1px dashed var(--border)",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={useManualFinalAmount}
                  onChange={(e) => setUseManualFinalAmount(e.target.checked)}
                  style={{ width: "auto", margin: 0 }}
                />
                최종금액 직접 입력
              </label>
              {useManualFinalAmount && (
                <input
                  type="number"
                  value={finalAmountOverride}
                  onChange={(e) => setFinalAmountOverride(e.target.value)}
                  placeholder="직접 입력할 최종금액"
                  style={{ marginTop: 6 }}
                />
              )}
            </div>
          )}
        </div>
        </DraggablePanel>

        {/* 🔴 **모바일에는 안 나온다**(사용자 지시 — *"모바일버전은 생략"*).
            감추는 일은 CSS 가 한다(`.call-script-panel`, ≤700px) — 화면 폭을 JS 로
            재서 가르면 첫 그림에서 잘못된 쪽이 한 번 번쩍인다. */}
        <CallScriptPanel />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>견적 목록</h2>
        <DateRangeFilter
          value={period}
          onChange={setPeriod}
          custom={customRange}
          onCustomChange={setCustomRange}
        />
      </div>

      {quotes.length >= (period === "all" ? ALL_PERIOD_LIMIT : FILTERED_PERIOD_LIMIT) && (
        <div className="error-box" style={{ marginBottom: 12 }}>
          최근 {period === "all" ? ALL_PERIOD_LIMIT : FILTERED_PERIOD_LIMIT}건만 표시
          중입니다. 더 오래된 데이터를 보려면 기간 필터를 좁혀서 확인해주세요.
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        {/* 🔴 조회 실패를 빈 목록으로 두지 않는다 — 「새 요청이 없다」로 읽힌다 */}
        {requestsError && (
          <div className="error-box" style={{ margin: "0 0 12px" }}>
            발주요청을 불러오지 못했습니다: {requestsError}
          </div>
        )}
        {needOrderError && (
          <div className="error-box" style={{ margin: "0 0 12px" }}>
            「운송오더 생성 필요」 표시를 불러오지 못했습니다: {needOrderError}
          </div>
        )}
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : quotes.length === 0 && pendingRequests.length === 0 ? (
          <div className="empty-state">
            {period === "all"
              ? "아직 생성된 견적이 없습니다."
              : "선택한 기간에 생성된 견적이 없습니다."}
          </div>
        ) : (
          <>
          {/* 🔴 데스크탑 표는 `desktop-only`, 모바일은 카드(원칙 13번 · 리뷰 3라운드).
              실측 390px 에서 이 표가 **880px** 이라 358px 칸 안에서 옆으로 굴러다녔다. */}
          <div className="desktop-only">
          <table style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th>견적번호</th>
                <th>고객</th>
                <th>구간</th>
                <th>톤수</th>
                <th>금액</th>
                <th>상태</th>
                <th>일시</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {/* 🔴 **맨 위 고정**(사용자 확정) — 날짜순으로 섞지 않는다. 처리해야 할
                  일이라 오래된 건이 아래로 묻히면 안 되고, 기간 필터·정렬이 견적
                  행에만 걸려 기존 동작이 그대로 남는다.
                  🔴 **누르면 기존 프리필 경로를 그대로 탄다**(`?from_request=`) — 그
                  경로가 저장 시 `status:"승인됨" + quote_id` 를 쓰므로 **같은 요청으로
                  견적이 두 번 만들어지지 않는다.** 새 경로를 만들지 말 것. */}
              {pendingRequests.map((r) => (
                <tr
                  key={`req-${r.id}`}
                  onClick={() => router.push(`/admin/quotes?from_request=${r.id}`)}
                  style={{ cursor: "pointer", background: "var(--admin-row-attention)" }}
                >
                  <td className="cell-nowrap">
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 7px",
                        borderRadius: 4,
                        fontSize: 10.5,
                        fontWeight: 700,
                        background: "#FDE68A",
                        color: "#92400E",
                        whiteSpace: "nowrap",
                      }}
                    >
                      발주요청
                    </span>
                  </td>
                  <td className="cell-nowrap" style={{ minWidth: 110 }}>
                    <RecurringContractBadge company={r.companies} small block />
                    {r.companies?.name || "-"}
                  </td>
                  <td>
                    <div>{r.origin || "-"} →</div>
                    <div>{r.destination || "-"}</div>
                  </td>
                  <td className="cell-nowrap">{r.vehicle_type || "-"}</td>
                  <td className="cell-nowrap" style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                    견적 전
                  </td>
                  <td className="cell-nowrap">
                    {/* 🔴 견적 행과 **같은 모양**이어야 한다 — 한쪽만 캡이면 같은 칸에
                        두 종류의 글씨가 섞여 상태를 훑는 눈이 걸린다. 색은 「확인중」과
                        같은 계열이다(둘 다 「담당자가 지금 할 일」이고, 무엇인지는 왼쪽
                        「발주요청」 배지가 말한다). */}
                    <span className="status-cap" style={{ background: "#FEF3C7", color: "#92400E" }}>
                      대기중
                    </span>
                  </td>
                  <td className="cell-nowrap" style={{ fontSize: 12.5 }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("ko-KR") : "-"}
                  </td>
                  <td className="cell-nowrap">
                    <span style={{ fontSize: 12, color: "var(--accent-strong, var(--text))" }}>견적 작성 →</span>
                  </td>
                </tr>
              ))}
              {quotes.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => router.push(`/admin/quotes/${q.id}`)}
                  /* 🔴 **판정은 DB 값 `상담중` 이다 — `"확인중"` 과 비교하지 말 것.**
                     「확인중」은 화면에 찍는 글자일 뿐이고 `quotes.status` 의 CHECK 는
                     여전히 `상담중` 이다(`lib/quoteStatusLabels.ts` 머리말).
                     🔴 색은 발주요청 고정 행과 **같은 토큰**이다 — 둘 다 「담당자가
                     지금 손대야 하는 줄」이고, 무엇인지는 「발주요청」 배지와 상태 캡이
                     말한다. 새 색을 만들어 갈라놓지 말 것. */
                  style={{
                    cursor: "pointer",
                    background: q.status === "상담중" ? "var(--admin-row-attention)" : undefined,
                  }}
                >
                  <td className="cell-nowrap">
                    <span className="num">{q.quote_no}</span>
                  </td>
                  <td className="cell-nowrap" style={{ minWidth: 110 }}>
                    <RecurringContractBadge company={q.companies} small block />
                    {q.companies?.name || q.guest_name || "-"}
                    {!q.companies?.name && q.guest_name && (
                      <span className="badge" style={{ marginLeft: 6 }}>
                        개인
                      </span>
                    )}
                  </td>
                  <td>
                    <div>{q.origin || "-"} →</div>
                    <div>{q.destination || "-"}</div>
                  </td>
                  <td className="cell-nowrap">{q.vehicle_type || "-"}</td>
                  <td className="cell-nowrap">
                    <span className="num">
                      {q.final_amount ? won(q.final_amount) : "-"}
                    </span>
                    {wonVatIncluded(q.final_amount) && (
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                        (부가세 포함 {wonVatIncluded(q.final_amount)})
                      </div>
                    )}
                  </td>
                  <td className="cell-nowrap">
                    {/* 🔴 컬러 캡 — 색은 `quoteStatusAdminStyle()` 이 정한다(화주용
                        `quoteStatusStyle()` 과 **말도 색도 다르다**). 여기에 색을 적지 말 것. */}
                    <div>
                      <span
                        className="status-cap"
                        style={{
                          background: quoteStatusAdminStyle(q.status).bg,
                          color: quoteStatusAdminStyle(q.status).color,
                        }}
                      >
                        {quoteStatusAdminStyle(q.status).label}
                      </span>
                    </div>
                    {/* 🔴 **`TopNav` 「견적 관리」 배지가 세는 바로 그 건이다**(34차 리뷰
                        1라운드). 배지는 숫자만 말하고 어느 건인지 볼 화면이 없어서
                        「알림이 계속 남아 있다」가 됐다 — 규칙은
                        `lib/unlinkedWonQuotes.ts` 한 곳이고 여기서 다시 적지 말 것. */}
                    {needOrderIds.has(q.id) && (
                      <div
                        style={{
                          display: "inline-block",
                          marginTop: 3,
                          padding: "2px 7px",
                          borderRadius: 4,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: "#FDE68A",
                          color: "#92400E",
                        }}
                      >
                        운송오더 생성 필요
                      </div>
                    )}
                    {/* 🔴 화주가 포털에서 직접 승인한 건임을 표시한다. 없으면 담당자가
                        손으로 바꾼 것이다 — 27차까지는 둘이 구분되지 않았다(28차 §5-1). */}
                    {formatCustomerApprovedAt(q.approved_by_customer_at) && (
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                        {CUSTOMER_APPROVED_LABEL}{" "}
                        <span className="num">
                          {formatCustomerApprovedAt(q.approved_by_customer_at)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="cell-nowrap">
                    <span className="num">
                      {new Date(q.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </td>
                  <td className="cell-nowrap" onClick={(e) => e.stopPropagation()}>
                    {/* 🔴 **기존 프리필 경로(`?from_quote=`)를 그대로 탄다** — 그 경로가
                        저장 시 `quote_id` 를 채우므로 오더를 만들면 배지가 저절로
                        사라진다. 새 경로를 만들지 말 것(34차 ⑥ 과 같은 이유).
                        ⚠️ 이미 오더를 만들었는데 배지가 남아 있다면 그 오더의
                        `quote_id` 가 빈 것이다 — 그때는 여기서 또 만들지 말고
                        **오더 상세의 「견적 연결」**로 이을 것. */}
                    {needOrderIds.has(q.id) && (
                      <button
                        className="btn"
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          cursor: "pointer",
                          marginRight: isAdmin ? 6 : 0,
                        }}
                        onClick={() => router.push(`/admin/orders?from_quote=${q.id}`)}
                      >
                        + 운송오더
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        className="btn-danger"
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                        onClick={() => handleDeleteQuote(q.id, q.quote_no)}
                      >
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* 모바일 카드 — 🔴 **뺀 것은 「삭제」 버튼 하나다.** 목록에서 손가락으로 지우는
              것은 오조작이 잦아 상세에서만 지운다(관리자 권한 체크는 그대로다).
              🔴 **대기 중 발주요청은 여기서도 맨 위 고정이다** — 데스크탑과 순서가 달라지면
              「모바일에서는 안 보인다」가 된다. */}
          <div className="mobile-only">
            <AdminMobileList
              rows={[
                ...pendingRequests.map((r) => ({
                  key: `req-${r.id}`,
                  onClick: () => router.push(`/admin/quotes?from_request=${r.id}`),
                  // 🔴 데스크탑 `<tr>` 과 같은 바탕 — 한쪽만 칠하면 화면 크기에 따라
                  //    같은 목록이 다르게 읽힌다(원칙 13번).
                  highlight: true,
                  title: "발주요청",
                  tags: (
                    <>
                      <RecurringContractBadge company={r.companies} small />
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 7px",
                          borderRadius: 4,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: "#FDE68A",
                          color: "#92400E",
                        }}
                      >
                        견적 작성 필요
                      </span>
                    </>
                  ),
                  lines: [
                    { label: "고객", value: r.companies?.name || "-" },
                    { label: "구간", value: `${r.origin || "-"} → ${r.destination || "-"}` },
                    { label: "차량", value: r.vehicle_type || "-" },
                    {
                      label: "접수일",
                      value: r.created_at
                        ? new Date(r.created_at).toLocaleDateString("ko-KR")
                        : "-",
                    },
                  ],
                })),
                ...quotes.map((q) => ({
                  key: q.id,
                  onClick: () => router.push(`/admin/quotes/${q.id}`),
                  // 🔴 DB 값 `상담중` 으로 가른다(화면 글자 「확인중」이 아니다)
                  highlight: q.status === "상담중",
                  title: q.quote_no,
                  tags: (
                    <>
                      <RecurringContractBadge company={q.companies} small />
                      {!q.companies?.name && q.guest_name && (
                        <span className="badge">개인</span>
                      )}
                      {needOrderIds.has(q.id) && (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 7px",
                            borderRadius: 4,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: "#FDE68A",
                            color: "#92400E",
                          }}
                        >
                          운송오더 생성 필요
                        </span>
                      )}
                    </>
                  ),
                  action: needOrderIds.has(q.id) ? (
                    <button
                      className="btn"
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12 }}
                      onClick={() => router.push(`/admin/orders?from_quote=${q.id}`)}
                    >
                      + 운송오더
                    </button>
                  ) : undefined,
                  lines: [
                    { label: "고객", value: q.companies?.name || q.guest_name || "-" },
                    { label: "구간", value: `${q.origin || "-"} → ${q.destination || "-"}` },
                    { label: "톤수", value: q.vehicle_type || "-" },
                    {
                      label: "금액",
                      value: q.final_amount ? (
                        <>
                          <span className="num">{won(q.final_amount)}</span>
                          {wonVatIncluded(q.final_amount) && (
                            <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                              (부가세 포함 {wonVatIncluded(q.final_amount)})
                            </div>
                          )}
                        </>
                      ) : (
                        "-"
                      ),
                    },
                    {
                      label: "상태",
                      value: (
                        <span
                          className="status-cap"
                          style={{
                            background: quoteStatusAdminStyle(q.status).bg,
                            color: quoteStatusAdminStyle(q.status).color,
                          }}
                        >
                          {quoteStatusAdminStyle(q.status).label}
                        </span>
                      ),
                    },
                    {
                      label: "일시",
                      value: new Date(q.created_at).toLocaleDateString("ko-KR"),
                    },
                  ],
                })),
              ]}
            />
          </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function QuotesPage() {
  return (
    <Suspense
      fallback={
        <main className="container">
          <div className="empty-state">불러오는 중...</div>
        </main>
      }
    >
      <QuotesPageInner />
    </Suspense>
  );
}
