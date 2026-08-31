"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import SubmitDone from "@/components/landing/SubmitDone";
import AddressSearch from "@/components/AddressSearch";
import LegalLinks from "@/components/LegalLinks";
import {
  DatePicker,
  Dropdown,
  cardStyle,
  cardTitleStyle,
  fieldLabel,
  fieldStyle,
  joinDateTime,
  optionChipStyle,
  quickDateButtons,
  timeSlots,
  useOpenKey,
} from "@/components/landing/form/Fields";
import { VEHICLE_TYPES_PUBLIC, formatPhoneNumber } from "@/lib/constants";
import { QUOTE_BODY_TYPES } from "@/lib/vehicleBodyTypes";
import { LOADING_METHODS } from "@/lib/loadingMethods";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import { QUOTE_CONSENT_TEXT } from "@/lib/legalInfo";
import { localInputToISOString } from "@/lib/localDateTime";
import "@/app/landing.css";

// 완전공개 견적 문의 — 31차에 시안(디자인팀 Next 변환본)으로 껍데기를 갈아끼웠다.
//
// 🔴 **제출은 서버 API(`/api/quote-submit`)를 그대로 거친다** — 51차가 anon 직접 INSERT 를
//    서버 경유로 바꿨고(방금 넣은 행의 id 를 받아야 `consents.subject_id` 를 채운다),
//    화면에서 직접 DB 에 쓰는 방식으로 되돌리지 말 것.
// 🔴 **동의는 개인정보 하나뿐이다**(`CONSENT_TYPES_BY_SOURCE["/quote"] = ["privacy"]`).
//    약관 동의를 넣지 않는 것이 사용자 결정(2026-08-26)이다 — 견적 문의 자체는 계약이
//    아니고, 문구에 없는 동의를 기록하면 거짓이 된다(14차).
// 🔴 **선택지는 전부 정의처 참조다** — 톤수 `VEHICLE_TYPES_PUBLIC` · 차종
//    `QUOTE_BODY_TYPES`(22종) · 상하차조건 `LOADING_METHODS`(8종). 시안의 7종·6종을
//    따르지 말 것(25차가 7 → 21 로 늘렸고 리뷰에서 22종이 됐다).
// 🔴 **물품특성·운송시간·왕복편도는 `rate_surcharges` 가 정본**이라 서버 API 로 이름만
//    받아온다(21차 — 금액은 비공개). 하드코딩하지 말 것.
//
// 🔴 **상세 정보(접이식) 값 중 DB 컬럼이 없는 것은 특이사항(`notes`)에 한 줄씩 붙인다.**
//    `public_quote_requests` 에는 물품특성·왕복편도·대기시간·경유지수·희망 하차 일시·
//    운송시간 컬럼이 **없다**(코드 전수 확인). 31차는 DB 변경 0이 조건이라 27차가
//    「당착/내착」을 특이사항 한 줄로 이은 것과 같은 방식을 썼다 — 그 값들은 공개문의
//    상세와 **견적 전환 프리필**(`notes` → 견적 특이사항)까지 그대로 따라간다.
//    ⚠️ 컬럼을 만들자는 제안이 나오면 그때는 관리자 목록·상세·프리필까지 함께 봐야 한다.

const detailChip: CSSProperties = { ...optionChipStyle };

type Picks = Record<string, string>;

export default function PublicQuotePage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    origin: "",
    originDetail: "",
    originSido: "",
    originSigungu: "",
    destination: "",
    destinationDetail: "",
    destinationSido: "",
    destinationSigungu: "",
    item: "",
    notes: "",
    waitingMinutes: "",
    waypointCount: "",
  });

  // 드롭다운·달력 값. 🔴 열림은 화면 전체에서 하나뿐이다(`useOpenKey`).
  const [picks, setPicks] = useState<Picks>({
    ton: VEHICLE_TYPES_PUBLIC[0],
    load: LOADING_METHODS[0].label,
    unload: LOADING_METHODS[0].label,
  });
  const pick = (k: string) => (v: string) => setPicks((p) => ({ ...p, [k]: v }));
  const { openKey, setOpenKey } = useOpenKey();

  // 🔴 물품특성·운송시간·왕복편도는 `rate_surcharges` 가 정본이라 서버에서 이름만 받는다.
  const [surcharge, setSurcharge] = useState<Record<string, string[]>>({});
  const [optionError, setOptionError] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/customer/surcharge-options", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        if (json?.error || !Array.isArray(json?.data)) {
          setOptionError(true);
          return;
        }
        const grouped: Record<string, string[]> = {};
        for (const row of json.data as { category: string; option_name: string }[]) {
          (grouped[row.category] ||= []).push(row.option_name);
        }
        setSurcharge(grouped);
      })
      // 🔴 에러를 삼키지 않는다(원칙 55번) — 다만 이 세 항목은 선택이라 폼 전체를 막지 않고
      //    안내 한 줄만 띄운다.
      .catch(() => alive && setOptionError(true));
    return () => {
      alive = false;
    };
  }, []);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const todayKey = (() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();

  /** 🔴 DB 컬럼이 없는 상세 값을 특이사항 한 줄씩으로 만든다. 값이 없으면 줄을 안 만든다. */
  function buildNotes() {
    const lines: string[] = [];
    const add = (label: string, v?: string) => {
      if (v && v.trim()) lines.push(`· ${label}: ${v.trim()}`);
    };
    add("물품특성", picks.trait);
    add("왕복/편도", picks.trip);
    add("운송시간", picks.transport);
    add("대기시간", form.waitingMinutes ? `${form.waitingMinutes}분` : "");
    add("경유지 수", form.waypointCount ? `${form.waypointCount}곳` : "");
    const dropoff = joinDateTime(picks.calUnload, picks.unloadTime);
    add("희망 하차 일시", picks.calUnload ? dropoff.replace("T", " ") : "");

    const base = form.notes.trim();
    if (lines.length === 0) return base;
    return [base, "※ 상세 정보", ...lines].filter(Boolean).join("\n");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.phone.trim()) {
      setError("성함(업체명)과 연락처를 입력해주세요.");
      return;
    }
    if (!form.origin.trim() || !form.destination.trim()) {
      setError("출발지와 도착지를 입력해주세요.");
      return;
    }
    if (!agreed) {
      setError("개인정보 수집·이용에 동의해주셔야 문의를 접수할 수 있습니다.");
      return;
    }

    // 🔴 상차 일시는 현재 시각 이후만 — 달력이 막지만 제출 직전에 한 번 더 본다(원칙 25번).
    const pickupLocal = joinDateTime(picks.calLoad, picks.loadTime);
    if (picks.calLoad && picks.calLoad < todayKey) {
      setError("희망 상차 일시는 현재 시각 이후로 선택해주세요.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/quote-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          origin: [form.origin.trim(), form.originDetail.trim()].filter(Boolean).join(" "),
          origin_sido: form.originSido || null,
          origin_sigungu: form.originSigungu || null,
          destination: [form.destination.trim(), form.destinationDetail.trim()].filter(Boolean).join(" "),
          destination_sido: form.destinationSido || null,
          destination_sigungu: form.destinationSigungu || null,
          vehicle_type: picks.ton || null,
          item: form.item.trim() || null,
          pickup_loading_method: picks.load || null,
          dropoff_loading_method: picks.unload || null,
          requested_pickup_at: picks.calLoad ? localInputToISOString(pickupLocal) : null,
          notes: buildNotes() || null,
          // ⚠️ `agreed`는 form과 분리된 별도 state라 명시적으로 함께 보낸다.
          agreed,
        }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) {
        setError(data.error || "문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      setSuccess(true);
    } catch {
      setSaving(false);
      setError("문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  const dd = (key: string, label: string | undefined, options: readonly string[], placeholder: string, pad?: string) => (
    <Dropdown
      ddKey={key}
      label={label}
      options={options}
      placeholder={placeholder}
      value={picks[key]}
      onPick={pick(key)}
      openKey={openKey}
      setOpenKey={setOpenKey}
      pad={pad}
    />
  );

  return (
    <div className="landing-page public-form" style={{ width: "100%", margin: "0 auto", overflowX: "clip", background: "#F4F3F0", color: "#0E0F12" }}>
      <LandingHeader />

      <section className="landing-quote" style={{ padding: "170px max(56px, calc((100% - 1200px) / 2)) 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.035em" }}>무료 견적 문의</h1>
            {/* ⚠️ 시안은 「평일 기준 평균 30분 이내 회신」이었다 — 랜딩 FAQ 가 「평일 업무
                시간에 접수된 건은 당일 안에 회신」이라 두 화면이 다른 시간을 약속하게 되어
                FAQ 문구로 맞췄다. */}
            <p style={{ margin: "16px auto 44px", maxWidth: 820, fontSize: 15.5, lineHeight: 1.8, color: "#6C6B65", textWrap: "pretty" } as CSSProperties}>
              연락처와 구간만 남겨주시면 가능 차량과 운임을 확인해 안내드립니다. 평일 업무 시간에 접수된 건은 당일 안에 회신드립니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720, margin: "0 auto" }}>
              {/* ── 필수 입력 ─────────────────────────── */}
              <div style={cardStyle}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8 }}>
                  <label style={fieldLabel}>출발지</label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        origin: p.destination,
                        originDetail: p.destinationDetail,
                        originSido: p.destinationSido,
                        originSigungu: p.destinationSigungu,
                        destination: p.origin,
                        destinationDetail: p.originDetail,
                        destinationSido: p.originSido,
                        destinationSigungu: p.originSigungu,
                      }))
                    }
                    style={{ marginLeft: "auto", padding: "6px 12px", border: "none", borderRadius: 999, background: "#F4F3EF", fontSize: 13, fontWeight: 600, color: "#4A4945", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    ⇄ 출발지·도착지 바꾸기
                  </button>
                </div>
                {/* 🔴 주소검색은 공용 `AddressSearch` 다(원칙 37번) — 시안의 「주소검색」
                    버튼은 자리만 있었다. 다음 우편번호 스크립트는 `useDaumPostcode` 가
                    페이지당 한 번만 로드한다. */}
                <div style={{ marginTop: 8 }}>
                  <AddressSearch
                    label=""
                    className="landing-addr"
                    value={form.origin}
                    detailValue={form.originDetail}
                    onChange={(address, sido, sigungu) =>
                      setForm((p) => ({ ...p, origin: address, originSido: sido, originSigungu: sigungu }))
                    }
                    onDetailChange={(v) => setField("originDetail", v)}
                    placeholder="도로명주소 검색 또는 직접 입력"
                    detailPlaceholder="상세주소 (동/층/호수, 창고 위치 등)"
                  />
                </div>

                <label style={{ ...fieldLabel, marginTop: 20 }}>도착지</label>
                <div style={{ marginTop: 8 }}>
                  <AddressSearch
                    label=""
                    className="landing-addr"
                    value={form.destination}
                    detailValue={form.destinationDetail}
                    onChange={(address, sido, sigungu) =>
                      setForm((p) => ({ ...p, destination: address, destinationSido: sido, destinationSigungu: sigungu }))
                    }
                    onDetailChange={(v) => setField("destinationDetail", v)}
                    placeholder="도로명주소 검색 또는 직접 입력"
                    detailPlaceholder="상세주소 (동/층/호수, 하차장 위치 등)"
                  />
                </div>

                <div className="landing-main-pick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginTop: 20 }}>
                  {dd("ton", "톤수", VEHICLE_TYPES_PUBLIC, "선택 안 함")}
                  {dd("form", "차종", QUOTE_BODY_TYPES, "선택 안 함")}
                </div>

                <label style={{ ...fieldLabel, marginTop: 20 }}>운송물건</label>
                <input
                  type="text"
                  value={form.item}
                  onChange={(e) => setField("item", e.target.value)}
                  placeholder="운송할 물품을 입력하세요 (예: 택배박스 20개)"
                  style={{ ...fieldStyle, marginTop: 8 }}
                />

                <label style={{ ...fieldLabel, marginTop: 20 }}>성함 / 업체명</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="예: (주)한빛상사"
                  style={{ ...fieldStyle, marginTop: 8 }}
                />

                <label style={{ ...fieldLabel, marginTop: 20 }}>연락처</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={13}
                  value={form.phone}
                  onChange={(e) => setField("phone", formatPhoneNumber(e.target.value))}
                  placeholder="010-0000-0000"
                  style={{ ...fieldStyle, marginTop: 8 }}
                />

                <label style={{ ...fieldLabel, marginTop: 20 }}>이메일 (선택)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="quote@company.co.kr"
                  style={{ ...fieldStyle, marginTop: 8 }}
                />

                {/* 🔴 동의 문구는 `lib/legalInfo.ts` 가 유일 정의처다 — 여기에 적지 말 것.
                    🔴 「전문 보기」는 30차가 만든 `<LegalLinks />` 모달이다. 시안은 약관
                       초안을 코드에 통째로 들고 있었다(우리에겐 `lib/legal/` 전문이 있다). */}
                <div style={{ marginTop: 20, padding: "18px 20px", border: `1px solid ${agreed ? "#FFD834" : "#EBEAE7"}`, borderRadius: 16, background: agreed ? "#FFFCEC" : "#FAFAF8", transition: "background 0.2s ease, border-color 0.2s ease" }}>
                  <label className="landing-consent" style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                    <span style={{ position: "relative", flex: "0 0 auto", width: 22, height: 22, border: `1.5px solid ${agreed ? "#FFD834" : "#D8D7D1"}`, borderRadius: 7, background: agreed ? "#FFD834" : "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, opacity: 0, cursor: "pointer" }}
                      />
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block", opacity: agreed ? 1 : 0, pointerEvents: "none" }}>
                        <path d="M5 12.6l4.4 4.4L19 7.4" stroke="#0E0F12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.02em", color: "#0E0F12" }}>
                        {QUOTE_CONSENT_TEXT}
                        <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 600, color: "#8B8A85" }}>필수</span>
                      </span>
                    </span>
                  </label>
                  <div className="landing-consent-links" style={{ display: "flex", gap: 16, marginTop: 10, paddingLeft: 36, fontSize: 13 }}>
                    <LegalLinks linkClassName="landing-form-legal-link" />
                  </div>
                </div>
              </div>

              {/* ── 상세 정보 토글 ─────────────────────── */}
              <div style={{ marginTop: 6 }}>
                <div className="landing-detail-head" style={{ fontSize: 26, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.03em" }}>
                  자세히 적을수록 견적이 정확해집니다
                </div>
                <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.7, color: "#6C6B65" }}>
                  차량·품목·상하차 조건을 남기시면 빠르게 확정운임을 안내드릴 수 있습니다.
                </div>
                <button
                  type="button"
                  aria-expanded={detailOpen}
                  onClick={() => setDetailOpen((v) => !v)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", marginTop: 18, padding: "22px 32px", border: "1px solid #E4E3DE", borderRadius: 22, background: "#FFFFFF", color: "#0E0F12", fontSize: 15.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {detailOpen ? "접기 ▲" : "상세 정보 입력하기 ▼"}
                </button>
              </div>

              {detailOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* 화물 · 차량 */}
                  <div style={cardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={detailChip}>선택</span>
                      <div style={cardTitleStyle}>화물 · 차량</div>
                    </div>
                    <p style={{ margin: "8px 0 20px", fontSize: 13.5, lineHeight: 1.7, color: "#888378" }}>모르시는 항목은 비워두셔도 됩니다.</p>
                    {optionError && (
                      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#B4423A" }}>
                        물품특성·왕복/편도·운송시간 선택지를 불러오지 못했습니다. 비워두고 보내셔도 됩니다.
                      </p>
                    )}
                    <div className="landing-cargo-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
                      {dd("trait", "물품특성", surcharge["물품특성"] || [], "선택 안 함", "14px 15px")}
                      {dd("trip", "왕복/편도", surcharge["왕복편도"] || [], "선택 안 함", "14px 15px")}
                      {dd("load", "상차조건", LOADING_METHODS.map((m) => m.label), "기본운송", "14px 15px")}
                      {dd("unload", "하차조건", LOADING_METHODS.map((m) => m.label), "기본운송", "14px 15px")}
                      <div>
                        <label style={fieldLabel}>대기시간(분)</label>
                        {/* 🔴 무료 대기시간은 **20분**이다(25차에 30 → 20분으로 바뀐 가격 변경) —
                            시안 문구의 「무료 30분」을 그대로 쓰지 말 것. */}
                        <input
                          type="text"
                          inputMode="numeric"
                          value={form.waitingMinutes}
                          onChange={(e) => setField("waitingMinutes", e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="무료 20분 초과분만 가산"
                          style={{ ...fieldStyle, marginTop: 8, padding: "14px 15px" }}
                        />
                      </div>
                      <div>
                        <label style={fieldLabel}>경유지 수</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={form.waypointCount}
                          onChange={(e) => setField("waypointCount", e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="0"
                          style={{ ...fieldStyle, marginTop: 8, padding: "14px 15px" }}
                        />
                      </div>
                    </div>
                    {/* ⚠️ 시안은 「수작업·지게차·호크(크레인)·도크」였다 — 우리 정본은 8종이고
                        🔴 호이스트(차량 자체 장착)와 크레인(별도 장비 수배)은 **다른 것**이라
                        합치면 배차가 틀어진다(25차). */}
                    <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.7, color: "#888378" }}>
                      기본운송은 차량 적재함에서 상하차하며 별도 장비·인력이 필요하지 않은 경우입니다. 그 밖의 조건은 현장에 맞춰 선택해 주세요.
                    </p>
                  </div>

                  {/* 일정 */}
                  <div style={cardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={detailChip}>선택</span>
                      <div style={cardTitleStyle}>일정</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: "20px 24px", marginTop: 20, alignItems: "start" }}>
                      <div>
                        <label style={fieldLabel}>희망 상차 일시</label>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <DatePicker ddKey="calLoad" value={picks.calLoad} onPick={pick("calLoad")} openKey={openKey} setOpenKey={setOpenKey} quick={quickDateButtons(pick("calLoad"))} />
                          <div style={{ flex: 1, minWidth: 0 }}>{dd("loadTime", undefined, timeSlots(), "시간 선택", "14px 15px")}</div>
                        </div>
                      </div>
                      <div>
                        <label style={fieldLabel}>희망 하차 일시</label>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <DatePicker ddKey="calUnload" value={picks.calUnload} onPick={pick("calUnload")} minKey={picks.calLoad} openKey={openKey} setOpenKey={setOpenKey} quick={quickDateButtons(pick("calUnload"))} />
                          <div style={{ flex: 1, minWidth: 0 }}>{dd("unloadTime", undefined, timeSlots(), "시간 선택", "14px 15px")}</div>
                        </div>
                      </div>
                      {dd("transport", "운송시간", surcharge["운송시간"] || [], "선택 안 함", "14px 15px")}
                    </div>
                  </div>

                  {/* 요청사항 */}
                  <div style={cardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={detailChip}>선택</span>
                      <div style={cardTitleStyle}>요청사항</div>
                    </div>
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      placeholder="상하차 조건 관련 요청, 반복 운송 여부, 기타 참고사항"
                      style={{ ...fieldStyle, marginTop: 16, resize: "vertical" }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "#FDF3F2", color: "#B4423A", fontSize: 14, lineHeight: 1.6 }}>
                  {error}
                </div>
              )}
            </div>

            <div className="landing-submit-bar" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 32 }}>
              <button
                type="submit"
                disabled={saving}
                style={{ minWidth: 340, maxWidth: "100%", padding: "20px 36px", whiteSpace: "nowrap", background: "#FFD834", color: "#0E0F12", border: "1px solid #FFD834", borderRadius: 16, fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "접수 중..." : "견적 문의 보내기"}
              </button>
              {/* 🔴 `/status` 진입 경로를 남긴다(원칙 42번) — 옛 화면은 `PublicPageHeader`
                  의 「문의·신청 현황」 칩으로 갔는데, 시안 헤더(`LandingHeader`)에는 그
                  칩이 없고 랜딩 푸터에도 없다. 지우면 비회원이 진행 상황을 볼 경로가
                  접수완료 팝업 하나만 남는다. */}
              <div style={{ fontSize: 13.5, color: "#8B8A85" }}>
                이미 문의하셨나요?{" "}
                <Link href="/status" style={{ fontWeight: 600, color: "#4A4945", textDecoration: "underline", textUnderlineOffset: 3 }}>
                  문의·신청 현황 조회
                </Link>
              </div>
            </div>
          </form>
        </div>
      </section>

      <LandingFooter />

      {success && (
        <SubmitDone
          title="견적 문의가 접수되었습니다"
          message="담당자가 확인 후 남겨주신 연락처로 가능 차량과 운임을 안내드립니다."
          extra={
            <div style={{ marginTop: 16, padding: "16px 20px", border: "1px solid #EBEAE7", borderRadius: 16, fontSize: 13.5, lineHeight: 1.7, color: "#6C6B65" }}>
              <strong style={{ display: "block", color: "#0E0F12", fontSize: 14.5 }}>계속 거래하실 계획이신가요?</strong>
              신청하시면 운송관리 화면에서 견적·배차·정산 현황을 직접 확인하실 수 있습니다.{" "}
              <Link href="/apply" style={{ fontWeight: 700, color: "#0E0F12", textDecoration: "underline", textUnderlineOffset: 3, whiteSpace: "nowrap" }}>
                운송관리 계정 신청 →
              </Link>
            </div>
          }
        />
      )}
    </div>
  );
}
