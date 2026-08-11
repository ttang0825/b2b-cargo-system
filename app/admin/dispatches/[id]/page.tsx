"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  DISPATCH_STATUS_OPTIONS,
  getDispatchStatusColor,
  DISPATCH_TO_ORDER_STATUS,
} from "@/lib/dispatchStatusColors";
import { getCurrentStaffId, getCurrentStaffRole, getCurrentStaffName } from "@/lib/currentStaff";
import { formatPhoneNumber } from "@/lib/constants";
import ProcessedByFooter from "@/components/ProcessedByFooter";
import ConflictWarning from "@/components/ConflictWarning";
import SettlementFieldsChangeModal from "@/components/SettlementFieldsChangeModal";
import CollectionMethodInput, { CollectionMethodValue } from "@/components/CollectionMethodInput";
import { optimisticUpdate } from "@/lib/optimisticUpdate";
import { logSettlementFieldChange } from "@/lib/settlementFieldChangeLog";
import {
  getSettlementDisplayLabel,
  getPaymentConditionLabel,
  getNetworkSettlementTypeLabel,
  NETWORK_SETTLEMENT_TYPE_LABELS,
  getBrokerageFeePayerLabel,
  BROKERAGE_FEE_PAYER_LABELS,
  mapToLegacySettlementType,
} from "@/lib/settlementLabels";
import { calcSettlement } from "@/lib/settlementCalc";
import { calcVatAmount, calcInclusiveAmount } from "@/lib/vat";
import MoneyInput from "@/components/MoneyInput";
import MixableBadge from "@/components/MixableBadge";
import {
  getLatestInsuranceRateSettings,
  DEFAULT_INSURANCE_RATE_SETTINGS,
} from "@/lib/insuranceRateSettings";
import {
  DISPATCH_EXTRA_CHARGE_CATEGORIES,
  getDispatchExtraChargeCategoryLabel,
  getDispatchExtraChargeReasonLabel,
} from "@/lib/dispatchExtraCharges";
import {
  DispatchPhotoCategory,
  getDispatchPhotoCategoryLabel,
  getDispatchPhotoReasonLabel,
  isDispatchReadyForPhotoUpload,
} from "@/lib/dispatchPhotos";
import { uploadDispatchPhoto } from "@/lib/uploadDispatchPhoto";
import {
  CLAIM_TYPES,
  CLAIM_STATUSES,
  CLAIM_TERMINAL_STATUSES,
  RESPONSIBLE_PARTIES,
  getClaimTypeLabel,
  getClaimStatusColor,
} from "@/lib/claims";
import { localInputToISOString } from "@/lib/localDateTime";
import { fetchDispatchSmsPreview } from "@/lib/notifyDispatchSms";
import SmsLogPanel from "@/components/SmsLogPanel";
import SmsConfirmModal, { SmsPreview } from "@/components/SmsConfirmModal";

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

type NetworkLite = { id: string; name: string; is_active: boolean };
type DriverLite = {
  id: string;
  name: string;
  phone: string | null;
  vehicles: { vehicle_number: string | null; vehicle_type: string | null }[];
};

export default function DispatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [dispatch, setDispatch] = useState<any>(null);
  const [smsPreview, setSmsPreview] = useState<SmsPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [conflict, setConflict] = useState(false);

  const [networks, setNetworks] = useState<NetworkLite[]>([]);
  const [selectedDriverInfo, setSelectedDriverInfo] = useState<DriverLite | null>(null);
  const [driverSearch, setDriverSearch] = useState("");
  const [driverResults, setDriverResults] = useState<DriverLite[]>([]);

  const [confirmedNetworkId, setConfirmedNetworkId] = useState("");
  const [externalDriverName, setExternalDriverName] = useState("");
  const [externalDriverPhone, setExternalDriverPhone] = useState("");
  const [externalVehiclePlate, setExternalVehiclePlate] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [settlementSaving, setSettlementSaving] = useState(false);
  const [payoutCalcOpen, setPayoutCalcOpen] = useState(false);
  const [payoutCalcSaving, setPayoutCalcSaving] = useState(false);
  const [payoutCalcForm, setPayoutCalcForm] = useState({
    driver_base_fare: "",
    industrial_insurance_applicable: true,
  });
  const [rateSettings, setRateSettings] = useState(DEFAULT_INSURANCE_RATE_SETTINGS);

  // 로드맵③ 현장 추가비
  const [extraCharges, setExtraCharges] = useState<any[]>([]);
  const [extraChargeForm, setExtraChargeForm] = useState({
    category: DISPATCH_EXTRA_CHARGE_CATEGORIES[0] as string,
    customer_charge_amount: "",
    driver_payout_amount: "",
    note: "",
  });
  const [extraChargeSaving, setExtraChargeSaving] = useState(false);
  const [extraChargeError, setExtraChargeError] = useState<string | null>(null);
  const [cancellingExtraChargeId, setCancellingExtraChargeId] = useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  // 자주 발생하는 일이 아니라 배차 상세 레이아웃을 크게 차지하지 않도록
  // 기본은 접힘 — 제목만 보이고 펼치기 버튼으로 열람(PR #67 리뷰 반영)
  const [extraChargeSectionOpen, setExtraChargeSectionOpen] = useState(false);

  // 로드맵⑤ 클레임·사고 — 삭제 기능 없음(법적·분쟁 대응 근거자료 성격),
  // 상태를 "기각"으로 전환하는 것으로만 종결. 증빙사진은 로드맵④ 업로드
  // 인프라를 그대로 재사용(category='claim', claim_id로 연결).
  const [claims, setClaims] = useState<any[]>([]);
  const [claimForm, setClaimForm] = useState({
    claim_type: CLAIM_TYPES[0] as string,
    description: "",
    occurred_at: "",
    responsible_party: "",
    claim_amount: "",
    compensation_amount: "",
    memo: "",
  });
  const [claimSaving, setClaimSaving] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimStatusSaving, setClaimStatusSaving] = useState<Record<string, boolean>>({});
  const [claimPhotosByClaimId, setClaimPhotosByClaimId] = useState<Record<string, any[]>>({});
  const [claimPhotoUploading, setClaimPhotoUploading] = useState<Record<string, boolean>>({});
  // 자주 발생하는 일이 아니라 배차 상세 레이아웃을 크게 차지하지 않도록
  // 기본은 접힘 — 제목만 보이고 펼치기 버튼으로 열람(PR #67 리뷰 반영)
  const [claimsSectionOpen, setClaimsSectionOpen] = useState(false);

  // 로드맵④ POD·인수증 — dropoff/pod만 다룸('claim'은 claimPhotosByClaimId로 별도 관리)
  const [photos, setPhotos] = useState<Record<"dropoff" | "pod", any[]>>({
    dropoff: [],
    pod: [],
  });
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<Record<string, string>>({});
  const [photoUploading, setPhotoUploading] = useState<Record<string, boolean>>({});
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [photoDeleteReasonInput, setPhotoDeleteReasonInput] = useState("");
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  const networkNameById: Record<string, string> = {};
  networks.forEach((n) => (networkNameById[n.id] = n.name));

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
  }, []);

  useEffect(() => {
    supabase
      .from("external_networks")
      .select("id,name,is_active")
      .order("sort_order", { ascending: true })
      .then(({ data }) => setNetworks((data as any as NetworkLite[]) || []));
  }, []);

  useEffect(() => {
    let active = true;
    async function search_() {
      if (driverSearch.trim().length < 1) {
        setDriverResults([]);
        return;
      }
      const { data } = await supabase
        .from("drivers")
        .select("id,name,phone,vehicles(vehicle_number,vehicle_type)")
        .ilike("name", `%${driverSearch}%`)
        .limit(8);
      if (active) setDriverResults((data as any as DriverLite[]) || []);
    }
    const t = setTimeout(search_, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [driverSearch]);

  const [editForm, setEditForm] = useState({
    customer_charge: "",
    driver_payout: "",
    total_freight_amount: "",
    pickup_confirmed: false,
    delivery_confirmed: false,
    issue_occurred: false,
    issue_notes: "",
    memo: "",
    assignment_type: "internal" as "internal" | "external",
    driver_id: null as string | null,
    requested_network_ids: [] as string[],
    network_settlement_type: "none" as string,
    driver_direct_collection_amount: "",
    brokerage_fee: "",
    brokerage_fee_payer: "" as string,
  });
  const [settlementValue, setSettlementValue] = useState<CollectionMethodValue>({
    collection_method: "broker",
    billing_cycle: "per_order",
    direct_collection_point: null,
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("dispatches")
      .select(
        "*, orders(id,order_no,origin,destination,item,vehicle_type,loading_type,mixed_discount_type,mixed_discount_amount,mixed_discount_percent), drivers(id,name,phone,vehicles(vehicle_number,vehicle_type))"
      )
      .eq("id", id)
      .single();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDispatch(data);
    setEditForm({
      customer_charge: data.customer_charge ?? "",
      driver_payout: data.driver_payout ?? "",
      total_freight_amount: data.total_freight_amount != null ? String(data.total_freight_amount) : "",
      pickup_confirmed: data.pickup_confirmed || false,
      delivery_confirmed: data.delivery_confirmed || false,
      issue_occurred: data.issue_occurred || false,
      issue_notes: data.issue_notes || "",
      memo: data.memo || "",
      assignment_type: (data.assignment_type as "internal" | "external") || "internal",
      driver_id: data.driver_id || null,
      requested_network_ids: data.requested_network_ids || [],
      network_settlement_type: data.network_settlement_type || "none",
      driver_direct_collection_amount:
        data.driver_direct_collection_amount != null ? String(data.driver_direct_collection_amount) : "",
      brokerage_fee: data.brokerage_fee != null ? String(data.brokerage_fee) : "",
      brokerage_fee_payer: data.brokerage_fee_payer || "",
    });
    setSettlementValue({
      collection_method: (data.collection_method as any) || "broker",
      billing_cycle: (data.billing_cycle as any) || "per_order",
      direct_collection_point: (data.direct_collection_point as any) || null,
    });
    setSelectedDriverInfo(data.drivers || null);
    setConfirmedNetworkId(data.confirmed_network_id || "");
    setExternalDriverName(data.external_driver_name || "");
    setExternalDriverPhone(data.external_driver_phone || "");
    setExternalVehiclePlate(data.external_vehicle_plate || "");

    if (data.driver_base_fare != null) {
      // 이미 한 번 저장된 적 있는 배차 — 저장된 값 그대로 표시
      setPayoutCalcForm({
        driver_base_fare: String(data.driver_base_fare),
        industrial_insurance_applicable: data.industrial_insurance_applicable ?? true,
      });
    } else {
      // 처음 입력하는 배차 — 가장 최근에 저장된 다른 배차 건의 산재보험 설정을
      // 기본값으로 미리 채워줌(매번 토글을 새로 누르지 않아도 되게)
      const { data: recent } = await supabase
        .from("dispatches")
        .select("industrial_insurance_applicable")
        .neq("id", id)
        .not("driver_base_fare", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setPayoutCalcForm({
        driver_base_fare: "",
        industrial_insurance_applicable: recent?.industrial_insurance_applicable ?? true,
      });
    }

    const rs = await getLatestInsuranceRateSettings();
    setRateSettings(
      rs
        ? { expense_deduction_rate: rs.expense_deduction_rate, insurance_rate_total: rs.insurance_rate_total }
        : DEFAULT_INSURANCE_RATE_SETTINGS
    );

    await loadExtraCharges();
    await loadClaims();
    await loadPhotos();

    setLoading(false);
  }

  // 로드맵③ 현장 추가비 — 취소된 것도 이력으로 같이 보여줌(재무 데이터는
  // 삭제하지 않고 이력 보존)
  async function loadExtraCharges() {
    const { data } = await supabase
      .from("dispatch_extra_charges")
      .select("*")
      .eq("dispatch_id", id)
      .order("created_at", { ascending: false });
    setExtraCharges(data || []);
  }

  // 로드맵⑤ 클레임·사고 — 일반 업무 테이블 관례(anon 전체허용 RLS,
  // admin 화면에서 직접 CRUD). 삭제 없이 상태만 바뀌므로 전부 그대로 보여줌.
  async function loadClaims() {
    const { data } = await supabase
      .from("claims")
      .select("*")
      .eq("dispatch_id", id)
      .order("created_at", { ascending: false });
    setClaims(data || []);
  }

  // 로드맵④ POD·인수증 — 목록조회 후, 미리보기 가능한 형식(JPEG/PNG/WebP)만
  // signed URL을 미리 받아와 썸네일로 표시(HEIC/HEIF는 파일카드로만 표시)
  async function loadPhotos() {
    const res = await fetch(`/api/admin/dispatch-photos/list?dispatch_id=${id}`);
    const data = await res.json();
    if (!res.ok) return;
    const list: any[] = data.photos || [];
    setPhotos({
      dropoff: list.filter((p) => p.category === "dropoff"),
      pod: list.filter((p) => p.category === "pod"),
    });
    // 로드맵⑤ — 클레임 증빙 사진은 claim_id 기준으로 그룹핑(한 배차에 클레임이
    // 여러 건일 수 있어서 각 클레임 카드 아래에 자기 사진만 보여줘야 함)
    const claimGrouped: Record<string, any[]> = {};
    list.forEach((p) => {
      if (p.category === "claim" && p.claim_id) {
        (claimGrouped[p.claim_id] ||= []).push(p);
      }
    });
    setClaimPhotosByClaimId(claimGrouped);
    // list API가 미리보기 가능한 형식(JPEG/PNG/WebP)의 썸네일 signed URL을
    // batch로 함께 내려줘서, 사진마다 signed-url을 따로 호출할 필요가 없음
    // (PR #66 리뷰 — 로딩이 느리다는 피드백 반영)
    const urls: Record<string, string> = {};
    list.forEach((p) => {
      if (p.preview_url) urls[p.id] = p.preview_url;
    });
    setPhotoPreviewUrls(urls);
  }

  async function handleUploadPhotos(category: DispatchPhotoCategory, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setPhotoError(null);
    setPhotoUploading((u) => ({ ...u, [category]: true }));
    try {
      // 여러 장을 한 번에 선택하면 파일마다 순서대로 기다리지 않고 동시에
      // 업로드(각 파일의 upload-url 발급→Storage 업로드→finalize 3단계가
      // 서로 독립적이라 병렬로 돌려도 안전함) — PR #66 리뷰에서 업로드
      // 시간이 길게 느껴진다는 피드백 반영
      const files = Array.from(fileList);
      const results = await Promise.all(files.map((file) => uploadDispatchPhoto(id, category, file)));
      const failed = results
        .map((r, i) => (r.error ? `${files[i].name}: ${getDispatchPhotoReasonLabel(r.error)}` : null))
        .filter((m): m is string => m !== null);
      if (failed.length > 0) setPhotoError(failed.join(" / "));
      await loadPhotos();
    } finally {
      setPhotoUploading((u) => ({ ...u, [category]: false }));
    }
  }

  async function handleViewPhoto(photoId: string) {
    const res = await fetch("/api/admin/dispatch-photos/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_id: photoId }),
    });
    const data = await res.json();
    if (res.ok && data.url) {
      window.open(data.url, "_blank");
    } else {
      setPhotoError(getDispatchPhotoReasonLabel(data.error));
    }
  }

  async function handleConfirmDeletePhoto(photoId: string) {
    if (!photoDeleteReasonInput.trim()) return;
    const res = await fetch("/api/admin/dispatch-photos/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_id: photoId, reason: photoDeleteReasonInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPhotoError(getDispatchPhotoReasonLabel(data.error));
      return;
    }
    setDeletingPhotoId(null);
    setPhotoDeleteReasonInput("");
    // 삭제 후 전체 목록을 다시 불러오면 남은 사진들의 signed URL(썸네일)까지
    // 전부 재발급받게 되어 체감이 느려짐 — 이미 갖고 있는 상태에서 삭제된
    // 항목만 제거(나머지 캐시된 썸네일 URL은 그대로 재사용)
    setPhotos((prev) => ({
      dropoff: prev.dropoff.filter((p) => p.id !== photoId),
      pod: prev.pod.filter((p) => p.id !== photoId),
    }));
    setClaimPhotosByClaimId((prev) => {
      const next: Record<string, any[]> = {};
      Object.keys(prev).forEach((claimId) => {
        next[claimId] = prev[claimId].filter((p) => p.id !== photoId);
      });
      return next;
    });
    setPhotoPreviewUrls((prev) => {
      const next = { ...prev };
      delete next[photoId];
      return next;
    });
  }

  // 로드맵⑤ 클레임·사고 — 등록/상태변경. 일반 업무 테이블 관례대로 anon
  // 클라이언트에서 직접 CRUD(정산 금액을 직접 건드리지 않아 SECURITY DEFINER
  // 함수까지는 과함, 원칙 2번과 동일한 패턴).
  async function handleRegisterClaim() {
    if (!claimForm.description.trim()) {
      setClaimError("클레임 내용을 입력해주세요.");
      return;
    }
    setClaimSaving(true);
    setClaimError(null);
    const staffId = await getCurrentStaffId();
    const staffName = await getCurrentStaffName();
    const { error } = await supabase.from("claims").insert({
      dispatch_id: id,
      claim_type: claimForm.claim_type,
      description: claimForm.description.trim(),
      occurred_at: claimForm.occurred_at ? localInputToISOString(claimForm.occurred_at) : null,
      responsible_party: claimForm.responsible_party || null,
      claim_amount: claimForm.claim_amount ? Number(claimForm.claim_amount) : null,
      compensation_amount: claimForm.compensation_amount ? Number(claimForm.compensation_amount) : null,
      memo: claimForm.memo || null,
      created_by: staffId,
      created_by_name_snapshot: staffName,
    });
    setClaimSaving(false);
    if (error) {
      setClaimError(error.message);
      return;
    }
    setClaimForm({
      claim_type: CLAIM_TYPES[0],
      description: "",
      occurred_at: "",
      responsible_party: "",
      claim_amount: "",
      compensation_amount: "",
      memo: "",
    });
    await loadClaims();
  }

  async function handleUpdateClaimStatus(claimId: string, newStatus: string) {
    setClaimStatusSaving((s) => ({ ...s, [claimId]: true }));
    const staffId = await getCurrentStaffId();
    const staffName = await getCurrentStaffName();
    const payload: Record<string, any> = {
      status: newStatus,
      updated_by: staffId,
      updated_by_name_snapshot: staffName,
    };
    const claim = claims.find((c) => c.id === claimId);
    if (CLAIM_TERMINAL_STATUSES.includes(newStatus)) {
      // 처리완료/기각으로 종결되는 시점에만 resolved_at/resolved_by를 채움
      // (이미 채워져 있으면 재확정 시에도 최초 종결 시점을 덮어쓰지 않음)
      if (!claim?.resolved_at) {
        payload.resolved_at = new Date().toISOString();
        payload.resolved_by = staffId;
      }
    } else if (claim?.resolved_at) {
      // 종결 상태에서 다시 되돌리면(재조사 등) resolved 정보 초기화
      payload.resolved_at = null;
      payload.resolved_by = null;
    }
    const { error } = await supabase.from("claims").update(payload).eq("id", claimId);
    setClaimStatusSaving((s) => ({ ...s, [claimId]: false }));
    if (error) {
      setClaimError(error.message);
      return;
    }
    await loadClaims();
  }

  async function handleUploadClaimPhotos(claimId: string, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setClaimError(null);
    setClaimPhotoUploading((u) => ({ ...u, [claimId]: true }));
    try {
      const files = Array.from(fileList);
      const results = await Promise.all(
        files.map((file) => uploadDispatchPhoto(id, "claim", file, claimId))
      );
      const failed = results
        .map((r, i) => (r.error ? `${files[i].name}: ${getDispatchPhotoReasonLabel(r.error)}` : null))
        .filter((m): m is string => m !== null);
      if (failed.length > 0) setClaimError(failed.join(" / "));
      await loadPhotos();
    } finally {
      setClaimPhotoUploading((u) => ({ ...u, [claimId]: false }));
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleAssignmentTypeChange(type: "internal" | "external") {
    // 배정방식을 바꾸면 반대쪽에서 선택해뒀던 정보는 초기화 (운임은 유지)
    setEditForm((f) => ({
      ...f,
      assignment_type: type,
      driver_id: type === "internal" ? f.driver_id : null,
      requested_network_ids: type === "external" ? f.requested_network_ids : [],
    }));
    if (type === "external") {
      setSelectedDriverInfo(null);
      setDriverSearch("");
    }
  }

  async function handleConfirm() {
    setError(null);
    if (
      settlementValue.collection_method === "driver_direct" &&
      (!settlementValue.direct_collection_point || settlementValue.direct_collection_point === "undecided")
    ) {
      setError("선착불(차주 직접수금) 건은 배차확정 전에 지급조건(선불/착불)을 먼저 확정해주세요.");
      return;
    }
    if (editForm.assignment_type === "internal") {
      if (!editForm.driver_id) {
        setError("배차확정하려면 차주를 먼저 선택해주세요.");
        return;
      }
    } else {
      if (!confirmedNetworkId) {
        setError("실제로 배차가 확정된 정보망을 선택해주세요.");
        return;
      }
      if (!externalDriverName.trim() || !externalDriverPhone.trim()) {
        setError("배정된 차주의 이름과 연락처를 입력해주세요.");
        return;
      }
    }

    setConfirming(true);
    const payload: any = {
      dispatch_status: "배차확정",
      assignment_type: editForm.assignment_type,
      driver_id: editForm.assignment_type === "internal" ? editForm.driver_id : null,
      requested_network_ids: editForm.requested_network_ids,
      confirmed_network_id: editForm.assignment_type === "external" ? confirmedNetworkId : null,
      external_driver_name: editForm.assignment_type === "external" ? externalDriverName.trim() : null,
      external_driver_phone: editForm.assignment_type === "external" ? externalDriverPhone.trim() : null,
      external_vehicle_plate:
        editForm.assignment_type === "external" ? externalVehiclePlate.trim() || null : null,
      customer_charge: editForm.customer_charge ? Number(editForm.customer_charge) : null,
      driver_payout: editForm.driver_payout ? Number(editForm.driver_payout) : null,
      updated_by: await getCurrentStaffId(),
    };

    const { error } = await supabase.from("dispatches").update(payload).eq("id", id);
    if (error) {
      setConfirming(false);
      setError(error.message);
      return;
    }
    if (dispatch?.orders?.id) {
      await supabase
        .from("orders")
        .update({ status: DISPATCH_TO_ORDER_STATUS["배차확정"] })
        .eq("id", dispatch.orders.id);
    }
    const smsPreviewResult = await fetchDispatchSmsPreview(id, "배차확정");
    if (smsPreviewResult) setSmsPreview(smsPreviewResult);
    setConfirming(false);
    load();
  }

  async function handleStatusChange(status: string) {
    const prevStatus = dispatch?.dispatch_status;
    const { error } = await supabase
      .from("dispatches")
      .update({ dispatch_status: status, updated_by: await getCurrentStaffId() })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    if (dispatch?.orders?.id && DISPATCH_TO_ORDER_STATUS[status]) {
      await supabase
        .from("orders")
        .update({ status: DISPATCH_TO_ORDER_STATUS[status] })
        .eq("id", dispatch.orders.id);
    }

    // "운송완료"로 새로 바뀐 경우 +1, "운송완료"에서 다른 상태로 벗어나는 경우 -1
    if (
      status === "운송완료" &&
      prevStatus !== "운송완료" &&
      dispatch?.drivers?.id
    ) {
      await adjustDriverTripCount(dispatch.drivers.id, 1);
    } else if (
      prevStatus === "운송완료" &&
      status !== "운송완료" &&
      dispatch?.drivers?.id
    ) {
      await adjustDriverTripCount(dispatch.drivers.id, -1);
    }

    // "운송완료"로 새로 바뀌면 정산이 없을 경우 자동 등록
    if (status === "운송완료" && prevStatus !== "운송완료" && dispatch?.orders?.id) {
      await autoCreateInvoiceIfNeeded(dispatch.orders.id);
    }

    if (status !== prevStatus) {
      const smsPreviewResult = await fetchDispatchSmsPreview(id, status);
      if (smsPreviewResult) setSmsPreview(smsPreviewResult);
    }

    // updated_at을 DB 기준으로 다시 받아와야 함 — 부분 병합만 하고 넘어가면
    // 로컬 updated_at이 옛날 값 그대로 남아서, 바로 이어서 "변경사항 저장"을
    // 누를 때 낙관적 잠금이 "다른 직원이 방금 수정함"으로 잘못 판단하는 버그가 있었음
    load();
  }

  // "접수중" 단계에서는 자유롭게 변경, 배차확정 이후는 사유 입력 모달을 거쳐야만
  // 변경 가능 (오더 상세와 동일한 패턴). 즉시 저장 후 load()로 전체 재조회
  // (원칙 36번 — 부분 병합 금지)
  async function handleSettlementFieldsChange(next: CollectionMethodValue, reason: string | null) {
    if (!dispatch) return;
    setSettlementSaving(true);
    setError(null);
    const staffId = await getCurrentStaffId();
    const before = settlementValue;
    const legacyMapped = mapToLegacySettlementType(
      next.collection_method,
      next.billing_cycle,
      next.direct_collection_point
    );
    const { error } = await supabase
      .from("dispatches")
      .update({
        collection_method: next.collection_method,
        billing_cycle: next.billing_cycle,
        direct_collection_point: next.collection_method === "driver_direct" ? next.direct_collection_point : null,
        ...(legacyMapped ? { settlement_type: legacyMapped } : {}),
        updated_by: staffId,
      })
      .eq("id", id);
    if (error) {
      setSettlementSaving(false);
      setError(error.message);
      return;
    }
    if (reason) {
      const changes: [string, string | null, string | null][] = [
        ["collection_method", before.collection_method, next.collection_method],
        ["billing_cycle", before.billing_cycle, next.billing_cycle],
        ["direct_collection_point", before.direct_collection_point, next.direct_collection_point],
      ];
      for (const [fieldName, beforeValue, afterValue] of changes) {
        if (beforeValue === afterValue) continue;
        await logSettlementFieldChange({
          targetTable: "dispatches",
          targetId: id,
          fieldName,
          beforeValue,
          afterValue,
          reason,
        });
      }
    }
    setSettlementSaving(false);
    setSettlementModalOpen(false);
    load();
  }

  // 차주 기본운임 + 부가세 포함여부 + 산재보험료 적용대상 여부로 최종
  // 지급액·산재보험료 내역을 계산해서 저장. driver_total_payout을 새 컬럼으로
  // 만들지 않고 기존 driver_payout 컬럼을 그대로 재사용함(원칙 27번 —
  // dispatches에 이미 이 용도로 쓰이던 컬럼이 있었음). 산재보험료 계산 근거
  // (월보수액/차주부담/주선사부담/적용요율)는 감사·확인용으로 스냅샷 컬럼에
  // 같이 저장 — 이후 요율 설정이 바뀌어도 과거 배차 건의 저장된 값은 안 바뀜.
  // 즉시 저장 후 load()로 전체 재조회 (원칙 36번)
  async function handlePayoutCalcSave() {
    if (!dispatch) return;
    setPayoutCalcSaving(true);
    setError(null);
    const result = calcSettlement({
      driverBaseFare: Number(payoutCalcForm.driver_base_fare) || 0,
      industrialInsuranceApplicable: payoutCalcForm.industrial_insurance_applicable,
      customerCharge: Number(editForm.customer_charge) || 0,
      rateSettings: {
        expenseDeductionRate: rateSettings.expense_deduction_rate,
        insuranceRateTotal: rateSettings.insurance_rate_total,
      },
    });
    const { error } = await supabase
      .from("dispatches")
      .update({
        driver_base_fare: Number(payoutCalcForm.driver_base_fare) || null,
        industrial_insurance_applicable: payoutCalcForm.industrial_insurance_applicable,
        industrial_insurance_rate: result.appliedInsuranceRate,
        industrial_insurance_base_amount: result.industrialInsuranceBaseAmount,
        industrial_insurance_driver_share: result.industrialInsuranceDriverShare,
        industrial_insurance_broker_share: result.industrialInsuranceBrokerShare,
        driver_payout: result.driverTotalPayout || null,
        updated_by: await getCurrentStaffId(),
      })
      .eq("id", id);
    setPayoutCalcSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    load();
  }

  // 로드맵③ 현장 추가비 등록 — DB 함수(register_dispatch_extra_charge)가
  // 배차→오더→정산 건 연쇄 조회, 확정 묶음이면 정정청구 정산 건 자동생성까지
  // 원자적으로 처리(1-9 조사 결과 반영, 여러 개별 update 나열 방식 사용 안 함)
  async function handleRegisterExtraCharge() {
    if (!dispatch) return;
    setExtraChargeError(null);
    const chargeNum = Number(extraChargeForm.customer_charge_amount) || 0;
    const payoutNum = Number(extraChargeForm.driver_payout_amount) || 0;
    if (chargeNum === 0 && payoutNum === 0) {
      setExtraChargeError("화주 청구액 또는 차주 지급액 중 하나는 입력해주세요.");
      return;
    }
    if (extraChargeForm.category === "other" && !extraChargeForm.note.trim()) {
      setExtraChargeError("'기타' 항목은 사유를 입력해주세요.");
      return;
    }
    setExtraChargeSaving(true);
    const res = await fetch("/api/admin/dispatch-extra-charges/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dispatch_id: id,
        category: extraChargeForm.category,
        customer_charge_amount: chargeNum,
        driver_payout_amount: payoutNum,
        note: extraChargeForm.note.trim() || null,
      }),
    });
    const result = await res.json().catch(() => ({}));
    setExtraChargeSaving(false);
    if (!res.ok || !result.success) {
      setExtraChargeError(result.error || getDispatchExtraChargeReasonLabel(result.reason));
      return;
    }
    setExtraChargeForm({
      category: DISPATCH_EXTRA_CHARGE_CATEGORIES[0],
      customer_charge_amount: "",
      driver_payout_amount: "",
      note: "",
    });
    await loadExtraCharges();
  }

  async function handleCancelExtraCharge(chargeId: string) {
    if (!cancelReasonInput.trim()) {
      setExtraChargeError("취소 사유를 입력해주세요.");
      return;
    }
    setExtraChargeError(null);
    const res = await fetch("/api/admin/dispatch-extra-charges/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: chargeId, reason: cancelReasonInput }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.success) {
      setExtraChargeError(result.error || getDispatchExtraChargeReasonLabel(result.reason));
      return;
    }
    setCancellingExtraChargeId(null);
    setCancelReasonInput("");
    await loadExtraCharges();
  }

  async function adjustDriverTripCount(driverId: string, delta: number) {
    const { data: driver } = await supabase
      .from("drivers")
      .select("completed_trip_count")
      .eq("id", driverId)
      .single();
    if (driver) {
      await supabase
        .from("drivers")
        .update({
          completed_trip_count: Math.max(
            (driver.completed_trip_count || 0) + delta,
            0
          ),
        })
        .eq("id", driverId);
    }
  }

  // 운송완료로 바뀐 오더에 정산이 아직 없으면 자동으로 등록
  // (화주 실적은 DB 트리거가 알아서 재계산하므로 여기서 따로 안 건드림)
  async function autoCreateInvoiceIfNeeded(orderId: string) {
    // 로드맵③ 이후로는 한 오더에 정정청구 invoice가 추가로 있을 수 있어
    // .maybeSingle()이 2행 이상이면 에러를 던짐 — 존재 여부만 확인
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("order_id", orderId)
      .limit(1);
    if (existing && existing.length > 0) return;

    const { data: order } = await supabase
      .from("orders")
      .select("company_id,individual_customer_id")
      .eq("id", orderId)
      .single();

    // 로드맵③ 현장 추가비 — 정산 건이 아직 없는 상태에서 미리 등록된 활성
    // 추가비가 있으면 최초 스냅샷에 포함해서 얼림(3-2)
    const { data: activeExtras } = await supabase
      .from("dispatch_extra_charges")
      .select("customer_charge_amount,driver_payout_amount")
      .eq("dispatch_id", id)
      .eq("status", "active");
    const extraCharge = (activeExtras || []).reduce((s, e) => s + (e.customer_charge_amount || 0), 0);
    const extraPayout = (activeExtras || []).reduce((s, e) => s + (e.driver_payout_amount || 0), 0);

    // 혼적 할인은 이미 견적 단계 최종금액에 반영되어 저장되므로 별도 변환
    // 없이 화주 청구운임을 그대로 사용
    const charge = (Number(editForm.customer_charge) || 0) + extraCharge;
    const payout = (Number(editForm.driver_payout) || 0) + extraPayout;
    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    // 화주 청구금액은 공급가액, 차주 지급금액은 실제 지급되는 최종금액
    // (부가세 포함 기준)이라 기준이 달랐음 — 청구금액을 부가세 포함가로
    // 환산해서 맞춘 뒤 차감(PR #63 리뷰 피드백)
    const commission = calcInclusiveAmount(charge) - payout;

    const { error: invoiceError } = await supabase.from("invoices").insert({
      order_id: orderId,
      company_id: order?.company_id || null,
      individual_customer_id: order?.individual_customer_id || null,
      billing_period: billingPeriod,
      settlement_reference_date: new Date().toISOString().slice(0, 10),
      customer_charge_total: charge || null,
      driver_payout_total: payout || null,
      commission_total: commission || null,
      receivable_amount: charge || null,
      payable_amount: payout || null,
      settlement_type: dispatch?.settlement_type || "general",
      collection_method: dispatch?.collection_method || "broker",
      billing_cycle: dispatch?.billing_cycle || "per_order",
      direct_collection_point: dispatch?.direct_collection_point || null,
      network_settlement_type: dispatch?.network_settlement_type || "none",
      total_freight_amount:
        (editForm.total_freight_amount ? Number(editForm.total_freight_amount) : null) ?? charge ?? null,
      driver_direct_collection_amount: editForm.driver_direct_collection_amount
        ? Number(editForm.driver_direct_collection_amount)
        : null,
      brokerage_fee: editForm.brokerage_fee ? Number(editForm.brokerage_fee) : null,
      brokerage_fee_payer: editForm.brokerage_fee_payer || null,
      status: "정산대기",
      created_by: await getCurrentStaffId(),
    });
    if (invoiceError) {
      setError(`정산 자동등록에 실패했습니다: ${invoiceError.message}`);
    }
  }

  // 상차/하차 완료 확인 체크는 배차상태도 같이 앞으로 진행시킴(뒤로는 자동으로
  // 안 돌아감 — 체크 해제만으로 상태를 되돌리고 싶으면 상태 드롭다운에서 직접
  // 바꿀 것). 접수중/운송완료/문제발생 상태는 체크박스로 건드리지 않음(접수중은
  // 전용 확정 절차를 거쳐야 하고, 운송완료·문제발생은 수동 관리 영역이라서)
  function computeStatusFromChecks(
    currentStatus: string,
    pickupConfirmed: boolean,
    deliveryConfirmed: boolean
  ) {
    if (["접수중", "운송완료", "문제발생"].includes(currentStatus)) return currentStatus;
    if (deliveryConfirmed) return "하차완료";
    if (pickupConfirmed) return "상차완료";
    return currentStatus;
  }

  // "변경사항 저장" 버튼을 따로 눌러야만 반영되던 게 불편하다는 피드백에 따라,
  // 체크박스는 클릭 즉시 저장 + 배차상태·운송오더 상태까지 바로 반영되게 함
  // (다른 필드들처럼 배치 저장에 묶어두지 않음 — 단순 상태 토글이라 원칙 28번
  // 낙관적 잠금 예외에 해당, handleStatusChange와 동일한 방식)
  async function handleProgressCheck(field: "pickup_confirmed" | "delivery_confirmed", checked: boolean) {
    setError(null);
    const updatedPickup = field === "pickup_confirmed" ? checked : editForm.pickup_confirmed;
    const updatedDelivery = field === "delivery_confirmed" ? checked : editForm.delivery_confirmed;
    const nextStatus = computeStatusFromChecks(dispatch.dispatch_status, updatedPickup, updatedDelivery);
    const prevStatus = dispatch.dispatch_status;

    setEditForm((f) => ({ ...f, [field]: checked }));

    const payload: Record<string, any> = {
      [field]: checked,
      updated_by: await getCurrentStaffId(),
    };
    if (nextStatus !== prevStatus) {
      payload.dispatch_status = nextStatus;
    }

    const { error } = await supabase.from("dispatches").update(payload).eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }

    if (nextStatus !== prevStatus && dispatch?.orders?.id && DISPATCH_TO_ORDER_STATUS[nextStatus]) {
      await supabase
        .from("orders")
        .update({ status: DISPATCH_TO_ORDER_STATUS[nextStatus] })
        .eq("id", dispatch.orders.id);
    }

    if (nextStatus !== prevStatus) {
      const smsPreviewResult = await fetchDispatchSmsPreview(id, nextStatus);
      if (smsPreviewResult) setSmsPreview(smsPreviewResult);
    }

    // updated_at을 DB 기준으로 다시 받아와야 함 — 부분 병합만 하고 넘어가면
    // 로컬 updated_at이 옛날 값 그대로 남아서, 바로 이어서 "변경사항 저장"을
    // 누를 때 낙관적 잠금이 "다른 직원이 방금 수정함"으로 잘못 판단하는 버그가 있었음
    load();
  }

  async function handleSave(force = false) {
    setSaving(true);
    setError(null);
    setConflict(false);
    if (editForm.brokerage_fee && Number(editForm.brokerage_fee) < 0) {
      setSaving(false);
      setError("주선수수료는 음수로 입력할 수 없습니다.");
      return;
    }
    if (editForm.driver_direct_collection_amount && Number(editForm.driver_direct_collection_amount) < 0) {
      setSaving(false);
      setError("차주 직접수금액은 음수로 입력할 수 없습니다.");
      return;
    }
    const payload = {
      customer_charge: editForm.customer_charge
        ? Number(editForm.customer_charge)
        : null,
      driver_payout: editForm.driver_payout
        ? Number(editForm.driver_payout)
        : null,
      total_freight_amount: editForm.total_freight_amount
        ? Number(editForm.total_freight_amount)
        : editForm.customer_charge
        ? Number(editForm.customer_charge)
        : null,
      pickup_confirmed: editForm.pickup_confirmed,
      delivery_confirmed: editForm.delivery_confirmed,
      issue_occurred: editForm.issue_occurred,
      issue_notes: editForm.issue_notes || null,
      memo: editForm.memo || null,
      assignment_type: editForm.assignment_type,
      driver_id: editForm.assignment_type === "internal" ? editForm.driver_id : null,
      requested_network_ids: editForm.requested_network_ids,
      network_settlement_type: editForm.network_settlement_type,
      ...(settlementValue.collection_method === "driver_direct"
        ? {
            driver_direct_collection_amount: editForm.driver_direct_collection_amount
              ? Number(editForm.driver_direct_collection_amount)
              : null,
            brokerage_fee:
              editForm.brokerage_fee_payer === "waived" ? 0 : editForm.brokerage_fee ? Number(editForm.brokerage_fee) : null,
            brokerage_fee_payer: editForm.brokerage_fee_payer || null,
          }
        : {}),
      updated_by: await getCurrentStaffId(),
    };

    if (force) {
      const { error } = await supabase.from("dispatches").update(payload).eq("id", id);
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/admin/dispatches");
      return;
    }

    const { conflict: hasConflict, error } = await optimisticUpdate(
      "dispatches",
      id,
      payload,
      dispatch?.updated_at
    );
    setSaving(false);
    if (error) {
      setError(error);
      return;
    }
    if (hasConflict) {
      setConflict(true);
      return;
    }
    router.push("/admin/dispatches");
  }

  async function handleDelete() {
    if (!dispatch) return;
    const confirmed = window.confirm(
      "이 배차 기록을 삭제하시겠습니까? 연결된 오더는 '접수' 상태로 되돌아갑니다."
    );
    if (!confirmed) return;
    setDeleting(true);
    const res = await fetch("/api/admin/delete-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "dispatches", id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleting(false);
      setError(data.error || "삭제에 실패했습니다.");
      return;
    }
    if (dispatch.orders?.id) {
      await supabase
        .from("orders")
        .update({ status: "접수" })
        .eq("id", dispatch.orders.id);
    }
    // 삭제되는 배차가 "운송완료" 상태였다면, 차주의 누적 운송건수도 함께 차감합니다.
    if (dispatch.dispatch_status === "운송완료" && dispatch.drivers?.id) {
      await adjustDriverTripCount(dispatch.drivers.id, -1);
    }
    setDeleting(false);
    router.push("/admin/dispatches");
  }

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  if (error || !dispatch) {
    return (
      <main className="container">
        <div className="error-box">배차 정보를 불러오지 못했습니다. {error}</div>
        <Link href="/admin/dispatches" className="btn btn-ghost">
          ← 목록으로
        </Link>
      </main>
    );
  }

  const statusColor = getDispatchStatusColor(dispatch.dispatch_status);
  // 혼적 할인은 이미 견적 단계 최종금액에 반영되어 있으므로, 마진 계산은
  // 별도 변환 없이 화주 청구운임을 그대로 사용한다. 화주 청구운임은
  // 공급가액이고 차주 지급운임은 실제 지급되는 최종금액(부가세 포함
  // 기준)이라 기준이 달랐던 것을 부가세 포함가로 맞춰서 계산(PR #63
  // 리뷰 피드백, 정산관리 "수수료(마진)"과 동일한 계산식으로 통일)
  const margin =
    editForm.customer_charge && editForm.driver_payout
      ? calcInclusiveAmount(Number(editForm.customer_charge)) - Number(editForm.driver_payout)
      : null;

  return (
    <main className="container">
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/admin/dispatches"
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          ← 배차 목록으로
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {dispatch.orders?.order_no || "배차 상세"}
            {dispatch.orders?.loading_type === "mixable" && <MixableBadge />}
          </h1>
          <p className="page-desc">
            {dispatch.orders?.origin} → {dispatch.orders?.destination}
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn-danger"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: "9px 16px",
              borderRadius: "var(--radius)",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {deleting ? "확인 중..." : "배차 삭제"}
          </button>
        )}
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
            배차상태
          </div>
          {dispatch.dispatch_status === "접수중" ? (
            <span
              style={{
                display: "inline-block",
                fontWeight: 600,
                padding: "5px 10px",
                borderRadius: 999,
                background: statusColor.bg,
                color: statusColor.text,
              }}
            >
              접수중
            </span>
          ) : (
            <select
              value={dispatch.dispatch_status}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{
                fontWeight: 600,
                padding: "5px 10px",
                borderRadius: 999,
                border: "none",
                background: statusColor.bg,
                color: statusColor.text,
              }}
            >
              {DISPATCH_STATUS_OPTIONS.filter((s) => s !== "접수중").map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        {dispatch.orders?.id && (
          <div style={{ marginBottom: 14 }}>
            <Link href={`/admin/orders/${dispatch.orders.id}`} style={{ fontSize: 12.5, textDecoration: "underline" }}>
              연결된 운송오더 보기 →
            </Link>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
                정산방식
              </div>
              {dispatch.dispatch_status === "접수중" ? (
                <div style={{ maxWidth: 420 }}>
                  <CollectionMethodInput
                    namePrefix="dispatch_settlement"
                    value={settlementValue}
                    onChange={(next) => handleSettlementFieldsChange(next, null)}
                  />
                </div>
              ) : (
                <span className="badge">
                  {getSettlementDisplayLabel(dispatch.collection_method, dispatch.billing_cycle)}
                  {getPaymentConditionLabel(dispatch.direct_collection_point) && (
                    <> · {getPaymentConditionLabel(dispatch.direct_collection_point)}</>
                  )}
                </span>
              )}
            </div>
            {dispatch.dispatch_status !== "접수중" && (
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }}
                onClick={() => setSettlementModalOpen(true)}
              >
                정산방식 변경
              </button>
            )}
          </div>
          {dispatch.dispatch_status !== "접수중" && (
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
              배차확정 이후라 정산방식을 바꾸려면 사유를 입력해야 합니다.
            </p>
          )}
        </div>

        {settlementModalOpen && (
          <SettlementFieldsChangeModal
            currentValue={settlementValue}
            onCancel={() => setSettlementModalOpen(false)}
            onConfirm={(next, reason) => handleSettlementFieldsChange(next, reason)}
            saving={settlementSaving}
          />
        )}

        {dispatch.dispatch_status === "접수중" ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 6 }}>
                배정방식
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className={editForm.assignment_type === "external" ? "btn" : "btn btn-ghost"}
                  style={{ fontSize: 12.5, padding: "7px 12px" }}
                  onClick={() => handleAssignmentTypeChange("external")}
                >
                  외부정보망
                </button>
                <button
                  type="button"
                  className={editForm.assignment_type === "internal" ? "btn" : "btn btn-ghost"}
                  style={{ fontSize: 12.5, padding: "7px 12px" }}
                  onClick={() => handleAssignmentTypeChange("internal")}
                >
                  내부차주
                </button>
              </div>
            </div>

            {editForm.assignment_type === "internal" ? (
              <div className="field" style={{ marginBottom: 14 }}>
                <label>배정할 차주</label>
                <input
                  value={selectedDriverInfo ? selectedDriverInfo.name : driverSearch}
                  onChange={(e) => {
                    setSelectedDriverInfo(null);
                    setEditForm((f) => ({ ...f, driver_id: null }));
                    setDriverSearch(e.target.value);
                  }}
                  placeholder="이름으로 검색"
                />
                {!selectedDriverInfo && driverResults.length > 0 && (
                  <div className="card" style={{ marginTop: 6, maxHeight: 160, overflowY: "auto" }}>
                    {driverResults.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setSelectedDriverInfo(d);
                          setEditForm((f) => ({ ...f, driver_id: d.id }));
                          setDriverResults([]);
                        }}
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          cursor: "pointer",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {d.name}{" "}
                        <span style={{ color: "var(--text-muted)" }}>
                          {d.vehicles?.[0]?.vehicle_number || ""} {d.vehicles?.[0]?.vehicle_type || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="field" style={{ marginBottom: 14 }}>
                <label>후보 정보망 (여러 곳 선택 가능)</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {networks.filter((n) => n.is_active).map((n) => (
                    <label
                      key={n.id}
                      className="badge"
                      style={{
                        cursor: "pointer",
                        border: editForm.requested_network_ids.includes(n.id)
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border)",
                        background: editForm.requested_network_ids.includes(n.id)
                          ? "var(--accent-soft)"
                          : "var(--surface)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editForm.requested_network_ids.includes(n.id)}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            requested_network_ids: e.target.checked
                              ? [...f.requested_network_ids, n.id]
                              : f.requested_network_ids.filter((id) => id !== n.id),
                          }))
                        }
                        style={{ margin: 0 }}
                      />
                      {n.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16 }}>
              <h4 style={{ fontSize: 13.5, marginTop: 0, marginBottom: 10 }}>배차확정</h4>
              {editForm.assignment_type === "internal" ? (
                <div>
                  <p style={{ fontSize: 13, marginBottom: 10 }}>
                    선택된 차주:{" "}
                    {selectedDriverInfo ? (
                      <strong>
                        {selectedDriverInfo.name} ({selectedDriverInfo.phone || "연락처 미상"})
                      </strong>
                    ) : (
                      "아직 선택되지 않았습니다"
                    )}
                  </p>
                  <button className="btn" onClick={handleConfirm} disabled={!editForm.driver_id || confirming}>
                    {confirming ? "확정 중..." : "배차확정"}
                  </button>
                </div>
              ) : (
                <div className="form-grid" style={{ padding: 0 }}>
                  <div className="field">
                    <label>실제로 확정된 정보망</label>
                    <select value={confirmedNetworkId} onChange={(e) => setConfirmedNetworkId(e.target.value)}>
                      <option value="">선택</option>
                      {editForm.requested_network_ids.map((nid) => (
                        <option key={nid} value={nid}>
                          {networkNameById[nid] || nid}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>배정된 차주 이름</label>
                    <input value={externalDriverName} onChange={(e) => setExternalDriverName(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>배정된 차주 연락처</label>
                    <input
                      value={externalDriverPhone}
                      onChange={(e) => setExternalDriverPhone(formatPhoneNumber(e.target.value))}
                    />
                  </div>
                  <div className="field">
                    <label>차량번호</label>
                    <input value={externalVehiclePlate} onChange={(e) => setExternalVehiclePlate(e.target.value)} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <button className="btn" onClick={handleConfirm} disabled={confirming}>
                      {confirming ? "확정 중..." : "배차확정"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            {dispatch.assignment_type === "external" ? (
              <>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>배정 정보망</div>
                  <div style={{ fontSize: 13.5 }}>
                    {dispatch.confirmed_network_id ? networkNameById[dispatch.confirmed_network_id] || "-" : "-"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차주</div>
                  <div style={{ fontSize: 13.5 }}>{dispatch.external_driver_name || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차주 연락처</div>
                  <div style={{ fontSize: 13.5 }}>{dispatch.external_driver_phone || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차량번호</div>
                  <div style={{ fontSize: 13.5 }}>{dispatch.external_vehicle_plate || "-"}</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차주</div>
                  <div style={{ fontSize: 13.5 }}>
                    {dispatch.drivers ? (
                      <Link href={`/admin/drivers/${dispatch.drivers.id}`} style={{ textDecoration: "underline" }}>
                        {dispatch.drivers.name}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차주 연락처</div>
                  <div style={{ fontSize: 13.5 }}>{dispatch.drivers?.phone || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차량</div>
                  <div style={{ fontSize: 13.5 }}>
                    {dispatch.drivers?.vehicles?.[0]?.vehicle_number || "-"}{" "}
                    {dispatch.drivers?.vehicles?.[0]?.vehicle_type || ""}
                  </div>
                </div>
              </>
            )}
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>품목</div>
              <div style={{ fontSize: 13.5 }}>{dispatch.orders?.item || "-"}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          정산 정보
        </h3>

        <div className="form-grid" style={{ padding: 0, marginBottom: 10 }}>
          <div className="field">
            <label>화주 청구금액(공급가액, 원)</label>
            <MoneyInput
              value={String(editForm.customer_charge)}
              onChange={(v) => setEditForm({ ...editForm, customer_charge: v })}
            />
          </div>
          <div className="field">
            <label>차주 지급운임(원)</label>
            <MoneyInput
              value={String(editForm.driver_payout)}
              onChange={(v) => setEditForm({ ...editForm, driver_payout: v })}
            />
          </div>
        </div>
        <p style={{ fontSize: 13.5, fontWeight: 600 }}>
          단순마진(참고): {margin !== null ? won(margin) : "-"}
        </p>

        <div className="field" style={{ maxWidth: 320, marginBottom: 14 }}>
          <label>정보망 정산방식 (내부 운영 전용, 화주포털 비노출)</label>
          <select
            value={editForm.network_settlement_type}
            onChange={(e) => setEditForm({ ...editForm, network_settlement_type: e.target.value })}
          >
            {Object.entries(NETWORK_SETTLEMENT_TYPE_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {settlementValue.collection_method === "driver_direct" && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginBottom: 14 }}>
            <h4 style={{ fontSize: 13, marginTop: 0, marginBottom: 10 }}>선착불 정산 정보</h4>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 0, marginBottom: 10 }}>
              선착불 건은 화주 청구금액(WeCarry 실수금액)이 0이 될 수 있어, 전체 운송료를
              별도로 입력해주세요.
            </p>
            <div className="form-grid" style={{ padding: 0, marginBottom: 10 }}>
              <div className="field">
                <label>전체 운송료(원)</label>
                <MoneyInput
                  value={editForm.total_freight_amount}
                  onChange={(v) => setEditForm({ ...editForm, total_freight_amount: v })}
                />
              </div>
              <div className="field">
                <label>차주 직접수금액(공급가액, 원)</label>
                <MoneyInput
                  value={editForm.driver_direct_collection_amount}
                  onChange={(v) => setEditForm({ ...editForm, driver_direct_collection_amount: v })}
                />
              </div>
              <div className="field">
                <label>주선수수료(공급가액, 원)</label>
                <MoneyInput
                  value={editForm.brokerage_fee_payer === "waived" ? "0" : editForm.brokerage_fee}
                  onChange={(v) => setEditForm({ ...editForm, brokerage_fee: v })}
                  disabled={editForm.brokerage_fee_payer === "waived"}
                />
                {editForm.brokerage_fee && Number(editForm.brokerage_fee) > 0 && editForm.brokerage_fee_payer !== "waived" && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
                    부가세 {won(calcVatAmount(Number(editForm.brokerage_fee)))} · 부가세 포함{" "}
                    {won(calcInclusiveAmount(Number(editForm.brokerage_fee)))}
                  </p>
                )}
              </div>
              <div className="field">
                <label>수수료 지급자</label>
                <select
                  value={editForm.brokerage_fee_payer}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      brokerage_fee_payer: e.target.value,
                      brokerage_fee: e.target.value === "waived" ? "0" : editForm.brokerage_fee,
                    })
                  }
                >
                  <option value="">선택</option>
                  {Object.entries(BROKERAGE_FEE_PAYER_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {dispatch.dispatch_status !== "접수중" && (
          <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <button
              type="button"
              onClick={() => setPayoutCalcOpen((v) => !v)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              <span>{payoutCalcOpen ? "▲" : "▼"}</span>
              차주 운임 상세 계산 (부가세·산재보험료)
            </button>

            {payoutCalcOpen && (
              <div style={{ marginTop: 12 }}>
                <div className="form-grid" style={{ padding: 0, marginBottom: 10 }}>
                  <div className="field">
                    <label>차주 기본운임(공급가액, 원)</label>
                    <MoneyInput
                      value={payoutCalcForm.driver_base_fare}
                      onChange={(v) => setPayoutCalcForm({ ...payoutCalcForm, driver_base_fare: v })}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 20, marginBottom: 10, fontSize: 13 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={payoutCalcForm.industrial_insurance_applicable}
                      onChange={(e) =>
                        setPayoutCalcForm({
                          ...payoutCalcForm,
                          industrial_insurance_applicable: e.target.checked,
                        })
                      }
                    />
                    산재보험료 적용대상
                  </label>
                </div>

                {(() => {
                  const preview = calcSettlement({
                    driverBaseFare: Number(payoutCalcForm.driver_base_fare) || 0,
                    industrialInsuranceApplicable: payoutCalcForm.industrial_insurance_applicable,
                    customerCharge: Number(editForm.customer_charge) || 0,
                    rateSettings: {
                      expenseDeductionRate: rateSettings.expense_deduction_rate,
                      insuranceRateTotal: rateSettings.insurance_rate_total,
                    },
                  });
                  return (
                    <div
                      style={{
                        background: "var(--bg)",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 10,
                        fontSize: 13,
                      }}
                    >
                      {payoutCalcForm.industrial_insurance_applicable && (
                        <>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                            월보수액(참고): {won(preview.industrialInsuranceBaseAmount)} · 적용요율:{" "}
                            {rateSettings.insurance_rate_total}% (필요경비공제율{" "}
                            {rateSettings.expense_deduction_rate}%, 관리자 설정값)
                          </div>
                          <div>차주부담 산재보험료: {won(preview.industrialInsuranceDriverShare)}</div>
                          <div>주선사부담 산재보험료: {won(preview.industrialInsuranceBrokerShare)}</div>
                        </>
                      )}
                      <div style={{ fontWeight: 700, marginTop: 4 }}>
                        차주 최종 수금액(부가세 포함): {won(preview.driverTotalPayout)}
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: preview.realMargin < 0 ? "var(--danger)" : "var(--accent)",
                        }}
                      >
                        실질마진(정산기준): {won(preview.realMargin)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                        실제 고지 금액은 근로복지공단 고지서 기준으로 1~2원 오차가 있을 수 있습니다.
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  className="btn"
                  disabled={payoutCalcSaving}
                  onClick={handlePayoutCalcSave}
                >
                  {payoutCalcSaving ? "저장 중..." : "정산 정보 저장"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 로드맵⑤ 클레임·사고 — 사고는 상차 전(오배정 등)에도 발생할 수 있어
          다른 두 섹션보다 넓게 배차확정 이후 전체 노출(1-5 조사 결과 확정안).
          배상금은 기록만 하고 정산에 자동 반영하지 않음(결정사항 2), 화주포털
          비노출(결정사항 3) — 증빙사진은 로드맵④ 업로드 인프라 재사용 */}
      {dispatch.dispatch_status !== "접수중" && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setClaimsSectionOpen((v) => !v)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              margin: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
            }}
          >
            <h3 style={{ fontSize: 14, margin: 0 }}>클레임·사고</h3>
            {claims.length > 0 && (
              <span className="badge" style={{ fontSize: 11 }}>
                {claims.length}건
              </span>
            )}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
              {claimsSectionOpen ? "▲ 접기" : "▼ 펼치기"}
            </span>
          </button>

          {claimsSectionOpen && (
            <div style={{ marginTop: 14 }}>
          {claimError && <div className="error-box">오류: {claimError}</div>}

          <div className="form-grid" style={{ padding: 0, marginBottom: 10 }}>
            <div className="field">
              <label>유형</label>
              <select
                value={claimForm.claim_type}
                onChange={(e) => setClaimForm({ ...claimForm, claim_type: e.target.value })}
              >
                {CLAIM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {getClaimTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>책임소재</label>
              <select
                value={claimForm.responsible_party}
                onChange={(e) => setClaimForm({ ...claimForm, responsible_party: e.target.value })}
              >
                <option value="">미정</option>
                {RESPONSIBLE_PARTIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>발생일시(선택, 모르면 비워둠)</label>
              <input
                type="datetime-local"
                value={claimForm.occurred_at}
                onChange={(e) => setClaimForm({ ...claimForm, occurred_at: e.target.value })}
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>내용 *</label>
              <textarea
                rows={2}
                value={claimForm.description}
                onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
              />
            </div>
            <div className="field">
              <label>청구액(화주 등이 청구한 피해액, 원)</label>
              <MoneyInput
                value={claimForm.claim_amount}
                onChange={(v) => setClaimForm({ ...claimForm, claim_amount: v })}
              />
            </div>
            <div className="field">
              <label>배상액(실제 합의·지급액, 원)</label>
              <MoneyInput
                value={claimForm.compensation_amount}
                onChange={(v) => setClaimForm({ ...claimForm, compensation_amount: v })}
              />
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                정산 자동 반영 안 됨 — 필요 시 정산관리에서 별도 처리
              </p>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>메모</label>
              <input
                type="text"
                value={claimForm.memo}
                onChange={(e) => setClaimForm({ ...claimForm, memo: e.target.value })}
              />
            </div>
          </div>
          <button className="btn" onClick={handleRegisterClaim} disabled={claimSaving}>
            {claimSaving ? "등록 중..." : "클레임 등록"}
          </button>

          <div style={{ marginTop: 16 }}>
            {claims.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>등록된 클레임이 없습니다.</p>
            ) : (
              claims.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: 14,
                    marginBottom: 10,
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="badge">{getClaimTypeLabel(c.claim_type)}</span>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background: getClaimStatusColor(c.status).bg,
                          color: getClaimStatusColor(c.status).text,
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <select
                      value={c.status}
                      disabled={!!claimStatusSaving[c.id]}
                      onChange={(e) => handleUpdateClaimStatus(c.id, e.target.value)}
                      style={{ fontSize: 12 }}
                    >
                      {CLAIM_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p style={{ fontSize: 13, marginBottom: 6, whiteSpace: "pre-wrap" }}>{c.description}</p>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                    {c.occurred_at && <>발생: {new Date(c.occurred_at).toLocaleString("ko-KR")} · </>}
                    접수: {new Date(c.reported_at).toLocaleString("ko-KR")}
                    {c.responsible_party && <> · 책임소재: {c.responsible_party}</>}
                  </div>
                  {(c.claim_amount != null || c.compensation_amount != null) && (
                    <div style={{ fontSize: 12.5, marginBottom: 6 }}>
                      {c.claim_amount != null && <>청구액 {won(c.claim_amount)} </>}
                      {c.compensation_amount != null && <>· 배상액 {won(c.compensation_amount)}</>}
                      <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>(정산 자동 반영 안 됨)</span>
                    </div>
                  )}
                  {c.memo && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>메모: {c.memo}</p>
                  )}

                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>증빙사진</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        ({(claimPhotosByClaimId[c.id] || []).length}/10)
                      </span>
                      <label
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: "3px 8px", cursor: "pointer" }}
                      >
                        {claimPhotoUploading[c.id] ? "업로드 중..." : "파일 선택"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                          multiple
                          style={{ display: "none" }}
                          disabled={!!claimPhotoUploading[c.id]}
                          onChange={(e) => {
                            handleUploadClaimPhotos(c.id, e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {(claimPhotosByClaimId[c.id] || []).length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(claimPhotosByClaimId[c.id] || []).map((p) => (
                          <div
                            key={p.id}
                            style={{
                              width: 88,
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              padding: 4,
                              fontSize: 10.5,
                            }}
                          >
                            {photoPreviewUrls[p.id] ? (
                              <img
                                src={photoPreviewUrls[p.id]}
                                alt=""
                                onClick={() => setViewingPhotoUrl(photoPreviewUrls[p.id])}
                                style={{
                                  width: "100%",
                                  height: 66,
                                  objectFit: "cover",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                }}
                              />
                            ) : (
                              <div
                                onClick={() => handleViewPhoto(p.id)}
                                style={{
                                  width: "100%",
                                  height: 66,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "var(--bg-subtle, #f4f5f7)",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  fontSize: 20,
                                }}
                              >
                                📄
                              </div>
                            )}
                            {isAdmin &&
                              (deletingPhotoId === p.id ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                                  <input
                                    type="text"
                                    value={photoDeleteReasonInput}
                                    onChange={(e) => setPhotoDeleteReasonInput(e.target.value)}
                                    placeholder="삭제 사유"
                                    style={{ fontSize: 10, width: "100%" }}
                                  />
                                  <div style={{ display: "flex", gap: 4 }}>
                                    <button
                                      className="btn-danger"
                                      style={{ fontSize: 10, padding: "2px 4px", flex: 1 }}
                                      onClick={() => handleConfirmDeletePhoto(p.id)}
                                    >
                                      확인
                                    </button>
                                    <button
                                      className="btn btn-ghost"
                                      style={{ fontSize: 10, padding: "2px 4px", flex: 1 }}
                                      onClick={() => {
                                        setDeletingPhotoId(null);
                                        setPhotoDeleteReasonInput("");
                                      }}
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  className="btn btn-ghost"
                                  style={{ fontSize: 10, padding: "2px 4px", width: "100%", marginTop: 4 }}
                                  onClick={() => {
                                    setDeletingPhotoId(p.id);
                                    setPhotoDeleteReasonInput("");
                                  }}
                                >
                                  삭제
                                </button>
                              ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                    {c.created_by_name_snapshot || "-"} · {String(c.created_at).slice(0, 10)}
                    {c.resolved_at && <> · 종결: {String(c.resolved_at).slice(0, 10)}</>}
                  </div>
                </div>
              ))
            )}
          </div>
            </div>
          )}
        </div>
      )}

      {/* 로드맵③ 현장 추가비 — 운송 진행/완료 후 현장에서 추가로 발생하는
          비용(대기료·회차비 등). 1-4 조사 결과, 배차확정 직후(아직 상차 전)엔
          이 개념 자체가 발생할 수 없어 "차주 운임 상세 계산" 섹션(배차확정
          이상 노출)보다 좁게, 상차완료 이상부터만 노출 */}
      {["상차완료", "하차완료", "운송완료", "문제발생"].includes(dispatch.dispatch_status) && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setExtraChargeSectionOpen((v) => !v)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              margin: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
            }}
          >
            <h3 style={{ fontSize: 14, margin: 0 }}>현장 추가비</h3>
            {extraCharges.filter((c) => c.status === "active").length > 0 && (
              <span className="badge" style={{ fontSize: 11 }}>
                {extraCharges.filter((c) => c.status === "active").length}건
              </span>
            )}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
              {extraChargeSectionOpen ? "▲ 접기" : "▼ 펼치기"}
            </span>
          </button>

          {extraChargeSectionOpen && (
            <div style={{ marginTop: 14 }}>
          {extraChargeError && <div className="error-box">오류: {extraChargeError}</div>}

          <div className="form-grid" style={{ padding: 0, marginBottom: 10 }}>
            <div className="field">
              <label>항목</label>
              <select
                value={extraChargeForm.category}
                onChange={(e) => setExtraChargeForm({ ...extraChargeForm, category: e.target.value })}
              >
                {DISPATCH_EXTRA_CHARGE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {getDispatchExtraChargeCategoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>화주 청구액(공급가액, 원)</label>
              <MoneyInput
                value={extraChargeForm.customer_charge_amount}
                onChange={(v) => setExtraChargeForm({ ...extraChargeForm, customer_charge_amount: v })}
              />
            </div>
            <div className="field">
              <label>차주 지급액(부가세 포함, 원)</label>
              <MoneyInput
                value={extraChargeForm.driver_payout_amount}
                onChange={(v) => setExtraChargeForm({ ...extraChargeForm, driver_payout_amount: v })}
              />
            </div>
            <div className="field">
              <label>메모{extraChargeForm.category === "other" && " *"}</label>
              <input
                type="text"
                value={extraChargeForm.note}
                onChange={(e) => setExtraChargeForm({ ...extraChargeForm, note: e.target.value })}
                placeholder={extraChargeForm.category === "other" ? "사유를 입력해주세요" : "선택 입력"}
              />
            </div>
          </div>
          <button className="btn" onClick={handleRegisterExtraCharge} disabled={extraChargeSaving}>
            {extraChargeSaving ? "등록 중..." : "추가"}
          </button>

          <div style={{ marginTop: 16 }}>
            {extraCharges.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>등록된 현장 추가비가 없습니다.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>항목</th>
                    <th>화주 청구액</th>
                    <th>차주 지급액</th>
                    <th>메모</th>
                    <th>등록</th>
                    <th>상태</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {extraCharges.map((c) => (
                    <tr key={c.id} style={c.status === "cancelled" ? { opacity: 0.55 } : undefined}>
                      <td>{getDispatchExtraChargeCategoryLabel(c.category)}</td>
                      <td>{won(c.customer_charge_amount)}</td>
                      <td>{won(c.driver_payout_amount)}</td>
                      <td style={{ maxWidth: 160, whiteSpace: "normal" }}>{c.note || "-"}</td>
                      <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                        {c.created_by_name_snapshot || "-"}
                        <br />
                        {String(c.created_at).slice(0, 10)}
                      </td>
                      <td>
                        {c.status === "cancelled" ? (
                          <span className="badge">취소됨</span>
                        ) : c.correction_invoice_id ? (
                          <span className="badge">정정청구 생성됨</span>
                        ) : (
                          <span className="badge">등록됨</span>
                        )}
                      </td>
                      <td>
                        {c.status === "active" && !c.correction_invoice_id && (
                          cancellingExtraChargeId === c.id ? (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <input
                                type="text"
                                value={cancelReasonInput}
                                onChange={(e) => setCancelReasonInput(e.target.value)}
                                placeholder="취소 사유"
                                style={{ width: 120, fontSize: 12 }}
                              />
                              <button
                                className="btn-danger"
                                style={{ fontSize: 11.5, padding: "4px 8px" }}
                                onClick={() => handleCancelExtraCharge(c.id)}
                              >
                                확인
                              </button>
                              <button
                                className="btn btn-ghost"
                                style={{ fontSize: 11.5, padding: "4px 8px" }}
                                onClick={() => {
                                  setCancellingExtraChargeId(null);
                                  setCancelReasonInput("");
                                }}
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: 11.5, padding: "4px 8px" }}
                              onClick={() => {
                                setCancellingExtraChargeId(c.id);
                                setCancelReasonInput("");
                              }}
                            >
                              취소
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {extraCharges.some((c) => c.status === "active") && (
              <p style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>
                합계: 화주 청구{" "}
                {won(extraCharges.filter((c) => c.status === "active").reduce((s, c) => s + (c.customer_charge_amount || 0), 0))}{" "}
                · 차주 지급{" "}
                {won(extraCharges.filter((c) => c.status === "active").reduce((s, c) => s + (c.driver_payout_amount || 0), 0))}
              </p>
            )}
          </div>
            </div>
          )}
        </div>
      )}

      {/* 로드맵④ POD·인수증 — 하차가 실제로 끝난 게 확인된 건만 노출
          (isDispatchReadyForPhotoUpload: 하차완료·운송완료, 또는 하차확인된 문제발생) */}
      {isDispatchReadyForPhotoUpload(dispatch.dispatch_status, dispatch.delivery_confirmed) && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
            POD·인수증
          </h3>
          {photoError && <div className="error-box">오류: {photoError}</div>}

          {/* 이 섹션은 dropoff/pod만 다룸('claim'은 위 "클레임·사고" 섹션에서
              별도 관리) — DISPATCH_PHOTO_CATEGORIES 전체를 순회하면 photos
              state에 없는 'claim' 키에 접근해 런타임 에러가 남(PR #67 리뷰에서
              발견된 회귀) */}
          {(["dropoff", "pod"] as const).map((category) => (
            <div key={category} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>{getDispatchPhotoCategoryLabel(category)}</strong>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  ({photos[category].length}/10)
                </span>
                <label className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px", cursor: "pointer" }}>
                  {photoUploading[category] ? "업로드 중..." : "파일 선택"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    multiple
                    style={{ display: "none" }}
                    disabled={!!photoUploading[category]}
                    onChange={(e) => {
                      handleUploadPhotos(category, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {photos[category].length === 0 ? (
                <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>등록된 사진이 없습니다.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {photos[category].map((p) => (
                    <div
                      key={p.id}
                      style={{
                        width: 120,
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: 6,
                        fontSize: 11.5,
                      }}
                    >
                      {photoPreviewUrls[p.id] ? (
                        <img
                          src={photoPreviewUrls[p.id]}
                          alt={p.original_filename || ""}
                          onClick={() => setViewingPhotoUrl(photoPreviewUrls[p.id])}
                          style={{
                            width: "100%",
                            height: 90,
                            objectFit: "cover",
                            borderRadius: 4,
                            cursor: "pointer",
                            marginBottom: 4,
                          }}
                        />
                      ) : (
                        <div
                          onClick={() => handleViewPhoto(p.id)}
                          style={{
                            width: "100%",
                            height: 90,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "var(--bg-subtle, #f4f5f7)",
                            borderRadius: 4,
                            cursor: "pointer",
                            marginBottom: 4,
                            fontSize: 24,
                          }}
                        >
                          📄
                        </div>
                      )}
                      <div
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginBottom: 2,
                        }}
                        title={p.original_filename || ""}
                      >
                        {p.original_filename || "-"}
                      </div>
                      <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>
                        {String(p.uploaded_at).slice(0, 10)}
                      </div>
                      {isAdmin &&
                        (deletingPhotoId === p.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <input
                              type="text"
                              value={photoDeleteReasonInput}
                              onChange={(e) => setPhotoDeleteReasonInput(e.target.value)}
                              placeholder="삭제 사유"
                              style={{ fontSize: 11, width: "100%" }}
                            />
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                className="btn-danger"
                                style={{ fontSize: 11, padding: "3px 6px", flex: 1 }}
                                onClick={() => handleConfirmDeletePhoto(p.id)}
                              >
                                확인
                              </button>
                              <button
                                className="btn btn-ghost"
                                style={{ fontSize: 11, padding: "3px 6px", flex: 1 }}
                                onClick={() => {
                                  setDeletingPhotoId(null);
                                  setPhotoDeleteReasonInput("");
                                }}
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: 11, padding: "3px 6px", width: "100%" }}
                            onClick={() => {
                              setDeletingPhotoId(p.id);
                              setPhotoDeleteReasonInput("");
                            }}
                          >
                            삭제
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            업로드는 선택사항입니다. 파일당 최대 10MB, JPEG/PNG/WebP/HEIC/HEIF만 가능(카테고리당 최대 10장).
          </p>
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          진행 체크
        </h3>
        <div style={{ display: "flex", gap: 20, marginBottom: 14, fontSize: 13 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={editForm.pickup_confirmed}
              onChange={(e) => handleProgressCheck("pickup_confirmed", e.target.checked)}
            />
            상차 완료 확인
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={editForm.delivery_confirmed}
              onChange={(e) => handleProgressCheck("delivery_confirmed", e.target.checked)}
            />
            하차 완료 확인
          </label>
          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              color: "var(--danger)",
            }}
          >
            <input
              type="checkbox"
              checked={editForm.issue_occurred}
              onChange={(e) =>
                setEditForm({ ...editForm, issue_occurred: e.target.checked })
              }
            />
            문제 발생
          </label>
        </div>
        {editForm.issue_occurred && (
          <div className="field" style={{ marginBottom: 14 }}>
            <label>문제 상세 내용</label>
            <textarea
              rows={2}
              value={editForm.issue_notes}
              onChange={(e) =>
                setEditForm({ ...editForm, issue_notes: e.target.value })
              }
            />
          </div>
        )}
        <div className="field">
          <label>배차 메모</label>
          <textarea
            rows={2}
            value={editForm.memo}
            onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
          />
        </div>
      </div>

      {conflict && (
        <ConflictWarning
          onReload={() => {
            setConflict(false);
            load();
          }}
          onForceSave={() => handleSave(true)}
          saving={saving}
        />
      )}

      <button className="btn" onClick={() => handleSave()} disabled={saving}>
        {saving ? "저장 중..." : "변경사항 저장"}
      </button>

      <SmsLogPanel relatedType="dispatch" relatedId={id} />

      {smsPreview && (
        <SmsConfirmModal
          preview={smsPreview}
          onSent={() => setSmsPreview(null)}
          onSkip={() => setSmsPreview(null)}
        />
      )}

      <ProcessedByFooter
        createdBy={dispatch.created_by}
        createdAt={dispatch.created_at}
        updatedBy={dispatch.updated_by}
        updatedAt={dispatch.updated_at}
      />

      {/* POD·인수증/클레임 증빙 사진 공용 확대보기 모달 — 특정 섹션 안에 갇혀있지
          않고 항상 마운트되어 있어야 어느 섹션에서 열든 닫기 버튼이 뜸 */}
      {viewingPhotoUrl && (
        <div
          onClick={() => setViewingPhotoUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <button
            type="button"
            onClick={() => setViewingPhotoUrl(null)}
            aria-label="닫기"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
          <img
            src={viewingPhotoUrl}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 6 }}
          />
        </div>
      )}
    </main>
  );
}
