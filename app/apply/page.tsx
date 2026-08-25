"use client";

import { useState } from "react";
import Link from "next/link";
import PublicPageHeader from "@/components/PublicPageHeader";
import BackToHomeLink from "@/components/BackToHomeLink";
import { APPLY_CONSENT_TEXT } from "@/lib/legalInfo";
import { formatPhoneNumber, formatBizRegNo, REGIONS, VEHICLE_TYPES_PUBLIC } from "@/lib/constants";
import MultiSelectTags from "@/components/MultiSelectTags";
import AddressSearch from "@/components/AddressSearch";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";

export default function ApplyPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showVehicleHint, setShowVehicleHint] = useState(false);

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

  if (success) {
    return (
      <div className="portal-theme">
        <main className="container" style={{ maxWidth: 480, paddingTop: 80, textAlign: "center" }}>
          <div className="card" style={{ padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 10 }}>신청이 접수되었습니다</h1>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
              담당자 검토 후 승인되면, 입력하신 이메일로 운송관리 화면 접속 정보를 안내드립니다.
              필요 시 확인 전화를 드릴 수 있습니다.
            </p>
            <div
              style={{
                background: "var(--accent-soft)",
                borderRadius: 10,
                padding: 14,
                fontSize: 12.5,
                color: "var(--text)",
                marginBottom: 24,
                textAlign: "left",
                lineHeight: 1.6,
              }}
            >
              💡 입력하신 연락처(<span className="num">{form.contact_phone}</span>)로 언제든{" "}
              <Link href="/status" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "underline", whiteSpace: "nowrap" }}>
                문의·신청 현황 조회
              </Link>
              에서 진행 상황을 확인하실 수 있습니다.
            </div>
            <Link href="/" className="btn">
              홈으로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="portal-theme public-form">
      <PublicPageHeader showStatusLink />

      <main className="container" style={{ maxWidth: 640, paddingTop: 40 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">운송관리 계정 신청</h1>
            <p className="page-desc">
              등록하시면 운송관리 화면에서 견적·배차·정산 현황을 직접 확인하실 수
              있습니다. 검토 후 계정을 발급해드립니다.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
            <div className="form-grid" style={{ padding: 0 }}>
              <div className="field">
                <label>회사명 *</label>
                <input value={form.company_name} onChange={(e) => setField("company_name", e.target.value)} />
              </div>
              <div className="field">
                <label>사업자등록번호</label>
                <input
                  value={form.business_reg_no}
                  onChange={(e) => setField("business_reg_no", formatBizRegNo(e.target.value))}
                  placeholder="숫자만 입력하면 자동으로 - 표시"
                />
              </div>
              <div className="field">
                <label>담당자명 *</label>
                <input value={form.contact_name} onChange={(e) => setField("contact_name", e.target.value)} />
              </div>
              <div className="field">
                <label>담당자 연락처 *</label>
                <input
                  value={form.contact_phone}
                  onChange={(e) => setField("contact_phone", formatPhoneNumber(e.target.value))}
                  placeholder="숫자만 입력하면 자동으로 - 표시"
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>담당자 이메일 (선택)</label>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 6px" }}>
                  입력하시면 승인·처리 결과를 이메일로도 안내해드립니다.
                </p>
                <input type="email" value={form.contact_email} onChange={(e) => setField("contact_email", e.target.value)} />
              </div>

              <AddressSearch
                label="주요 출발지 (선택)"
                value={form.main_origin}
                detailValue={form.main_origin_detail}
                onChange={(addr, sido, sigungu) =>
                  setForm((p) => ({ ...p, main_origin: addr, main_origin_sido: sido, main_origin_sigungu: sigungu }))
                }
                onDetailChange={(v) => setField("main_origin_detail", v)}
              />
              <AddressSearch
                label="주요 도착지 (선택)"
                value={form.main_destination}
                detailValue={form.main_destination_detail}
                onChange={(addr, sido, sigungu) =>
                  setForm((p) => ({
                    ...p,
                    main_destination: addr,
                    main_destination_sido: sido,
                    main_destination_sigungu: sigungu,
                  }))
                }
                onDetailChange={(v) => setField("main_destination_detail", v)}
              />

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>월 예상 운송건수 (선택)</label>
                <input
                  value={form.monthly_volume_estimate}
                  onChange={(e) => setField("monthly_volume_estimate", e.target.value)}
                  placeholder="예: 월 5~10건"
                />
              </div>
              <div className="field">
                <label>업종 (선택)</label>
                <input
                  value={form.industry}
                  onChange={(e) => setField("industry", e.target.value)}
                  placeholder="예: 제조업, 유통업 등"
                />
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                  예시: 제조업, 유통업, 건설업, 식품업, 전자상거래, 물류업 등
                </div>
              </div>
              <div className="field">
                <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  주 이용 차량 (선택)
                  <span
                    style={{ position: "relative", display: "inline-flex" }}
                    onMouseEnter={() => setShowVehicleHint(true)}
                    onMouseLeave={() => setShowVehicleHint(false)}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "var(--text-muted)",
                        color: "var(--bg)",
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: "help",
                        flexShrink: 0,
                      }}
                    >
                      !
                    </span>
                    {showVehicleHint && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: "calc(100% + 6px)",
                          left: 0,
                          zIndex: 10,
                          background: "var(--text)",
                          color: "var(--bg)",
                          fontSize: 11.5,
                          fontWeight: 400,
                          lineHeight: 1.5,
                          padding: "6px 10px",
                          borderRadius: 6,
                          width: 220,
                          whiteSpace: "normal",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                        }}
                      >
                        주로 이용하시는 차량 톤수를 선택해주세요. 예: {VEHICLE_TYPES_PUBLIC.join(", ")}
                      </span>
                    )}
                  </span>
                </label>
                <select value={form.preferred_vehicle} onChange={(e) => setField("preferred_vehicle", e.target.value)}>
                  <option value="">선택 안 함</option>
                  {VEHICLE_TYPES_PUBLIC.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>이용 지역 (선택, 중복 선택 가능)</label>
                <MultiSelectTags options={REGIONS} value={form.preferred_regions} onChange={(v) => setField("preferred_regions", v)} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>메모</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="운송 품목, 특이사항 등 자유롭게 남겨주세요"
                />
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginTop: 16,
                marginBottom: 18,
                fontSize: 12.5,
                color: "var(--text-muted)",
                cursor: "pointer",
                lineHeight: 1.5,
              }}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ margin: "2px 0 0", width: "auto", flexShrink: 0 }}
              />
              {/* 🔴 문구를 여기 직접 적지 말 것 — `lib/legalInfo.ts` 참고(14차).
                  내용은 그대로 두고 상수로 옮기기만 했다. */}
              <span>{APPLY_CONSENT_TEXT}</span>
            </label>

            {error && (
              <div className="error-box">
                {error}
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
            <button className="btn" type="submit" disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
              {saving ? "접수 중..." : "등록 신청하기"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--text-muted)", margin: "20px 0 0" }}>
          먼저 운임부터 확인하고 싶으신가요?{" "}
          <Link href="/quote" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            견적 문의하기
          </Link>
        </p>

        {/* "← 홈으로" — 🔴 헤더 로고와 동작이 다르다: 로고는 홈 맨 위로 가고, 이 링크는
            **왔던 자리로 되돌아간다**(랜딩 ⑥ 운송관리 섹션이 페이지 한참 아래라, 맨 위로
            튕기면 스크롤을 다시 내려야 했다 — 13차 PR #88 리뷰).
            ⚠️ 접수 완료 화면의 "홈으로 돌아가기" 버튼과는 별개다 — 그쪽은 신청을 마치고
            떠나는 자리라 홈 맨 위로 가는 것이 맞다. */}
        <div style={{ marginBottom: 60 }}>
          <BackToHomeLink />
        </div>
      </main>
    </div>
  );
}
