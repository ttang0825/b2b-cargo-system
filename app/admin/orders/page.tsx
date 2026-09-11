"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { notifyBadgeRefresh } from "@/lib/notifyBadgeRefresh";
import AdminMobileList from "@/components/AdminMobileList";
import {
  fetchUnlinkedWonQuotes,
  type UnlinkedWonQuote,
} from "@/lib/unlinkedWonQuotes";
import { ORDER_STATUS_OPTIONS, getOrderStatusColor } from "@/lib/orderStatusColors";
import {
  formatPhoneNumber,
  VEHICLE_TYPES_ALL,
  DEFAULT_VEHICLE_TYPE,
  BODY_TYPES,
} from "@/lib/constants";
import { LOADING_METHOD_OPTIONS } from "@/lib/loadingMethods";
import { generateDailyNumber } from "@/lib/generateNumber";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import { getCurrentStaffId } from "@/lib/currentStaff";
import { getOrCreateIndividualCustomer, findIndividualCustomerByPhone } from "@/lib/individualCustomer";
import DateTimePicker from "@/components/DateTimePicker";
import MoneyInput from "@/components/MoneyInput";
import VatBasisSelect from "@/components/VatBasisSelect";
import DateRangeFilter, { DatePreset, getDateRange } from "@/components/DateRangeFilter";
import AddressSearch from "@/components/AddressSearch";
import PickupDropoffContactFields, {
  EMPTY_PICKUP_DROPOFF_CONTACT,
} from "@/components/PickupDropoffContactFields";
import { localInputToISOString, toLocalDateTimeInput } from "@/lib/localDateTime";
import MixableBadge from "@/components/MixableBadge";
import RecurringContractBadge from "@/components/RecurringContractBadge";
import { shortAddress } from "@/lib/shortAddress";
import CollectionMethodInput, { CollectionMethodValue } from "@/components/CollectionMethodInput";
import { getSettlementDisplayLabel, mapToLegacySettlementType } from "@/lib/settlementLabels";

type CompanyLite = { id: string; name: string; phone: string | null };

type OrderRow = {
  id: string;
  order_no: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  item: string | null;
  status: string;
  requested_pickup_at: string | null;
  created_at: string;
  guest_name: string | null;
  loading_type: string | null;
  // 🔴 정기계약 두 컬럼 — 33차 B장. 빼면 배지가 조용히 사라진다.
  companies: {
    name: string;
    is_recurring_contract?: boolean | null;
    recurring_contract_ended_on?: string | null;
  } | null;
};

const SORT_OPTIONS = [
  { key: "created_at", label: "등록일" },
  { key: "requested_pickup_at", label: "상차일" },
  { key: "status", label: "배차상태" },
  { key: "customer", label: "고객명" },
];

// "전체" 기간을 선택해도 한 번에 너무 많은 데이터를 불러오지 않도록 안전장치로 상한을 둠
const ALL_PERIOD_LIMIT = 500;
const FILTERED_PERIOD_LIMIT = 500;

function OrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuoteId = searchParams.get("from_quote");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 🔴 35차 B-2 (사용자 1번) — 운송오더 관리에 들어오면 **바로 신규 등록 폼이 열려 있다.**
  //    🔴 **목록을 숨기지 않는다.** PR #144 가 「폼 열림 시 목록 미렌더」 분기를 없앴고
  //       「다시 만들지 말 것」으로 못박았다 — 그 분기가 34차 리뷰에서 「눌렀는데 아무것도
  //       안 뜬다」를 한 번 만들었다. 폼과 목록이 같이 보이는 것이 정상이다.
  const [showForm, setShowForm] = useState(true);
  const [lastOrderNote, setLastOrderNote] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [period, setPeriod] = useState<DatePreset>("all");
  /**
   * 「수주인데 운송오더가 없는 견적」 — `TopNav` 「견적 관리」 배지와 **같은 규칙**이다
   * (`lib/unlinkedWonQuotes.ts`). 34차 리뷰 1라운드에 신고된
   * *"견적관리 부분에 계속해서 알림 표시 4건이 남아 있다"* 를 이 화면에서도 바로
   * 처리할 수 있게 띄운다 — 담당자가 오더를 만드는 자리가 여기이기 때문이다.
   */
  const [needOrderQuotes, setNeedOrderQuotes] = useState<UnlinkedWonQuote[]>([]);
  const [needOrderError, setNeedOrderError] = useState<string | null>(null);

  const [customerMode, setCustomerMode] = useState<"company" | "guest">(
    "company"
  );
  const [companySearch, setCompanySearch] = useState("");
  const [companyResults, setCompanyResults] = useState<CompanyLite[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyLite | null>(
    null
  );
  const [matchedIndividual, setMatchedIndividual] = useState<{ id: string; name: string } | null>(
    null
  );

  const [form, setForm] = useState({
    guest_name: "",
    guest_phone: "",
    origin: "",
    originDetail: "",
    originSido: "",
    originSigungu: "",
    destination: "",
    destinationDetail: "",
    destinationSido: "",
    destinationSigungu: "",
    ...EMPTY_PICKUP_DROPOFF_CONTACT,
    vehicle_type: `${DEFAULT_VEHICLE_TYPE} ${BODY_TYPES[0]}`,
    // 35차 B-3 — 오더에 금액이 없었다(사용자 2번). 부가세 구분은 배차·정산과 같은 부품
    customer_charge: "",
    customer_charge_vat_included: false,
    collection_method: "broker" as CollectionMethodValue["collection_method"],
    billing_cycle: "per_order" as CollectionMethodValue["billing_cycle"],
    direct_collection_point: null as CollectionMethodValue["direct_collection_point"],
    loading_type: "exclusive" as "exclusive" | "mixable",
    mixed_shipper_consent: false,
    mixed_discount_type: null as "amount" | "percent" | null,
    mixed_discount_amount: 0,
    mixed_discount_percent: 0,
    mixed_note: "",
    item: "",
    requested_pickup_at: "",
    requested_delivery_at: "",
    load_condition: "",
    unload_condition: "",
    special_notes: "",
    quote_id: "",
  });

  // 거리 정보가 없는 화면이라, 상차 후 고정 2시간 이후로만 하차일시를 선택하게 함
  const minDeliveryDateTime = (() => {
    if (!form.requested_pickup_at) return undefined;
    const d = new Date(form.requested_pickup_at);
    d.setHours(d.getHours() + 2);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  })();

  async function loadOrders(preset: DatePreset = period) {
    setLoading(true);
    const { from } = getDateRange(preset);
    let query = supabase
      .from("orders")
      .select(
        "id,order_no,origin,destination,vehicle_type,item,status,requested_pickup_at,created_at,guest_name,loading_type,companies(name,is_recurring_contract,recurring_contract_ended_on)"
      )
      .order("created_at", { ascending: false })
      .limit(preset === "all" ? ALL_PERIOD_LIMIT : FILTERED_PERIOD_LIMIT);
    if (from) query = query.gte("created_at", from);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setOrders(data as any as OrderRow[]);
    setLoading(false);
  }

  async function loadNeedOrder() {
    const { quotes, error } = await fetchUnlinkedWonQuotes();
    setNeedOrderQuotes(quotes);
    setNeedOrderError(error);
  }

  useEffect(() => {
    loadOrders("all");
    loadNeedOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 기간 필터 변경 시 목록만 다시 로드
  useEffect(() => {
    loadOrders(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // `orders.vehicle_type` 은 「톤수 차량형태」 한 문자열이라(35차 B-1) 드롭다운 두 개가
  // 쓸 값을 여기서 되짚는다. `lib/companyFields.ts` 의 `recommended_vehicle` 과 같은 관례다.
  const vehicleTonnage =
    VEHICLE_TYPES_ALL.find((t) => (form.vehicle_type || "").startsWith(t)) || DEFAULT_VEHICLE_TYPE;
  const vehicleBodyType =
    (form.vehicle_type || "").slice(vehicleTonnage.length).trim() || BODY_TYPES[0];

  // 🔴 35차 B-4 (사용자 4번) — 화주를 고르면 그 화주의 **가장 최근 오더**에서 반복되는
  //    항목을 제안한다. 같은 화주가 같은 구간을 계속 보내는 경우가 많아서다.
  //
  //    🔴 **이미 입력한 칸은 절대 덮어쓰지 않는다** — 빈 칸만 채운다. 담당자가 적어둔
  //       값을 화주 선택 한 번으로 날리면 그 자체가 사고다.
  //    🔴 **금액은 채우지 않는다** — 운임은 건마다 다르고, 지난 금액이 조용히 들어가면
  //       **잘못된 청구**가 된다(지시서 하지말것 9). 참고로 보여주지도 않는다.
  //    🔴 **일정(상차·하차 일시)도 채우지 않는다** — 지난 날짜가 들어가면 원칙 6번의
  //       「상차는 항상 현재시각 이후」와 정면으로 부딪힌다.
  //    ⚠️ 견적에서 넘어온 경우(`?from_quote=`)에는 이 제안이 견적 값을 덮지 않도록
  //       빈 칸만 채우는 규칙이 그대로 방어가 된다.
  async function prefillFromLastOrder(companyId: string) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "origin,origin_sido,origin_sigungu,destination,destination_sido,destination_sigungu,origin_company_name,origin_contact_name,origin_contact_phone,destination_company_name,destination_contact_name,destination_contact_phone,vehicle_type,item,load_condition,unload_condition,collection_method,billing_cycle,direct_collection_point"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1);
    // 🔴 조회 실패를 조용히 빈 결과로 넘기지 않는다(원칙 55번) — 다만 이것은 **제안**이라
    //    폼 전체를 막을 일은 아니므로 안내만 띄우고 폼은 그대로 쓴다.
    if (error) {
      setLastOrderNote(`직전 오더를 불러오지 못했습니다: ${error.message}`);
      return;
    }
    const last = data?.[0];
    if (!last) {
      setLastOrderNote(null);
      return;
    }
    const filled: string[] = [];
    setForm((prev) => {
      const next = { ...prev };
      const put = (key: keyof typeof prev, value: any, label: string) => {
        if (value == null || value === "") return;
        if (next[key] !== "" && next[key] != null) return;
        (next as any)[key] = value;
        filled.push(label);
      };
      put("origin", last.origin, "출발지");
      put("originSido", last.origin_sido, "");
      put("originSigungu", last.origin_sigungu, "");
      put("destination", last.destination, "도착지");
      put("destinationSido", last.destination_sido, "");
      put("destinationSigungu", last.destination_sigungu, "");
      put("origin_company_name", last.origin_company_name, "상차지 담당자");
      put("origin_contact_name", last.origin_contact_name, "");
      put("origin_contact_phone", last.origin_contact_phone, "");
      put("destination_company_name", last.destination_company_name, "하차지 담당자");
      put("destination_contact_name", last.destination_contact_name, "");
      put("destination_contact_phone", last.destination_contact_phone, "");
      put("item", last.item, "품목");
      put("load_condition", last.load_condition, "상차 조건");
      put("unload_condition", last.unload_condition, "하차 조건");
      // 차량은 기본값(1톤 카고)이 먼저 들어가 있어 `put` 의 「빈 칸만」 규칙에 걸리지
      // 않는다 — 담당자가 아직 손대지 않은 기본값일 때만 갈아끼운다
      if (last.vehicle_type && next.vehicle_type === `${DEFAULT_VEHICLE_TYPE} ${BODY_TYPES[0]}`) {
        next.vehicle_type = last.vehicle_type;
        filled.push("차량");
      }
      return next;
    });
    setLastOrderNote(
      filled.length > 0
        ? `직전 오더에서 ${filled.filter(Boolean).join(" · ")}을(를) 채웠습니다. 금액과 일정은 채우지 않습니다.`
        : "직전 오더가 있지만 이미 입력하신 값이 있어 채우지 않았습니다."
    );
  }

  // 견적 상세페이지에서 "운송오더 생성" 버튼으로 넘어온 경우, 견적 내용을 미리 채워줌
  useEffect(() => {
    async function prefillFromQuote() {
      if (!fromQuoteId) return;
      const { data: q } = await supabase
        .from("quotes")
        .select(
          "id,company_id,guest_name,guest_phone,origin,origin_sido,origin_sigungu,destination,destination_sido,destination_sigungu,origin_company_name,origin_contact_name,origin_contact_phone,destination_company_name,destination_contact_name,destination_contact_phone,vehicle_type,settlement_type,collection_method,billing_cycle,direct_collection_point,loading_type,mixed_shipper_consent,mixed_discount_type,mixed_discount_amount,mixed_discount_percent,mixed_note,item,selected_options,notes,requested_pickup_at,requested_dropoff_at,companies(id,name,phone)"
        )
        .eq("id", fromQuoteId)
        .single();
      if (!q) return;

      const options = (q.selected_options as any) || {};

      setShowForm(true);
      setForm((prev) => ({
        ...prev,
        origin: q.origin || "",
        originSido: q.origin_sido || "",
        originSigungu: q.origin_sigungu || "",
        destination: q.destination || "",
        destinationSido: q.destination_sido || "",
        destinationSigungu: q.destination_sigungu || "",
        origin_company_name: q.origin_company_name || "",
        origin_contact_name: q.origin_contact_name || "",
        origin_contact_phone: q.origin_contact_phone || "",
        destination_company_name: q.destination_company_name || "",
        destination_contact_name: q.destination_contact_name || "",
        destination_contact_phone: q.destination_contact_phone || "",
        vehicle_type: q.vehicle_type || "",
        collection_method: (q.collection_method as CollectionMethodValue["collection_method"]) || "broker",
        billing_cycle: (q.billing_cycle as CollectionMethodValue["billing_cycle"]) || "per_order",
        direct_collection_point:
          (q.direct_collection_point as CollectionMethodValue["direct_collection_point"]) || null,
        loading_type: (q.loading_type as "exclusive" | "mixable") || "exclusive",
        mixed_shipper_consent: q.mixed_shipper_consent || false,
        mixed_discount_type: (q.mixed_discount_type as "amount" | "percent" | null) || null,
        mixed_discount_amount: q.mixed_discount_amount || 0,
        mixed_discount_percent: q.mixed_discount_percent || 0,
        mixed_note: q.mixed_note || "",
        item: q.item || "",
        quote_id: q.id,
        guest_name: q.guest_name || "",
        guest_phone: q.guest_phone || "",
        load_condition: options.상차조건 || "",
        unload_condition: options.하차조건 || "",
        special_notes: q.notes || "",
        requested_pickup_at: toLocalDateTimeInput(q.requested_pickup_at),
        requested_delivery_at: toLocalDateTimeInput(q.requested_dropoff_at),
      }));
      if (q.company_id && (q as any).companies) {
        setCustomerMode("company");
        setSelectedCompany((q as any).companies);
      } else if (q.guest_name) {
        setCustomerMode("guest");
      }
    }
    prefillFromQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromQuoteId]);

  useEffect(() => {
    let active = true;
    async function search_() {
      if (companySearch.trim().length < 1) {
        setCompanyResults([]);
        return;
      }
      const { data } = await supabase
        .from("companies")
        .select("id,name,phone")
        .ilike("name", `%${companySearch}%`)
        .limit(8);
      if (active) setCompanyResults((data as CompanyLite[]) || []);
    }
    const t = setTimeout(search_, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [companySearch]);

  // 개인/신규 고객 연락처로 기존에 등록된 개인고객이 있는지 조회 — 있으면 이름 자동완성
  useEffect(() => {
    if (customerMode !== "guest") {
      setMatchedIndividual(null);
      return;
    }
    let active = true;
    async function lookup() {
      const found = await findIndividualCustomerByPhone(form.guest_phone);
      if (!active) return;
      setMatchedIndividual(found);
      if (found && !form.guest_name.trim()) {
        setForm((prev) => ({ ...prev, guest_name: found.name }));
      }
    }
    const t = setTimeout(lookup, 400);
    return () => {
      active = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerMode, form.guest_phone]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (customerMode === "company" && !selectedCompany) {
      setError("화주 업체를 검색해서 선택해주세요.");
      return;
    }
    if (customerMode === "guest" && !form.guest_name.trim()) {
      setError("개인/신규 고객명을 입력해주세요.");
      return;
    }
    if (!form.origin.trim() || !form.destination.trim()) {
      setError("출발지와 도착지를 입력해주세요.");
      return;
    }
    if (form.requested_pickup_at && form.requested_delivery_at) {
      const diffMs =
        new Date(form.requested_delivery_at).getTime() - new Date(form.requested_pickup_at).getTime();
      if (diffMs < 2 * 60 * 60 * 1000) {
        setError("하차 예정일시는 상차 후 최소 2시간 이후로 설정해주세요.");
        return;
      }
    }

    setSaving(true);
    const orderNo = await generateDailyNumber("orders", "O");

    const fullOrigin = [form.origin, form.originDetail].filter((v) => v.trim()).join(" ");
    const fullDestination = [form.destination, form.destinationDetail].filter((v) => v.trim()).join(" ");

    let individualCustomerId: string | null = null;
    if (customerMode === "guest" && form.guest_phone.trim()) {
      individualCustomerId = await getOrCreateIndividualCustomer(
        form.guest_name,
        form.guest_phone,
        [
          { address: fullOrigin, location_type: "상차지", sido: form.originSido, sigungu: form.originSigungu },
          {
            address: fullDestination,
            location_type: "하차지",
            sido: form.destinationSido,
            sigungu: form.destinationSigungu,
          },
        ]
      );
    }

    const { error } = await supabase.from("orders").insert({
      order_no: orderNo,
      created_by: await getCurrentStaffId(),
      company_id: customerMode === "company" ? selectedCompany!.id : null,
      guest_name: customerMode === "guest" ? form.guest_name : null,
      guest_phone: customerMode === "guest" ? form.guest_phone || null : null,
      individual_customer_id: individualCustomerId,
      quote_id: form.quote_id || null,
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
      vehicle_type: form.vehicle_type || null,
      customer_charge: form.customer_charge ? Number(form.customer_charge) : null,
      customer_charge_vat_included: form.customer_charge_vat_included,
      collection_method: form.collection_method,
      billing_cycle: form.billing_cycle,
      direct_collection_point: form.collection_method === "driver_direct" ? form.direct_collection_point : null,
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
      mixed_discount_amount: form.mixed_discount_amount || 0,
      mixed_discount_percent: form.mixed_discount_percent || 0,
      mixed_note: form.loading_type === "mixable" ? form.mixed_note || null : null,
      item: form.item || null,
      requested_pickup_at: localInputToISOString(form.requested_pickup_at),
      requested_delivery_at: localInputToISOString(form.requested_delivery_at),
      load_condition: form.load_condition || null,
      unload_condition: form.unload_condition || null,
      special_notes: form.special_notes || null,
      status: "접수",
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }

    setShowForm(false);
    setSelectedCompany(null);
    setCompanySearch("");
    setMatchedIndividual(null);
    setForm({
      guest_name: "",
      guest_phone: "",
      origin: "",
      originDetail: "",
      originSido: "",
      originSigungu: "",
      destination: "",
      destinationDetail: "",
      destinationSido: "",
      destinationSigungu: "",
      ...EMPTY_PICKUP_DROPOFF_CONTACT,
      vehicle_type: `${DEFAULT_VEHICLE_TYPE} ${BODY_TYPES[0]}`,
      customer_charge: "",
      customer_charge_vat_included: false,
      collection_method: "broker",
      billing_cycle: "per_order",
      direct_collection_point: null,
      loading_type: "exclusive",
      mixed_shipper_consent: false,
      mixed_discount_type: null,
      mixed_discount_amount: 0,
      mixed_discount_percent: 0,
      mixed_note: "",
      item: "",
      requested_pickup_at: "",
      requested_delivery_at: "",
      load_condition: "",
      unload_condition: "",
      special_notes: "",
      quote_id: "",
    });
    router.replace("/admin/orders");
    loadOrders(period);
    // 🔴 방금 만든 오더가 견적을 물고 있으면 그 건이 목록에서 빠져야 한다 —
    //    안 부르면 「만들었는데 안내가 그대로」로 보인다.
    loadNeedOrder();
    // 🔴 상단 메뉴 배지도 폴링(15초)을 기다리지 않고 바로 다시 세게 한다(원칙 23번).
    notifyBadgeRefresh();
  }

  async function handleStatusChange(id: string, status: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status, updated_by: await getCurrentStaffId() })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  const filtered = useMemo(() => {
    return orders
      .filter((o) => statusFilter === "전체" || o.status === statusFilter)
      .filter((o) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        const customer = o.companies?.name || o.guest_name || "";
        return (
          customer.toLowerCase().includes(q) ||
          (o.origin || "").toLowerCase().includes(q) ||
          (o.destination || "").toLowerCase().includes(q) ||
          (o.order_no || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let av: string | number = "";
        let bv: string | number = "";
        switch (sortKey) {
          case "requested_pickup_at":
            av = a.requested_pickup_at || "";
            bv = b.requested_pickup_at || "";
            break;
          case "status":
            av = (ORDER_STATUS_OPTIONS as readonly string[]).indexOf(a.status);
            bv = (ORDER_STATUS_OPTIONS as readonly string[]).indexOf(b.status);
            break;
          case "customer":
            av = a.companies?.name || a.guest_name || "";
            bv = b.companies?.name || b.guest_name || "";
            break;
          default:
            av = a.created_at;
            bv = b.created_at;
        }
        let cmp: number;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = String(av).localeCompare(String(bv), "ko");
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [orders, search, statusFilter, sortKey, sortDir]);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">운송오더 관리</h1>
          <p className="page-desc">
            수주된 견적 또는 직접 접수된 운송 건을 관리합니다.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <DateRangeFilter value={period} onChange={setPeriod} />
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "닫기" : "+ 신규 오더 등록"}
          </button>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {/* 🔴 **「알림 4건이 안 없어진다」의 처리 자리다**(34차 리뷰 1라운드).
          누르면 기존 프리필 경로(`?from_quote=`)를 그대로 타고, 그 경로가 저장 시
          `quote_id` 를 채우므로 오더를 만들면 배지가 저절로 사라진다.
          🔴 **이미 그 건의 오더를 만들었다면 여기서 또 만들지 말 것** — 그 오더의
             `quote_id` 가 비어 있는 것이므로 **오더 상세의 「견적 연결」**로 잇는다
             (실측 2026-09-10: 오더 6건 중 3건이 `quote_id` 없음). 그래서 안내 문구에
             그 길을 같이 적어 둔다. */}
      {needOrderError && (
        <div className="error-box">
          「운송오더가 없는 수주 견적」을 불러오지 못했습니다: {needOrderError}
        </div>
      )}
      {needOrderQuotes.length > 0 && (
        <div
          className="card"
          style={{ marginBottom: 20, padding: 16, background: "#FFFBEB" }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            운송오더가 없는 수주 견적 {needOrderQuotes.length}건
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 10 }}>
            상단 메뉴 「견적 관리」의 알림 숫자가 이 건들입니다. 오더를 만들면 숫자가
            줄어듭니다. 이미 오더를 만든 건이라면 새로 만들지 말고, 그 오더 상세의
            「견적 연결」에서 이어 주세요.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {needOrderQuotes.map((q) => (
              <div
                key={q.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  fontSize: 12.5,
                }}
              >
                <span className="num" style={{ fontWeight: 700 }}>
                  {q.quote_no}
                </span>
                <span>{q.companies?.name || q.guest_name || "-"}</span>
                <span style={{ color: "var(--text-muted)" }}>
                  {q.origin || "-"} → {q.destination || "-"}
                </span>
                <button
                  className="btn"
                  style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12 }}
                  onClick={() => router.push(`/admin/orders?from_quote=${q.id}`)}
                >
                  + 이 견적으로 오더 만들기
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {period === "all" && orders.length >= ALL_PERIOD_LIMIT && (
        <div className="error-box">
          최근 {ALL_PERIOD_LIMIT}건만 표시 중입니다. 더 오래된 데이터를 보려면
          기간 필터를 좁혀서 확인해주세요.
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          {/* 🔴 `req-marks quote-form` 은 **34차·PR #143 이 견적 폼에 만든 스코프를 그대로
                쓰는 것**이다(35차 B-1). 이름이 「quote」인 채로 두 화면이 공유하는 이유는,
                같은 규칙을 두 벌로 복사하면 다음에 한쪽만 고쳐져 조용히 갈리기 때문이다.
                🔴 **이름을 바꾸려고 `globals.css` 를 건드리지 말 것** — 그 순간 견적 폼이
                   같이 움직이고(완료조건 18), 삭제된 줄이 생긴다(완료조건 25). */}
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
                onClick={() => setCustomerMode("guest")}
              >
                개인 / 신규 고객
              </button>
            </div>

            {customerMode === "company" ? (
              <div style={{ marginBottom: 14 }}>
                <div className="field">
                  <label>화주 업체 검색</label>
                  <input
                    value={selectedCompany ? selectedCompany.name : companySearch}
                    onChange={(e) => {
                      setSelectedCompany(null);
                      setCompanySearch(e.target.value);
                    }}
                    placeholder="회사명 입력"
                  />
                  {lastOrderNote && (
                    <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
                      {lastOrderNote}
                    </p>
                  )}
                </div>
                {!selectedCompany && companyResults.length > 0 && (
                  <div
                    className="card"
                    style={{ marginTop: 6, maxHeight: 160, overflowY: "auto" }}
                  >
                    {companyResults.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCompany(c);
                          setCompanyResults([]);
                          prefillFromLastOrder(c.id);
                        }}
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          cursor: "pointer",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="form-grid" style={{ padding: 0, marginBottom: 14 }}>
                <div className="field">
                  <label>고객명 *</label>
                  <input
                    value={form.guest_name}
                    onChange={(e) =>
                      setForm({ ...form, guest_name: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>연락처</label>
                  <input
                    value={form.guest_phone}
                    onChange={(e) =>
                      setForm({ ...form, guest_phone: formatPhoneNumber(e.target.value) })
                    }
                  />
                  {matchedIndividual && (
                    <p style={{ fontSize: 11.5, color: "var(--accent)", marginTop: 4 }}>
                      ✓ 기존 개인고객입니다 ({matchedIndividual.name}) — 이 오더도 같은
                      고객으로 연결됩니다
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── 오더 등록 폼 블록 순서 (35차 B-1) ──────────────────────────────
                🔴 **① 구간 ② 일정 ③ 화물·차량 ④ 요청사항** — 화주포털 「화물등록」
                   (`/customer/request`)과 34차 견적 폼이 쓰는 순서다(사용자 3번).
                   그전에는 주소 → 차량 → 정산방식 → 일정 → 상하차조건 → 품목 순이라
                   **일정이 차량·정산 뒤에 있었고 묶음 표시가 없었다.**
                🔴 **포털 부품(`Pv2Select`·`Pv2DatePicker`·`.pv2-*`)은 하나도 안 가져왔다** —
                   `.portal-v2` 스코프 전용이라 끌어오면 관리자 31화면 CSS 가 딸려온다.
                   맞춘 것은 **순서와 묶음**이지 부품이 아니다(34차와 같은 규칙).
                ⚠️ **⑤ 정산·금액은 포털에 없는 블록이다** — 화주에게 안 보이는 내부
                   정보라 포털 발주 폼에는 처음부터 없다. 관리자에만 두고 번호를 이어 붙였다. */}
            <div className="form-grid" style={{ padding: 0 }}>
              <FormBlockHead n={1} title="운송 구간 · 현장 정보" note="화주포털 화물등록과 같은 순서입니다" />
              <AddressSearch
                label="출발지"
                required
                value={form.origin}
                detailValue={form.originDetail}
                onChange={(addr, sido, sigungu) =>
                  setForm((prev) => ({ ...prev, origin: addr, originSido: sido, originSigungu: sigungu }))
                }
                onDetailChange={(v) => setForm((prev) => ({ ...prev, originDetail: v }))}
              />
              <AddressSearch
                label="도착지"
                required
                value={form.destination}
                detailValue={form.destinationDetail}
                onChange={(addr, sido, sigungu) =>
                  setForm((prev) => ({
                    ...prev,
                    destination: addr,
                    destinationSido: sido,
                    destinationSigungu: sigungu,
                  }))
                }
                onDetailChange={(v) => setForm((prev) => ({ ...prev, destinationDetail: v }))}
              />
              <PickupDropoffContactFields
                value={form}
                onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              />
              <FormBlockHead n={2} title="일정" />
              <div style={{ gridColumn: "1 / -1" }}>
                <DateTimePicker
                  label="상차 예정일시"
                  value={form.requested_pickup_at}
                  onChange={(v) =>
                    setForm({ ...form, requested_pickup_at: v })
                  }
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <DateTimePicker
                  label="하차 예정일시"
                  value={form.requested_delivery_at}
                  onChange={(v) =>
                    setForm({ ...form, requested_delivery_at: v })
                  }
                  minDateTime={minDeliveryDateTime}
                  minDateTimeLabel="상차 후 최소 2시간 이후로 선택해주세요"
                />
              </div>

              <FormBlockHead n={3} title="화물 · 차량" />
              {/* ── 차량 (35차 B-1) ────────────────────────────────────────────────
                  🔴 **자유 입력칸이었다.** 포털·견적은 톤수와 차량형태를 각각 고르는데
                     오더만 `placeholder="예: 1톤 탑차"` 텍스트라, 같은 차급이 사람마다
                     다르게 적혀 배차에서 눈으로 맞춰야 했다.
                  🔴 저장은 종전과 같은 **한 칸(`orders.vehicle_type`)에 「톤수 차량형태」
                     문자열**이다 — `lib/companyFields.ts` 의 `recommended_vehicle` 과 같은
                     관례다. **컬럼을 새로 만들지 않았다**(원칙 27번).
                  ⚠️ `orders.tonnage` 컬럼이 따로 있지만 **관리자 어디서도 읽지 않는다**
                     (실측). 거기에 나눠 담으면 두 곳이 갈리므로 건드리지 않았다. */}
              <div className="field">
                <label>톤수</label>
                <select
                  value={vehicleTonnage}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_type: `${e.target.value} ${vehicleBodyType}`.trim() })
                  }
                >
                  {VEHICLE_TYPES_ALL.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>차량형태</label>
                <select
                  value={vehicleBodyType}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_type: `${vehicleTonnage} ${e.target.value}`.trim() })
                  }
                >
                  {BODY_TYPES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>상차 조건</label>
                <select
                  value={form.load_condition}
                  onChange={(e) =>
                    setForm({ ...form, load_condition: e.target.value })
                  }
                >
                  <option value="">선택</option>
                  {LOADING_METHOD_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>하차 조건</label>
                <select
                  value={form.unload_condition}
                  onChange={(e) =>
                    setForm({ ...form, unload_condition: e.target.value })
                  }
                >
                  <option value="">선택</option>
                  {LOADING_METHOD_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>품목</label>
                <input
                  value={form.item}
                  onChange={(e) => setForm({ ...form, item: e.target.value })}
                />
              </div>
              <FormBlockHead n={4} title="요청사항" />
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>특이사항</label>
                <textarea
                  rows={2}
                  value={form.special_notes}
                  onChange={(e) =>
                    setForm({ ...form, special_notes: e.target.value })
                  }
                />
              </div>
              <FormBlockHead n={5} title="정산 · 금액" note="화주포털에는 없는 관리자 전용 블록입니다" />
              {/* ── 금액 (35차 B-3 · 사용자 2번) ───────────────────────────────────
                  🔴 **오더에는 금액 칸이 하나도 없었다**(실측 — `orders` 에 금액 컬럼
                     자체가 없었다). 지금까지 금액은 **배차 등록 때 처음** 들어갔고,
                     그래서 담당자가 오더 화면에서 합의 금액을 볼 수가 없었다.
                  🔴 부가세 구분은 배차·정산과 **같은 부품**(`VatBasisSelect`)을 쓴다 —
                     두 벌이 되면 갈린다(A-3 · 완료조건 9).
                  🔴 **회사명 자동 기입이 이 칸을 채우지 않는다**(B-4) — 운임은 건마다
                     다르고, 지난 금액이 조용히 들어가면 잘못된 청구가 된다. */}
              <div className="field">
                <label>화주 청구금액(원)</label>
                <MoneyInput
                  value={form.customer_charge}
                  onChange={(v) => setForm({ ...form, customer_charge: v })}
                />
                <div style={{ marginTop: 4 }}>
                  <VatBasisSelect
                    value={form.customer_charge_vat_included}
                    onChange={(v) => setForm({ ...form, customer_charge_vat_included: v })}
                  />
                </div>
              </div>
              <CollectionMethodInput
                namePrefix="order_new"
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

            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "저장 중..." : "오더 등록"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowForm(false)}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 320 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="고객명, 오더번호, 구간으로 검색"
            style={{
              width: "100%",
              padding: "9px 30px 9px 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: 13.5,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              ×
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ fontSize: 12.5, padding: "7px 8px" }}
        >
          <option value="전체">전체 상태</option>
          {ORDER_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>정렬</span>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          style={{ fontSize: 12.5, padding: "7px 8px" }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }}
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        >
          {sortDir === "asc" ? "오름차순 ↑" : "내림차순 ↓"}
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {period === "all"
              ? "등록된 운송오더가 없습니다."
              : "선택한 기간에 등록된 운송오더가 없습니다."}
          </div>
        ) : (
          <>
          {/* 🔴 **데스크탑 표는 `desktop-only`, 모바일은 카드**(원칙 13번 · 리뷰 3라운드).
              `overflowX: auto` 는 태블릿 폭(761~1000)에서 표가 **페이지를 통째로** 옆으로
              미는 것을 막는다 — 실측에서 390px 페이지 scrollWidth 가 627 이었다. */}
          <div className="desktop-only" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>오더번호</th>
                <th style={{ whiteSpace: "nowrap" }}>고객</th>
                <th style={{ width: 170 }}>구간</th>
                <th style={{ whiteSpace: "nowrap" }}>차량</th>
                <th style={{ whiteSpace: "nowrap" }}>상차일</th>
                <th style={{ whiteSpace: "nowrap" }}>배차상태</th>
                <th style={{ whiteSpace: "nowrap" }}>등록일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => router.push(`/admin/orders/${o.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="num">{o.order_no}</span>
                    {o.loading_type === "mixable" && (
                      <div style={{ marginTop: 3 }}>
                        <MixableBadge />
                      </div>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <RecurringContractBadge company={o.companies} small block />
                    {o.companies?.name || o.guest_name || "-"}
                    {!o.companies?.name && o.guest_name && (
                      <span className="badge" style={{ marginLeft: 6 }}>
                        개인
                      </span>
                    )}
                  </td>
                  <td style={{ width: 170, fontSize: 12.5 }}>
                    <div>{shortAddress(o.origin)}</div>
                    <div style={{ color: "var(--text-muted)" }}>→ {shortAddress(o.destination)}</div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{o.vehicle_type || "-"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {o.requested_pickup_at ? (
                      <>
                        <div className="num">
                          {new Date(o.requested_pickup_at).toLocaleDateString("ko-KR", {
                            month: "2-digit",
                            day: "2-digit",
                          })}
                        </div>
                        <div className="num" style={{ color: "var(--text-muted)" }}>
                          {new Date(o.requested_pickup_at).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap" }}>
                    <select
                      value={o.status}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "none",
                        fontWeight: 600,
                        background: getOrderStatusColor(o.status).bg,
                        color: getOrderStatusColor(o.status).text,
                      }}
                    >
                      {ORDER_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="num">
                      {new Date(o.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* 모바일 카드 — 🔴 **뺀 것은 「등록일」 하나다.** 상차일이 담당자가 실제로
              보는 날짜이고, 등록일은 상세에서 확인한다. 배차상태 드롭다운은 목록에서
              바로 바꾸는 일이 잦아 **오른쪽 위에 그대로 뒀다.** */}
          <div className="mobile-only">
            <AdminMobileList
              rows={filtered.map((o) => ({
                key: o.id,
                onClick: () => router.push(`/admin/orders/${o.id}`),
                title: o.order_no,
                tags: (
                  <>
                    <RecurringContractBadge company={o.companies} small />
                    {o.loading_type === "mixable" && <MixableBadge />}
                    {!o.companies?.name && o.guest_name && <span className="badge">개인</span>}
                  </>
                ),
                action: (
                  <select
                    value={o.status}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    style={{
                      fontSize: "12px",
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "none",
                      fontWeight: 600,
                      background: getOrderStatusColor(o.status).bg,
                      color: getOrderStatusColor(o.status).text,
                    }}
                  >
                    {ORDER_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ),
                lines: [
                  { label: "고객", value: o.companies?.name || o.guest_name || "-" },
                  {
                    label: "구간",
                    value: `${shortAddress(o.origin)} → ${shortAddress(o.destination)}`,
                  },
                  { label: "차량", value: o.vehicle_type || "-" },
                  {
                    label: "상차일",
                    value: o.requested_pickup_at
                      ? new Date(o.requested_pickup_at).toLocaleString("ko-KR", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-",
                  },
                ],
              }))}
            />
          </div>
          </>
        )}
      </div>
    </main>
  );
}

/**
 * 폼 블록 머리 — 옐로 원 번호 + 제목. 34차·PR #143·#145 가 견적 폼에 만든 것과
 * **같은 모양**이다(35차 B-1).
 * 🔴 색은 `var(--brand-yellow)` 토큰이다 — `#FFD833` 리터럴로 다시 적지 말 것.
 * 🔴 `var(--pv2-yellow)` 를 쓰지 말 것 — `.portal-v2` 스코프 안에만 있어서 관리자에서는
 *    옐로가 안 나온다(상속값이 그대로 나온다. PR #145 에서 실측).
 * 🔴 글자색 `#1a1a1a` 는 포털 `--pv2-text` 와 같은 값이다.
 */
function FormBlockHead({ n, title, note }: { n: number; title: string; note?: string }) {
  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, margin: "6px 0 4px" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "var(--brand-yellow)",
          color: "#1a1a1a",
          fontSize: 13.5,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      <strong style={{ fontSize: 16.5 }}>{title}</strong>
      {note && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{note}</span>}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <main className="container">
          <div className="empty-state">불러오는 중...</div>
        </main>
      }
    >
      <OrdersPageInner />
    </Suspense>
  );
}
