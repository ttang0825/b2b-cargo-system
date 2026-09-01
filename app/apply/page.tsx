"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import SubmitDone from "@/components/landing/SubmitDone";
import BackToHomeLink from "@/components/BackToHomeLink";
import PublicConsentFields from "@/components/PublicConsentFields";
import AddressSearch from "@/components/AddressSearch";
import MultiSelectTags from "@/components/MultiSelectTags";
import {
  Dropdown,
  cardStyle,
  cardTitleStyle,
  fieldLabel,
  fieldStyle,
  fieldOnTintStyle,
  optionChipStyle,
  useOpenKey,
} from "@/components/landing/form/Fields";
import { APPLY_CONSENT_TEXT, TERMS_CONSENT } from "@/lib/legalInfo";
import { formatPhoneNumber, formatBizRegNo, REGIONS, VEHICLE_TYPES_PUBLIC } from "@/lib/constants";
import { QUOTE_BODY_TYPES } from "@/lib/vehicleBodyTypes";
import { COMPANY_SUPPORT_HOURS, COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import "@/app/landing.css";

// 운송관리 계정 신청 — 31차에 시안(디자인팀 Next 변환본)으로 껍데기를 갈아끼웠다.
//
// 🔴 **이 화면의 핵심은 동의 기록이다. 아래 셋이 한 벌로 움직인다(18차·49차):**
//    ① 화면 체크박스 **2개**(개인정보보호법 제22조 1항 — 항목별로 구분해 받는다)
//    ② 서버가 `termsAgreed`·`agreed` 를 **각각 `!== true` 로** 거른다(원칙 25번)
//    ③ `recordConsents` 가 `privacy` + `terms` **2행**을 남기고, 실패하면 접수 건을 지운다
//    화면만 새로 그리면서 ①을 하나로 합치거나 state 를 합치면 ②·③ 이 조용히 무너진다.
// 🔴 **동의 문구는 `lib/legalInfo.ts` 가 유일 정의처다** — 시안은 약관 초안을 화면 코드에
//    통째로 들고 있었다(그러면 조문 개정 때 한쪽이 낡는다). 우리는 `lib/legal/` 전문을
//    `LegalLinks` 모달로 연다.
// 🔴 **접수는 `/api/apply-submit` 그대로다** — 이 화면은 요청 바디를 한 글자도 안 바꿨다.
//
// ⚠️ **상세 정보는 접이식이다**(사용자 결정 2026-08-31) — 필수는 회사명·담당자명·연락처
//    셋뿐이고 구간·규모·요청사항은 「상세 정보 입력하기」 안에 있다. 접혀 있어도 값은
//    그대로 전송된다(펼치지 않으면 빈 값이 갈 뿐이다).

// 🔴 시안은 필수 표시가 **빨간 `*` 가 아니라 회색 「필수」 글자**다(31차 리뷰 — "가로 사이즈
// 디자인이 시안과 많이 다르다" 와 함께 맞춘 것). 「선택」과 같은 모양이라 두 표시가 한 벌로 읽힌다.
/** 주요 운송 구간의 두 하위 카드(시안) — 라벨과 state 키를 한 곳에 둔다.
 *  🔴 `as const` 를 빼지 말 것: 빼면 `form[side.addr]` 의 키 타입이 string 으로 넓어져
 *     오타가 컴파일에서 안 걸린다. */
const ROUTE_SIDES = [
  {
    key: "origin",
    title: "주요 출발지",
    sub: "상차지 정보",
    dot: "#FFD834",
    addr: "main_origin",
    addrDetail: "main_origin_detail",
    sido: "main_origin_sido",
    sigungu: "main_origin_sigungu",
    siteName: "origin_site_name",
    siteContact: "origin_contact_name",
    sitePhone: "origin_contact_phone",
  },
  {
    key: "destination",
    title: "주요 도착지",
    sub: "하차지 정보",
    dot: "#0E0F12",
    addr: "main_destination",
    addrDetail: "main_destination_detail",
    sido: "main_destination_sido",
    sigungu: "main_destination_sigungu",
    siteName: "destination_site_name",
    siteContact: "destination_contact_name",
    sitePhone: "destination_contact_phone",
  },
] as const;

const requiredMark = <span style={{ marginLeft: 4, fontSize: 12.5, fontWeight: 500, color: "#A8A79F" }}>필수</span>;
const optionalMark = <span style={{ marginLeft: 4, fontSize: 12.5, fontWeight: 500, color: "#A8A79F" }}>선택</span>;

export default function ApplyPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);
  // 🔴 이용약관 동의는 개인정보 동의와 **별개 state**다(18차). 법 제22조 1항이
  // 각각 구분해 받도록 하고 있어 한 값으로 합치면 안 된다.
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const { openKey, setOpenKey } = useOpenKey();

  const [form, setForm] = useState({
    company_name: "",
    business_reg_no: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    main_origin: "",
    main_origin_detail: "",
    main_origin_sido: "",
    main_origin_sigungu: "",
    main_destination: "",
    main_destination_detail: "",
    main_destination_sido: "",
    main_destination_sigungu: "",
    monthly_volume_estimate: "",
    industry: "",
    preferred_regions: "",
    // 🔴 「주 이용 차량」은 **톤수 + 형태 두 칸**이다(31차 리뷰 지시) — 제출 직전에
    //    `"5톤 윙바디"` 처럼 공백으로 이어 `preferred_vehicle` 하나로 보낸다.
    //    승인 시 `companies.recommended_vehicle` 로 그대로 승계되는 값이고, 운영 DB 의
    //    기존 539건이 이미 `"1톤 탑차"` 형태라 **같은 모양을 유지해야 한다**(55차 ③).
    vehicle_ton: "",
    vehicle_body: "",
    // 🔴 현장 정보 6칸(상·하차지 각 3개)은 **`customer_applications` 에 컬럼이 없다.**
    //    31차는 DB 변경 0이 조건이라 27차 「당착/내착」과 같은 방식으로 `notes` 에 잇는다.
    //    ⚠️ 이 값은 **제3자(현장 담당자)의 개인정보**다 — 아래 `buildNotes` 주석 참고.
    origin_site_name: "",
    origin_contact_name: "",
    origin_contact_phone: "",
    destination_site_name: "",
    destination_contact_name: "",
    destination_contact_phone: "",
    notes: "",
  });

  /**
   * 요청사항 + 현장 정보를 한 문자열로 잇는다.
   * 🔴 `customer_applications` 에 현장 상호·담당자명·연락처 컬럼이 없어서(실측) DB 변경 없이
   *    담당자가 볼 수 있게 하는 유일한 길이다. 27차가 「당착/내착」을 특이사항 한 줄로 이은
   *    것과 같은 방식이고, 관리자 신청서 상세 모달이 `notes` 를 그대로 보여준다.
   * ⚠️ **컬럼을 만들자는 제안이 나오면** `/api/apply-submit` 화이트리스트 · 관리자 신청서
   *    상세 모달 · 승인 시 `customer_locations`(20차에 `contact_name`·`contact_phone` 가
   *    이미 있다) 까지 함께 봐야 한다.
   */
  function buildNotes() {
    const block = (title: string, rows: [string, string][]) => {
      const lines = rows.filter(([, v]) => v.trim()).map(([k, v]) => `· ${k}: ${v.trim()}`);
      return lines.length ? [`※ ${title}`, ...lines] : [];
    };
    const extra = [
      ...block("주요 출발지 현장", [
        ["현장 상호", form.origin_site_name],
        ["담당자명", form.origin_contact_name],
        ["담당자 연락처", form.origin_contact_phone],
      ]),
      ...block("주요 도착지 현장", [
        ["현장 상호", form.destination_site_name],
        ["담당자명", form.destination_contact_name],
        ["담당자 연락처", form.destination_contact_phone],
      ]),
    ];
    const base = form.notes.trim();
    if (extra.length === 0) return base;
    return [base, ...extra].filter(Boolean).join("\n");
  }

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorReason(null);

    if (!form.company_name.trim() || !form.contact_name.trim() || !form.contact_phone.trim()) {
      setError("회사명, 담당자명, 담당자 연락처는 필수입니다.");
      return;
    }
    if (!termsAgreed) {
      setError("이용약관에 동의해주셔야 신청을 접수할 수 있습니다.");
      return;
    }
    if (!agreed) {
      setError("개인정보 수집·이용에 동의해주셔야 신청을 접수할 수 있습니다.");
      return;
    }

    setSaving(true);
    const fullMainOrigin = [form.main_origin, form.main_origin_detail]
      .filter((v) => v.trim())
      .join(" ");
    const fullMainDestination = [form.main_destination, form.main_destination_detail]
      .filter((v) => v.trim())
      .join(" ");
    try {
      const res = await fetch("/api/apply-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ⚠️ `agreed`는 form과 분리된 별도 state라 **명시적으로 함께 보내야 한다** —
        // 14차 전에는 이 값이 검증에만 쓰이고 서버로 가지 않아 동의가 저장되지 않았다.
        body: JSON.stringify({
          ...form,
          main_origin: fullMainOrigin,
          main_destination: fullMainDestination,
          // 🔴 톤수·형태를 공백으로 이어 한 칸으로 보낸다(`"5톤 윙바디"`) — 위 state 주석 참고.
          preferred_vehicle: [form.vehicle_ton, form.vehicle_body].filter(Boolean).join(" ") || null,
          notes: buildNotes() || null,
          agreed,
          termsAgreed,
        }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) {
        setError(data.error || "신청 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        setErrorReason(data.reason || null);
        return;
      }
    } catch {
      setSaving(false);
      setError("신청 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="landing-page public-form" style={{ width: "100%", margin: "0 auto", overflowX: "clip", background: "#F4F3F0", color: "#0E0F12" }}>
      <LandingHeader />

      <section className="landing-apply" style={{ padding: "170px max(56px, calc((100% - 1200px) / 2)) 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.035em" }}>운송관리 계정 신청</h1>
            <p style={{ margin: "16px auto 0", maxWidth: 820, fontSize: 15.5, lineHeight: 1.8, color: "#6C6B65", textWrap: "pretty" } as CSSProperties}>
              등록하시면 운송관리 화면에서 견적·배차·정산 현황을 직접 확인하실 수 있습니다. 검토 후 계정을 발급해드립니다.
            </p>
          </div>

          {/* 전화 신청 유도 — 🔴 번호·운영시간은 상수 참조다(하드코딩하지 말 것). */}
          <div
            className="landing-apply-paths"
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 24, margin: "40px 0 56px", padding: "36px 40px", borderRadius: 22, background: "#0E0F12", color: "#FFFFFF" }}
          >
            <div>
              <div style={{ fontSize: 26, lineHeight: 1.35, fontWeight: 700, letterSpacing: "-0.03em", wordBreak: "keep-all" }}>간편하게 전화로 신청하세요</div>
              <div style={{ marginTop: 10, fontSize: 16, lineHeight: 1.75, color: "rgba(255,255,255,0.68)", wordBreak: "keep-all" }}>
                통화 한 번으로 신청이 끝납니다.
                <br />
                {COMPANY_SUPPORT_HOURS} · 아래 신청서 작성도 가능합니다.
              </div>
            </div>
            <a href={`tel:${COMPANY_SUPPORT_PHONE.replace(/-/g, "")}`} className="landing-apply-tel" style={{ display: "inline-flex", alignItems: "center", color: "#FFD834", fontSize: 46, fontWeight: 700, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>
              {COMPANY_SUPPORT_PHONE}
            </a>
          </div>

          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} noValidate>
            {/* 🔴 폼 컬럼은 **컨테이너(1200px) 전체 폭**이다 — 31차에 `/quote` 와 같은 720px 로
                뒀는데 시안 실측이 1203px 이었고, 사용자가 "가로 사이즈 디자인이 시안과 많이
                다르다"로 신고했다. ⚠️ `/quote` 시안은 실제로 720px 이라 **두 화면이 일부러
                다르다** — 같이 맞추지 말 것. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div className="landing-detail-head" style={{ fontSize: 26, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.03em" }}>신청서 작성</div>
                <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.7, color: "#6C6B65" }}>회사명과 담당자 연락처만 있으면 계정을 발급해드립니다.</div>
              </div>

              {/* ── 신청 정보 ─────────────────────────── */}
              <div style={cardStyle}>
                <div style={cardTitleStyle}>신청 정보</div>
                <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.7, color: "#888378" }}>발급 완료 안내는 담당자 연락처로 문자로 보내드립니다.</p>

                {/* 🔴 `auto-fit` 을 쓰지 말 것 — 폼 폭이 1200 이 되면서 260px 최소폭으로는
                    **4열**이 되어 시안(2열)과 어긋난다. 열 수를 고정하고 좁은 화면은
                    `app/landing.css` 의 `.landing-apply-grid` 가 1열로 되돌린다. */}
                <div className="landing-apply-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginTop: 20 }}>
                  <div>
                    <label style={fieldLabel}>회사명 {requiredMark}</label>
                    <input
                      type="text"
                      value={form.company_name}
                      onChange={(e) => setField("company_name", e.target.value)}
                      placeholder="예: (주)한빛상사"
                      style={{ ...fieldStyle, marginTop: 8 }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>사업자등록번호 {optionalMark}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      value={form.business_reg_no}
                      onChange={(e) => setField("business_reg_no", formatBizRegNo(e.target.value))}
                      placeholder="000-00-00000"
                      style={{ ...fieldStyle, marginTop: 8 }}
                    />
                  </div>
                </div>

                <div className="landing-apply-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16, marginTop: 20, paddingTop: 22, borderTop: "1px solid #EEEDE9" }}>
                  <div>
                    <label style={fieldLabel}>담당자명 {requiredMark}</label>
                    <input
                      type="text"
                      value={form.contact_name}
                      onChange={(e) => setField("contact_name", e.target.value)}
                      placeholder="예: 홍길동"
                      style={{ ...fieldStyle, marginTop: 8 }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>담당자 연락처 {requiredMark}</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={13}
                      value={form.contact_phone}
                      onChange={(e) => setField("contact_phone", formatPhoneNumber(e.target.value))}
                      placeholder="010-0000-0000"
                      style={{ ...fieldStyle, marginTop: 8 }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>담당자 이메일 {optionalMark}</label>
                    {/* ⚠️ 이메일은 22차에 선택 입력이 됐다 — 필수로 되돌리지 말 것. */}
                    <input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setField("contact_email", e.target.value)}
                      placeholder="처리 결과를 메일로도 받으실 경우"
                      style={{ ...fieldStyle, marginTop: 8 }}
                    />
                  </div>
                </div>

                {/* 🔴 동의 2개는 `PublicConsentFields` 가 유일 정의처다 — 화면에 새로 그리지 말 것. */}
                <PublicConsentFields
                  variant="landing"
                  termsLabel={TERMS_CONSENT.applyLabel}
                  termsAgreed={termsAgreed}
                  onTermsChange={setTermsAgreed}
                  privacyText={APPLY_CONSENT_TEXT}
                  privacyAgreed={agreed}
                  onPrivacyChange={setAgreed}
                />
              </div>

              {/* ── 상세 정보 토글 ─────────────────────── */}
              <div style={{ marginTop: 6 }}>
                <div className="landing-detail-head" style={{ fontSize: 26, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.03em" }}>
                  자세히 적을수록 발급이 빨라집니다
                </div>
                <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.7, color: "#6C6B65" }}>
                  자주 쓰는 구간과 운송 규모를 남기시면 계정에 미리 등록해 첫 발주부터 바로 쓰실 수 있습니다.
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
                  {/* 주요 운송 구간 */}
                  <div style={cardStyle}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                      <span style={optionChipStyle}>선택</span>
                      <div style={cardTitleStyle}>주요 운송 구간</div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            main_origin: p.main_destination,
                            main_origin_detail: p.main_destination_detail,
                            main_origin_sido: p.main_destination_sido,
                            main_origin_sigungu: p.main_destination_sigungu,
                            main_destination: p.main_origin,
                            main_destination_detail: p.main_origin_detail,
                            main_destination_sido: p.main_origin_sido,
                            main_destination_sigungu: p.main_origin_sigungu,
                          }))
                        }
                        style={{ marginLeft: "auto", padding: "7px 14px", border: "none", borderRadius: 999, background: "#F4F3EF", fontSize: 14, fontWeight: 600, color: "#4A4945", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        ⇄ 출발지·도착지 바꾸기
                      </button>
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.7, color: "#888378" }}>
                      자주 보내는 구간을 등록해두면 승인 시 배송지로 함께 저장해드립니다.
                    </p>

                    {/* 🔴 주소검색은 공용 `AddressSearch` 다(원칙 37번) — 승인 시
                        `companies.main_pickup_*` 와 `customer_locations` 로 자동 저장되는
                        값이라 sido/sigungu 를 함께 넘겨야 한다.
                        🔴 시안은 출발지·도착지를 **옅은 회색 하위 카드 두 장으로 나란히** 두고
                           가운데에 노란 화살표를 둔다(31차 리뷰 지시). 좁은 화면에서는
                           `app/landing.css` 가 1열로 되돌리고 화살표를 숨긴다.
                        🔴 하위 카드 배경이 #F4F3EF 라 그 안의 칸은 **흰색**이다
                           (`fieldOnTintStyle` · `.landing-addr-tint`) — 같은 색을 겹치면 칸이 안 보인다. */}
                    <div
                      className="landing-route-grid"
                      style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 32, marginTop: 20, alignItems: "start" }}
                    >
                      {ROUTE_SIDES.map((side) => (
                        <div key={side.key} style={{ padding: 20, borderRadius: 18, background: "#F4F3EF" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 999, background: side.dot }} />
                            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>{side.title}</span>
                            <span style={{ fontSize: 13, color: "#8B8A85" }}>{side.sub}</span>
                          </div>
                          <div style={{ marginTop: 12 }}>
                            <AddressSearch
                              label=""
                              className="landing-addr landing-addr-tint"
                              value={form[side.addr]}
                              detailValue={form[side.addrDetail]}
                              onChange={(addr, sido, sigungu) =>
                                setForm((prev) => ({ ...prev, [side.addr]: addr, [side.sido]: sido, [side.sigungu]: sigungu }))
                              }
                              onDetailChange={(v) => setField(side.addrDetail, v)}
                            />
                          </div>
                          {/* 🔴 현장 상호·담당자명·연락처는 **선택**이다(시안·사용자 지시).
                              값은 `notes` 로 이어 붙인다 — 위 `buildNotes` 주석 참고. */}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: 10 }}>
                            <input
                              type="text"
                              value={form[side.siteName]}
                              onChange={(e) => setField(side.siteName, e.target.value)}
                              placeholder="현장 상호 (선택)"
                              style={{ ...fieldOnTintStyle, padding: "13px 14px" }}
                            />
                            <input
                              type="text"
                              value={form[side.siteContact]}
                              onChange={(e) => setField(side.siteContact, e.target.value)}
                              placeholder="담당자명 (선택)"
                              style={{ ...fieldOnTintStyle, padding: "13px 14px" }}
                            />
                          </div>
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={13}
                            value={form[side.sitePhone]}
                            onChange={(e) => setField(side.sitePhone, formatPhoneNumber(e.target.value))}
                            placeholder="현장 담당자 연락처 (선택)"
                            style={{ ...fieldOnTintStyle, padding: "13px 14px", marginTop: 10 }}
                          />
                        </div>
                      ))}
                      <span
                        className="landing-route-badge"
                        aria-hidden
                        style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 999, background: "#FFD834", color: "#0E0F12", fontSize: 15, fontWeight: 700 }}
                      >
                        →
                      </span>
                    </div>
                  </div>

                  {/* 운송 규모 */}
                  <div style={cardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={optionChipStyle}>선택</span>
                      <div style={cardTitleStyle}>운송 규모</div>
                    </div>
                    <p style={{ margin: "8px 0 20px", fontSize: 13.5, lineHeight: 1.7, color: "#888378" }}>모르시는 항목은 비워두셔도 됩니다.</p>
                    {/* 🔴 네 칸의 폭이 같아야 한다(사용자 지시 2026-09-01) — 3열 안에서 차량
                        두 칸을 다시 반으로 나누면 그 둘만 절반 폭이 된다. **4열 격자**로 두고
                        톤수·형태를 각각 한 칸씩 쓴다. */}
                    <div className="landing-scale-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
                      <div>
                        <label style={fieldLabel}>월 예상 운송건수</label>
                        <input
                          type="text"
                          value={form.monthly_volume_estimate}
                          onChange={(e) => setField("monthly_volume_estimate", e.target.value)}
                          placeholder="예: 월 5~10건"
                          style={{ ...fieldStyle, marginTop: 8, padding: "14px 15px" }}
                        />
                      </div>
                      <div>
                        <label style={fieldLabel}>업종</label>
                        {/* ⚠️ 예시는 placeholder 가 아니라 캡션에 둔다 — 21차에 입력창 폭에
                            잘려 뒷부분이 안 보인다는 지적이 있었다. */}
                        <input
                          type="text"
                          value={form.industry}
                          onChange={(e) => setField("industry", e.target.value)}
                          placeholder="예: 제조업"
                          style={{ ...fieldStyle, marginTop: 8, padding: "14px 15px" }}
                        />
                        <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.6, color: "#A8A79F" }}>
                          제조업, 유통업, 건설업, 식품업, 전자상거래, 물류업 등
                        </div>
                      </div>
                      {/* 🔴 「주 이용 차량」은 **톤수 + 형태 두 칸**이다(31차 리뷰 지시).
                          제출 직전에 `"5톤 윙바디"` 처럼 공백으로 이어 `preferred_vehicle`
                          한 칸으로 보낸다 — 승인 시 `companies.recommended_vehicle` 로
                          승계되고 운영 DB 기존 539건이 이미 그 형태다(55차 ③).
                          🔴 라벨이 「주 이용 차량 톤수」·「주 이용 차량 형태」인 이유 — 넷을 같은
                             폭으로 세우면서 「주로 이용하시는…」 캡션을 없앴고, 그 뜻을 라벨이
                             대신 담는다. 「차량 톤수」로 줄이지 말 것.
                          ⚠️ 21차의 「!」 hover 툴팁은 이미 없앴다(터치에는 hover 가 없다). */}
                      <div>
                        <Dropdown
                          ddKey="vehicleTon"
                          label="주 이용 차량 톤수"
                          options={[...VEHICLE_TYPES_PUBLIC]}
                          placeholder="선택 안 함"
                          value={form.vehicle_ton}
                          onPick={(v) => setField("vehicle_ton", v)}
                          openKey={openKey}
                          setOpenKey={setOpenKey}
                          pad="14px 15px"
                        />
                      </div>
                      <div>
                        <Dropdown
                          ddKey="vehicleBody"
                          label="주 이용 차량 형태"
                          options={[...QUOTE_BODY_TYPES]}
                          placeholder="선택 안 함"
                          value={form.vehicle_body}
                          onPick={(v) => setField("vehicle_body", v)}
                          openKey={openKey}
                          setOpenKey={setOpenKey}
                          pad="14px 15px"
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: 20 }}>
                      <label style={fieldLabel}>이용 지역 (중복 선택 가능)</label>
                      {/* 🔴 `MultiSelectTags` 를 그대로 쓴다 — 저장 형식이 "서울, 경기" 콤마
                          문자열이라 화면이 따로 그리면 형식이 갈린다. `variant` 는 색만
                          바꾼다(관리자 4개 화면은 기본값 그대로다). */}
                      <div style={{ marginTop: 10 }}>
                        <MultiSelectTags variant="landing" options={REGIONS} value={form.preferred_regions} onChange={(v) => setField("preferred_regions", v)} />
                      </div>
                    </div>
                  </div>

                  {/* 요청사항 */}
                  <div style={cardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={optionChipStyle}>선택</span>
                      <div style={cardTitleStyle}>요청사항</div>
                    </div>
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      placeholder="운송 품목, 상하차 조건, 특이사항 등 자유롭게 남겨주세요"
                      style={{ ...fieldStyle, marginTop: 16, resize: "vertical" }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "#FDF3F2", color: "#B4423A", fontSize: 14, lineHeight: 1.6 }}>
                  {error}
                  {/* 🔴 이미 승인된 신청이면 로그인으로 보낸다 — 지우면 화주가 같은 신청을 반복한다. */}
                  {errorReason === "approved" && (
                    <>
                      {" "}
                      <Link href="/customer/login" style={{ color: "inherit", textDecoration: "underline", fontWeight: 700 }}>
                        로그인하기
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="landing-submit-bar" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 32 }}>
              <button
                type="submit"
                disabled={saving}
                style={{ minWidth: 340, maxWidth: "100%", padding: "20px 36px", whiteSpace: "nowrap", background: "#FFD834", color: "#0E0F12", border: "1px solid #FFD834", borderRadius: 16, fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "접수 중..." : "등록 신청하기"}
              </button>
              <div style={{ fontSize: 13.5, color: "#8B8A85" }}>
                먼저 운임부터 확인하고 싶으신가요?{" "}
                <Link href="/quote" style={{ fontWeight: 600, color: "#4A4945", textDecoration: "underline", textUnderlineOffset: 3 }}>
                  견적 문의하기
                </Link>
              </div>
              {/* "← 홈으로" — 🔴 헤더 로고와 동작이 다르다: 로고는 홈 맨 위로 가고, 이 링크는
                  **왔던 자리로 되돌아간다**(랜딩 운송관리 섹션이 페이지 한참 아래라, 맨 위로
                  튕기면 스크롤을 다시 내려야 했다 — 13차 PR #88 리뷰). */}
              <BackToHomeLink />
            </div>
          </form>
        </div>
      </section>

      <LandingFooter />

      {success && (
        <SubmitDone
          title="계정 신청이 접수되었습니다"
          message={`담당자 검토 후 승인되면 남겨주신 연락처로 접속 정보를 안내드립니다. ${COMPANY_SUPPORT_HOURS} 접수 기준 당일 발급됩니다.`}
        />
      )}
    </div>
  );
}
