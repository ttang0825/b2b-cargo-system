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
  optionChipStyle,
  useOpenKey,
} from "@/components/landing/form/Fields";
import { APPLY_CONSENT_TEXT, TERMS_CONSENT } from "@/lib/legalInfo";
import { formatPhoneNumber, formatBizRegNo, REGIONS, VEHICLE_TYPES_PUBLIC } from "@/lib/constants";
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

const requiredMark = <span style={{ marginLeft: 4, color: "#C05B54" }}>*</span>;
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
    preferred_vehicle: "",
    notes: "",
  });

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
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720, margin: "0 auto" }}>
              <div>
                <div className="landing-detail-head" style={{ fontSize: 26, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.03em" }}>신청서 작성</div>
                <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.7, color: "#6C6B65" }}>회사명과 담당자 연락처만 있으면 계정을 발급해드립니다.</div>
              </div>

              {/* ── 신청 정보 ─────────────────────────── */}
              <div style={cardStyle}>
                <div style={cardTitleStyle}>신청 정보</div>
                <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.7, color: "#888378" }}>발급 완료 안내는 담당자 연락처로 문자로 보내드립니다.</p>

                <div className="landing-apply-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 16, marginTop: 20 }}>
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

                <div className="landing-apply-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16, marginTop: 20, paddingTop: 22, borderTop: "1px solid #EEEDE9" }}>
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
                        값이라 sido/sigungu 를 함께 넘겨야 한다. */}
                    <div style={{ marginTop: 20 }}>
                      <label style={fieldLabel}>주요 출발지</label>
                      <div style={{ marginTop: 8 }}>
                        <AddressSearch
                          label=""
                          className="landing-addr"
                          value={form.main_origin}
                          detailValue={form.main_origin_detail}
                          onChange={(addr, sido, sigungu) =>
                            setForm((p) => ({ ...p, main_origin: addr, main_origin_sido: sido, main_origin_sigungu: sigungu }))
                          }
                          onDetailChange={(v) => setField("main_origin_detail", v)}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: 20 }}>
                      <label style={fieldLabel}>주요 도착지</label>
                      <div style={{ marginTop: 8 }}>
                        <AddressSearch
                          label=""
                          className="landing-addr"
                          value={form.main_destination}
                          detailValue={form.main_destination_detail}
                          onChange={(addr, sido, sigungu) =>
                            setForm((p) => ({ ...p, main_destination: addr, main_destination_sido: sido, main_destination_sigungu: sigungu }))
                          }
                          onDetailChange={(v) => setField("main_destination_detail", v)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 운송 규모 */}
                  <div style={cardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={optionChipStyle}>선택</span>
                      <div style={cardTitleStyle}>운송 규모</div>
                    </div>
                    <p style={{ margin: "8px 0 20px", fontSize: 13.5, lineHeight: 1.7, color: "#888378" }}>모르시는 항목은 비워두셔도 됩니다.</p>
                    <div className="landing-scale-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
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
                      <div>
                        {/* ⚠️ 21차의 「!」 hover 툴팁을 캡션으로 바꿨다 — 톤수 목록은 드롭다운을
                            열면 그대로 보이므로 잃는 정보가 없고, 터치에는 hover 가 없다. */}
                        <Dropdown
                          ddKey="vehicle"
                          label="주 이용 차량"
                          options={[...VEHICLE_TYPES_PUBLIC]}
                          placeholder="선택 안 함"
                          value={form.preferred_vehicle}
                          onPick={(v) => setField("preferred_vehicle", v)}
                          openKey={openKey}
                          setOpenKey={setOpenKey}
                          pad="14px 15px"
                        />
                        <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.6, color: "#A8A79F" }}>
                          주로 이용하시는 차량 톤수를 골라주세요.
                        </div>
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
              {/* 🔴 `/status` 진입 경로를 남긴다(원칙 42번) — 옛 화면은 `PublicPageHeader` 의
                  「문의·신청 현황」 칩으로 갔는데 시안 헤더·푸터에는 그 칩이 없다. */}
              <div style={{ fontSize: 13.5, color: "#8B8A85" }}>
                이미 신청하셨나요?{" "}
                <Link href="/status" style={{ fontWeight: 600, color: "#4A4945", textDecoration: "underline", textUnderlineOffset: 3 }}>
                  문의·신청 현황 조회
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
