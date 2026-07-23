"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { formatPhoneNumber, formatBizRegNo } from "@/lib/constants";

declare global {
  interface Window {
    daum: any;
  }
}

export default function ApplyPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [postcodeReady, setPostcodeReady] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    business_reg_no: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    main_origin: "",
    main_destination: "",
    monthly_volume_estimate: "",
    notes: "",
  });

  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) {
      setPostcodeReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => setPostcodeReady(true);
    document.body.appendChild(script);
  }, []);

  function openAddressSearch(target: "main_origin" | "main_destination") {
    if (!postcodeReady || !window.daum) return;
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        const addr = data.roadAddress || data.jibunAddress;
        setForm((p) => ({ ...p, [target]: addr }));
      },
    }).open();
  }

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.company_name.trim() || !form.contact_name.trim() || !form.contact_phone.trim()) {
      setError("회사명, 담당자명, 담당자 연락처는 필수입니다.");
      return;
    }
    if (!form.contact_email.trim()) {
      setError("담당자 이메일은 필수입니다. 승인 시 이 이메일로 화주포털 계정이 발급됩니다.");
      return;
    }
    if (!agreed) {
      setError("개인정보 수집·이용에 동의해주셔야 신청을 접수할 수 있습니다.");
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("customer_applications").insert({
      company_name: form.company_name,
      business_reg_no: form.business_reg_no || null,
      contact_name: form.contact_name,
      contact_phone: form.contact_phone,
      contact_email: form.contact_email,
      main_origin: form.main_origin || null,
      main_destination: form.main_destination || null,
      monthly_volume_estimate: form.monthly_volume_estimate || null,
      notes: form.notes || null,
      status: "검토중",
    });

    setSaving(false);
    if (insertError) {
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
              담당자 검토 후 승인되면, 입력하신 이메일로 화주포털 접속 정보를 안내드립니다.
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
    <div className="portal-theme">
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div
          className="container"
          style={{ padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Link href="/" className="brand" style={{ fontSize: 17, textDecoration: "none" }}>
            WeCarry 운송
          </Link>
          <Link
            href="/status"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--accent)",
              padding: "8px 14px",
              borderRadius: 8,
              background: "var(--accent-soft)",
              textDecoration: "none",
            }}
          >
            문의·신청 현황 조회
          </Link>
        </div>
      </header>

      <main className="container" style={{ maxWidth: 640, paddingTop: 40 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">화주 등록 신청</h1>
            <p className="page-desc">
              정식 화주로 등록하시면 화주포털에서 견적·배차·정산 현황을 직접 확인하실 수
              있습니다. 검토 후 계정을 발급해드립니다.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit}>
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
                <label>담당자 이메일 *</label>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 6px" }}>
                  승인 시 이 이메일로 화주포털 로그인 계정이 발급됩니다. 정확히 입력해주세요.
                </p>
                <input type="email" value={form.contact_email} onChange={(e) => setField("contact_email", e.target.value)} />
              </div>

              <div className="field">
                <label>주요 출발지 (선택)</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={form.main_origin}
                    onChange={(e) => setField("main_origin", e.target.value)}
                    placeholder="도로명주소 검색 또는 직접 입력"
                    autoComplete="off"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "0 10px", borderRadius: 6, fontSize: 12, whiteSpace: "nowrap", cursor: "pointer" }}
                    onClick={() => openAddressSearch("main_origin")}
                  >
                    주소검색
                  </button>
                </div>
              </div>
              <div className="field">
                <label>주요 도착지 (선택)</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={form.main_destination}
                    onChange={(e) => setField("main_destination", e.target.value)}
                    placeholder="도로명주소 검색 또는 직접 입력"
                    autoComplete="off"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "0 10px", borderRadius: 6, fontSize: 12, whiteSpace: "nowrap", cursor: "pointer" }}
                    onClick={() => openAddressSearch("main_destination")}
                  >
                    주소검색
                  </button>
                </div>
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>월 예상 운송건수 (선택)</label>
                <input
                  value={form.monthly_volume_estimate}
                  onChange={(e) => setField("monthly_volume_estimate", e.target.value)}
                  placeholder="예: 월 5~10건"
                />
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
              <span>
                [필수] 입력하신 정보는 화주 등록 심사 목적으로만 이용되며, 승인 여부와 무관하게
                안전하게 관리됩니다. 개인정보 수집·이용에 동의합니다.
              </span>
            </label>

            {error && <div className="error-box">{error}</div>}
            <button className="btn" type="submit" disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
              {saving ? "접수 중..." : "등록 신청하기"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--text-muted)", margin: "20px 0 60px" }}>
          먼저 운임부터 확인하고 싶으신가요?{" "}
          <Link href="/quote" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            견적 문의하기
          </Link>
        </p>
      </main>
    </div>
  );
}
