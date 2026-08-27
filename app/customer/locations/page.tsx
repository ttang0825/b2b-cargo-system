"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import Pv2AddressField from "@/components/pv2/Pv2AddressField";
import { VEHICLE_TYPES_ALL, formatPhoneNumber } from "@/lib/constants";
import { LOADING_METHOD_OPTIONS } from "@/lib/loadingMethods";
import {
  loadPresets,
  savePreset,
  deletePreset,
  cargoPresetSummary,
  type CargoPresetPayload,
  type CustomerPreset,
} from "@/lib/customerPresets";

// 🔴 컬럼 이름을 새로 만들지 말 것 — `location_name`·`notes` 가 20차에 이미 있고
//   관리자 화면 2곳(`admin/companies/[id]`·`admin/quotes`)이 `location_name` 을
//   이미 select 에 넣고 있다. `name`·`note` 를 추가하면 **같은 배송지에 이름이 둘**
//   생긴다. 마이그레이션 파일 안에 그 두 이름이 있으면 멈추는 단언이 들어 있다.
type Location = {
  id: string;
  address: string | null;
  address_detail: string | null;
  location_name: string | null;
  location_type: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  sido: string | null;
  sigungu: string | null;
};
type Surcharge = { category: string; option_name: string };
type PendingDelete = { kind: "location" | "cargo"; id: string; name: string };

const LOCATION_TYPES = ["상차지", "하차지"];

export default function PortalLocationsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [cargos, setCargos] = useState<CustomerPreset<CargoPresetPayload>[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  // 새 배송지 — 🔴 7칸이 20차 컬럼 5개 + address + location_type 에 대응한다
  const [nl, setNl] = useState({
    type: "상차지",
    name: "",
    address: "",
    detail: "",
    sido: "",
    sigungu: "",
    contactName: "",
    contactPhone: "",
    notes: "",
  });
  const [savingLoc, setSavingLoc] = useState(false);

  // 새 화물 프리셋
  const [nc, setNc] = useState({
    name: "",
    vehicle_type: VEHICLE_TYPES_ALL[0] as string,
    body_type: "",
    item: "",
    item_condition: "",
    load_condition: LOADING_METHOD_OPTIONS[0] as string,
    unload_condition: LOADING_METHOD_OPTIONS[0] as string,
  });
  const [savingCargo, setSavingCargo] = useState(false);

  function optionsOf(category: string) {
    return surcharges.filter((s) => s.category === category).map((s) => s.option_name);
  }

  async function loadLocations(cid: string) {
    const { data } = await supabase
      .from("customer_locations")
      .select(
        "id,address,address_detail,location_name,location_type,contact_name,contact_phone,notes,sido,sigungu"
      )
      .eq("company_id", cid)
      .order("created_at", { ascending: false });
    setLocations((data || []) as Location[]);
  }

  async function loadCargos(cid: string) {
    setCargos(await loadPresets<CargoPresetPayload>(supabase, cid, "cargo"));
  }

  async function loadSurcharges() {
    // 21차 — rate_surcharges 는 직원 전용이 됐다(가산 금액이 같이 들어 있어 화주에게
    // 열 수 없다, 28차 비공개 확정). 선택지 이름만 서버 API 로 받는다.
    let list: Surcharge[] = [];
    try {
      const res = await fetch("/api/customer/surcharge-options");
      const json = await res.json();
      if (res.ok) list = (json.data || []) as Surcharge[];
    } catch {
      // 목록을 못 받아도 화면은 뜨게 둔다(선택지가 비는 것으로 드러난다)
    }
    setSurcharges(list);
    setNc((prev) => ({
      ...prev,
      body_type: prev.body_type || list.find((s) => s.category === "차량형태")?.option_name || "",
      item_condition:
        prev.item_condition || list.find((s) => s.category === "물품특성")?.option_name || "",
    }));
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
        .select("company_id")
        .eq("auth_user_id", session.user.id)
        .single();
      if (account) {
        setCompanyId(account.company_id);
        await Promise.all([
          loadLocations(account.company_id),
          loadCargos(account.company_id),
          loadSurcharges(),
        ]);
      }
      setLoading(false);
    }
    init();
  }, []);

  async function handleAddLocation() {
    if (!companyId || !nl.name.trim() || !nl.address.trim()) return;
    setSavingLoc(true);
    setError(null);
    const { error: insertError } = await supabase.from("customer_locations").insert({
      company_id: companyId,
      location_name: nl.name.trim(),
      location_type: nl.type,
      address: nl.address.trim(),
      address_detail: nl.detail.trim() || null,
      contact_name: nl.contactName.trim() || null,
      contact_phone: nl.contactPhone.trim() || null,
      notes: nl.notes.trim() || null,
      sido: nl.sido || null,
      sigungu: nl.sigungu || null,
    });
    setSavingLoc(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNl({
      type: nl.type,
      name: "",
      address: "",
      detail: "",
      sido: "",
      sigungu: "",
      contactName: "",
      contactPhone: "",
      notes: "",
    });
    loadLocations(companyId);
  }

  async function handleAddCargo() {
    if (!companyId || !nc.name.trim()) return;
    setSavingCargo(true);
    setError(null);
    const payload: CargoPresetPayload = {
      vehicle_type: nc.vehicle_type || undefined,
      body_type: nc.body_type || undefined,
      item: nc.item.trim() || undefined,
      item_condition: nc.item_condition || undefined,
      load_condition: nc.load_condition || undefined,
      unload_condition: nc.unload_condition || undefined,
    };
    const { error: saveError } = await savePreset(
      supabase,
      companyId,
      "cargo",
      nc.name,
      payload as Record<string, unknown>
    );
    setSavingCargo(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setNc((prev) => ({ ...prev, name: "", item: "" }));
    loadCargos(companyId);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete || !companyId) return;
    const target = pendingDelete;
    setPendingDelete(null);
    setError(null);
    if (target.kind === "location") {
      const { error: delError } = await supabase
        .from("customer_locations")
        .delete()
        .eq("id", target.id);
      if (delError) {
        setError(delError.message);
        return;
      }
      loadLocations(companyId);
    } else {
      const { error: delError } = await deletePreset(supabase, target.id);
      if (delError) {
        setError(delError);
        return;
      }
      loadCargos(companyId);
    }
  }

  if (loading) return <div className="pv2-empty">불러오는 중...</div>;

  return (
    <>
      <div className="pv2-page-head pv2-page-head-tight">
        <h1 className="pv2-page-title">배송지·화물 관리</h1>
        <p className="pv2-page-desc">
          자주 쓰는 배송지와 화물 정보를 등록해두면 발주 요청 시 빠르게 채울 수 있습니다.
        </p>
      </div>

      {error && (
        <div className="pv2-form-block" style={{ marginBottom: 16, color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {/* ── 배송지 ───────────────────────────────────────── */}
      <div className="pv2-manage-row">
        <div className="pv2-manage-form">
          <div className="pv2-manage-form-title">새 배송지 추가</div>
          <div className="pv2-manage-fields">
            <div className="pv2-manage-type-row">
              <select
                className="pv2-select"
                value={nl.type}
                onChange={(e) => setNl({ ...nl, type: e.target.value })}
                aria-label="배송지 구분"
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className="pv2-input pv2-input-sm"
                value={nl.name}
                onChange={(e) => setNl({ ...nl, name: e.target.value })}
                placeholder="배송지 이름 (예: 가산 본사 창고) *"
                aria-label="배송지 이름"
              />
            </div>
            <Pv2AddressField
              value={nl.address}
              detailValue={nl.detail}
              onChange={(address, sido, sigungu) =>
                setNl((prev) => ({ ...prev, address, sido, sigungu, detail: sido ? "" : prev.detail }))
              }
              onDetailChange={(detail) => setNl((prev) => ({ ...prev, detail }))}
              placeholder="주소검색 또는 직접 입력 *"
              detailPlaceholder="상세주소 (선택)"
              inputClassName="pv2-input pv2-input-sm"
            />
            <div className="pv2-leg-2col">
              <input
                className="pv2-input pv2-input-sm"
                value={nl.contactName}
                onChange={(e) => setNl({ ...nl, contactName: e.target.value })}
                placeholder="담당자 이름"
                aria-label="담당자 이름"
              />
              <input
                className="pv2-input pv2-input-sm"
                value={nl.contactPhone}
                onChange={(e) => setNl({ ...nl, contactPhone: formatPhoneNumber(e.target.value) })}
                placeholder="전화번호"
                aria-label="담당자 전화번호"
              />
            </div>
            <textarea
              className="pv2-textarea pv2-input-sm"
              rows={2}
              value={nl.notes}
              onChange={(e) => setNl({ ...nl, notes: e.target.value })}
              placeholder="특이사항 (예: 지게차 상차 가능, 야간 하차 불가)"
              aria-label="특이사항"
            />
            <button
              type="button"
              className="pv2-btn-dark"
              onClick={handleAddLocation}
              disabled={savingLoc || !nl.name.trim() || !nl.address.trim()}
            >
              {savingLoc ? "추가 중..." : "추가"}
            </button>
          </div>
        </div>

        <div className="pv2-manage-list">
          <div className="pv2-list-title">
            저장된 배송지
            <span className="pv2-list-title-sub">발주 요청에서 바로 불러올 수 있습니다</span>
          </div>
          <div className="pv2-card-grid">
            {locations.length === 0 ? (
              <div className="pv2-card-empty">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/portal/wecarry-eng-cropped.svg"
                  alt=""
                  className="pv2-empty-logo"
                  style={{ width: 92 }}
                />
                <div className="pv2-card-empty-title">저장된 배송지가 없습니다</div>
                <div className="pv2-card-empty-desc">
                  왼쪽에서 자주 쓰는 상차지·하차지를 등록해보세요.
                </div>
              </div>
            ) : (
              locations.map((l) => (
                <div key={l.id} className="pv2-saved-card">
                  <div className="pv2-saved-head">
                    <span
                      className={`pv2-type-badge ${
                        l.location_type === "하차지" ? "pv2-type-dropoff" : "pv2-type-pickup"
                      }`}
                    >
                      {l.location_type || "상차지"}
                    </span>
                    {/* 🔴 20차 이전에 저장된 12행은 location_name 이 비어 있다 —
                        이름이 없으면 주소를 대신 보여준다(카드가 비어 보이지 않게). */}
                    <span className="pv2-saved-name">{l.location_name || l.address || "이름 없음"}</span>
                    <button
                      type="button"
                      className="pv2-btn-del"
                      onClick={() =>
                        setPendingDelete({
                          kind: "location",
                          id: l.id,
                          name: l.location_name || l.address || "이 배송지",
                        })
                      }
                    >
                      삭제
                    </button>
                  </div>
                  <div className="pv2-saved-addr">
                    {[l.address, l.address_detail].filter(Boolean).join(" ") || "-"}
                  </div>
                  {(l.contact_name || l.contact_phone) && (
                    <div className="pv2-saved-meta">
                      {l.contact_name && <span>담당자 {l.contact_name}</span>}
                      {l.contact_phone && <span>{l.contact_phone}</span>}
                    </div>
                  )}
                  {l.notes && <div className="pv2-note-chip">특이사항 · {l.notes}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 화물 프리셋 ──────────────────────────────────── */}
      <div className="pv2-manage-row">
        <div className="pv2-manage-form">
          <div className="pv2-manage-form-title">새 화물 추가</div>
          <div className="pv2-manage-fields">
            <input
              className="pv2-input pv2-input-sm"
              value={nc.name}
              onChange={(e) => setNc({ ...nc, name: e.target.value })}
              placeholder="화물 이름 (예: 정기 박스 출고) *"
              aria-label="화물 이름"
            />
            <div className="pv2-leg-2col">
              <select
                className="pv2-select"
                value={nc.vehicle_type}
                onChange={(e) => setNc({ ...nc, vehicle_type: e.target.value })}
                aria-label="희망 톤수"
              >
                {VEHICLE_TYPES_ALL.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                className="pv2-select"
                value={nc.body_type}
                onChange={(e) => setNc({ ...nc, body_type: e.target.value })}
                aria-label="차량형태"
              >
                {optionsOf("차량형태").map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="pv2-input pv2-input-sm"
              value={nc.item}
              onChange={(e) => setNc({ ...nc, item: e.target.value })}
              placeholder="품목 (예: 택배박스 20개)"
              aria-label="품목"
            />
            <div className="pv2-field">
              <label className="pv2-field-label" htmlFor="pv2-nc-cond">
                물품특성
              </label>
              <select
                id="pv2-nc-cond"
                className="pv2-select"
                value={nc.item_condition}
                onChange={(e) => setNc({ ...nc, item_condition: e.target.value })}
              >
                {optionsOf("물품특성").map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="pv2-leg-2col">
              <div className="pv2-field">
                <label className="pv2-field-label" htmlFor="pv2-nc-load">
                  상차조건
                </label>
                <select
                  id="pv2-nc-load"
                  className="pv2-select"
                  value={nc.load_condition}
                  onChange={(e) => setNc({ ...nc, load_condition: e.target.value })}
                >
                  {LOADING_METHOD_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pv2-field">
                <label className="pv2-field-label" htmlFor="pv2-nc-unload">
                  하차조건
                </label>
                <select
                  id="pv2-nc-unload"
                  className="pv2-select"
                  value={nc.unload_condition}
                  onChange={(e) => setNc({ ...nc, unload_condition: e.target.value })}
                >
                  {LOADING_METHOD_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              className="pv2-btn-dark"
              onClick={handleAddCargo}
              disabled={savingCargo || !nc.name.trim()}
            >
              {savingCargo ? "추가 중..." : "추가"}
            </button>
          </div>
        </div>

        <div className="pv2-manage-list">
          <div className="pv2-list-title">
            자주 쓰는 화물
            <span className="pv2-list-title-sub">발주 요청 2단계에서 바로 불러올 수 있습니다</span>
          </div>
          <div className="pv2-card-grid">
            {cargos.length === 0 ? (
              <div className="pv2-card-empty">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/portal/wecarry-eng-cropped.svg"
                  alt=""
                  className="pv2-empty-logo"
                  style={{ width: 92 }}
                />
                <div className="pv2-card-empty-title">저장된 화물이 없습니다</div>
                <div className="pv2-card-empty-desc">
                  자주 보내는 화물을 등록해두면 발주 요청에서 한 번에 채울 수 있습니다.
                </div>
              </div>
            ) : (
              cargos.map((c) => {
                const { head, tail } = cargoPresetSummary(c.payload);
                return (
                  <div key={c.id} className="pv2-saved-card">
                    <div className="pv2-saved-head pv2-saved-head-tight">
                      <span className="pv2-type-badge pv2-type-cargo">화물</span>
                      <span className="pv2-saved-name">{c.name}</span>
                      <button
                        type="button"
                        className="pv2-btn-del"
                        onClick={() => setPendingDelete({ kind: "cargo", id: c.id, name: c.name })}
                      >
                        삭제
                      </button>
                    </div>
                    {head && <div className="pv2-saved-line">{head}</div>}
                    {tail && <div className="pv2-saved-line-sm">{tail}</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 🔴 삭제는 확인 모달을 거친다 — window.confirm 은 시안 톤과 맞지 않고
          모바일에서 시스템 대화상자가 갑자기 뜬다 */}
      {pendingDelete && (
        <div
          className="pv2-modal-dim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pv2-del-title"
          onClick={() => setPendingDelete(null)}
        >
          <div className="pv2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pv2-modal-title" id="pv2-del-title">
              {pendingDelete.kind === "location" ? "배송지를 삭제할까요?" : "화물을 삭제할까요?"}
            </div>
            <div className="pv2-modal-desc">
              「{pendingDelete.name}」을(를) 목록에서 지웁니다. 이미 보낸 발주 요청에는 영향이
              없습니다.
            </div>
            <div className="pv2-modal-actions">
              <button type="button" className="pv2-modal-cancel" onClick={() => setPendingDelete(null)}>
                취소
              </button>
              <button type="button" className="pv2-modal-confirm" onClick={handleConfirmDelete}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
