"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { VEHICLE_TYPES, formatPhoneNumber } from "@/lib/constants";
import DateTimePicker from "@/components/DateTimePicker";

declare global {
  interface Window {
    daum: any;
  }
}

const LOADING_METHODS = [
  { value: "기본운송", desc: "차량 적재함에서 물품을 상하차합니다" },
  { value: "지게차 상하차", desc: "파렛트로 작업된 제품을 지게차로 상하차합니다" },
  { value: "기사님 도움", desc: "일반화물·소형가전을 기사님과 함께 운반합니다" },
  { value: "협의 필요", desc: "현장 상황에 따라 별도로 협의합니다" },
];

export default function PublicQuotePage() {
  const [postcodeReady, setPostcodeReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    origin: "",
    originDetail: "",
    destination: "",
    destinationDetail: "",
    vehicle_type: VEHICLE_TYPES[0],
    item: "",
    loading_method: LOADING_METHODS[0].value,
    requested_pickup_at: "",
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

  function openAddressSearch(target: "origin" | "destination") {
    if (!postcodeReady || !window.daum) return;
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        const addr = data.roadAddress || data.jibunAddress;
        if (target === "origin") setForm((p) => ({ ...p, origin: addr, originDetail: "" }));
        else setForm((p) => ({ ...p, destination: addr, destinationDetail: "" }));
      },
    }).open();
  }

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // 희망 상차일시는 현재 시각 이후로만 선택 가능
  const nowDateTime = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  })();

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

    setSaving(true);

    const fullOrigin = [form.origin, form.originDetail].filter((v) => v.trim()).join(" ");
    const fullDestination = [form.destination, form.destinationDetail].filter((v) => v.trim()).join(" ");

    const { error: insertError } = await supabase.from("public_quote_requests").insert({
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      origin: fullOrigin,
      destination: fullDestination,
      vehicle_type: form.vehicle_type,
      item: form.item || null,
      loading_method: form.loading_method || null,
      requested_pickup_at: form.requested_pickup_at || null,
      notes: form.notes || null,
      status: "신규",
    });

    setSaving(false);
    if (insertError) {
      setError("문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
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
            <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 10 }}>문의가 접수되었습니다</h1>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
              담당자가 확인 후 남겨주신 연락처로 빠르게 안내드리겠습니다.
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
              💡 입력하신 연락처(<span className="num">{form.phone}</span>)로 나중에 언제든{" "}
              <Link href="/status" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "underline", whiteSpace: "nowrap" }}>
                문의 현황 조회
              </Link>
              에서 진행 상황을 확인하실 수 있습니다.
            </div>
            <Link href="/" className="btn">
              홈으로 돌아가기
            </Link>
          </div>
          <div className="card" style={{ padding: 24, marginTop: 16, textAlign: "left" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
              계속 거래하실 계획이신가요?
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>
              정식 화주로 등록하시면 화주포털에서 견적·배차·정산 현황을 직접 확인하실 수
              있습니다.
            </p>
            <Link href="/apply" className="btn-ghost" style={{ padding: "10px 18px", borderRadius: 10, display: "inline-flex" }}>
              화주 등록 신청하기 →
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
            <h1 className="page-title">견적 문의</h1>
            <p className="page-desc">
              출발지, 도착지, 물품, 희망 시간만 남겨주시면 가능 차량과 운임을 빠르게 안내드립니다.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ padding: 0, marginBottom: 4 }}>
              <div className="field">
                <label>신청자 성함 / 업체명 *</label>
                <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
              </div>
              <div className="field">
                <label>신청자 연락처 *</label>
                <input
                  value={form.phone}
                  onChange={(e) => setField("phone", formatPhoneNumber(e.target.value))}
                  placeholder="숫자만 입력하면 자동으로 - 표시"
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>이메일 (선택)</label>
                <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </div>
            </div>

            {/* 출발지 */}
            <div className="field" style={{ marginTop: 14, marginBottom: 18 }}>
              <label>출발지 *</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={form.origin}
                  onChange={(e) => setField("origin", e.target.value)}
                  placeholder="도로명주소 검색 또는 직접 입력"
                  autoComplete="off"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "0 10px", borderRadius: 6, fontSize: 12, whiteSpace: "nowrap", cursor: "pointer" }}
                  onClick={() => openAddressSearch("origin")}
                >
                  주소검색
                </button>
              </div>
              <input
                value={form.originDetail}
                onChange={(e) => setField("originDetail", e.target.value)}
                placeholder="상세주소 (선택)"
                style={{ marginTop: 6 }}
              />
            </div>

            {/* 도착지 */}
            <div className="field" style={{ marginBottom: 18 }}>
              <label>도착지 *</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={form.destination}
                  onChange={(e) => setField("destination", e.target.value)}
                  placeholder="도로명주소 검색 또는 직접 입력"
                  autoComplete="off"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "0 10px", borderRadius: 6, fontSize: 12, whiteSpace: "nowrap", cursor: "pointer" }}
                  onClick={() => openAddressSearch("destination")}
                >
                  주소검색
                </button>
              </div>
              <input
                value={form.destinationDetail}
                onChange={(e) => setField("destinationDetail", e.target.value)}
                placeholder="상세주소 (선택)"
                style={{ marginTop: 6 }}
              />
            </div>

            <div className="form-grid" style={{ padding: 0 }}>
              <div className="field">
                <label>희망 톤수</label>
                <select value={form.vehicle_type} onChange={(e) => setField("vehicle_type", e.target.value)}>
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>품목</label>
                <input value={form.item} onChange={(e) => setField("item", e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: 14, marginBottom: 4 }}>
              <label style={{ display: "block", fontSize: 12.5, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>
                상하차 방법
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                {LOADING_METHODS.map((m) => {
                  const active = form.loading_method === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setField("loading_method", m.value)}
                      className="card"
                      style={{
                        padding: 12,
                        textAlign: "left",
                        cursor: "pointer",
                        border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                        background: active ? "var(--accent-soft)" : "var(--surface)",
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>{m.value}</div>
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-grid" style={{ padding: 0 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <DateTimePicker
                  label="희망 상차 일시 (선택)"
                  value={form.requested_pickup_at}
                  onChange={(v) => setField("requested_pickup_at", v)}
                  minDateTime={nowDateTime}
                  minDateTimeLabel="현재 시각 이후로만 선택 가능합니다"
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>문의 내용</label>
                <textarea rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="반복 여부, 기타 참고사항 등 자유롭게 남겨주세요" />
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
                [필수] 입력하신 정보는 견적 상담 목적으로만 이용되며, 상담 완료 후 별도 보관 기간
                없이 처리됩니다. 개인정보 수집·이용에 동의합니다.
              </span>
            </label>

            {error && <div className="error-box">{error}</div>}
            <button className="btn" type="submit" disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
              {saving ? "접수 중..." : "견적 문의 보내기"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--text-muted)", margin: "20px 0 60px" }}>
          이미 거래 중이신가요?{" "}
          <Link href="/customer/login" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            화주포털 로그인
          </Link>
        </p>
      </main>
    </div>
  );
}
