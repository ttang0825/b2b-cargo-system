"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { VEHICLE_TYPES, formatPhoneNumber } from "@/lib/constants";
import { LOADING_METHODS } from "@/lib/loadingMethods";
import DateTimePicker from "@/components/DateTimePicker";
import AddressSearch from "@/components/AddressSearch";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import { localInputToISOString } from "@/lib/localDateTime";

export default function PublicQuotePage() {
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
    originSido: "",
    originSigungu: "",
    destination: "",
    destinationDetail: "",
    destinationSido: "",
    destinationSigungu: "",
    vehicle_type: VEHICLE_TYPES[0],
    item: "",
    pickup_loading_method: LOADING_METHODS[0].label as string,
    dropoff_loading_method: LOADING_METHODS[0].label as string,
    requested_pickup_at: "",
    notes: "",
  });

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
      origin_sido: form.originSido || null,
      origin_sigungu: form.originSigungu || null,
      destination: fullDestination,
      destination_sido: form.destinationSido || null,
      destination_sigungu: form.destinationSigungu || null,
      vehicle_type: form.vehicle_type,
      item: form.item || null,
      pickup_loading_method: form.pickup_loading_method || null,
      dropoff_loading_method: form.dropoff_loading_method || null,
      requested_pickup_at: localInputToISOString(form.requested_pickup_at),
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
              등록하시면 운송관리 화면에서 견적·배차·정산 현황을 직접 확인하실 수
              있습니다.
            </p>
            <Link href="/apply" className="btn-ghost" style={{ padding: "10px 18px", borderRadius: 10, display: "inline-flex" }}>
              고객 등록 신청하기 →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="portal-theme public-form">
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
          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
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
            <AddressSearch
              label="출발지"
              required
              style={{ marginTop: 14, marginBottom: 18 }}
              value={form.origin}
              detailValue={form.originDetail}
              onChange={(addr, sido, sigungu) =>
                setForm((p) => ({ ...p, origin: addr, originSido: sido, originSigungu: sigungu }))
              }
              onDetailChange={(v) => setField("originDetail", v)}
            />

            {/* 도착지 */}
            <AddressSearch
              label="도착지"
              required
              style={{ marginBottom: 18 }}
              value={form.destination}
              detailValue={form.destinationDetail}
              onChange={(addr, sido, sigungu) =>
                setForm((p) => ({ ...p, destination: addr, destinationSido: sido, destinationSigungu: sigungu }))
              }
              onDetailChange={(v) => setField("destinationDetail", v)}
            />

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

            {(
              [
                { key: "pickup_loading_method" as const, label: "상차 방법" },
                { key: "dropoff_loading_method" as const, label: "하차 방법" },
              ]
            ).map(({ key, label }) => (
              <div key={key} style={{ marginTop: 14, marginBottom: 4 }}>
                <label style={{ display: "block", fontSize: 12.5, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>
                  {label}
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                  {LOADING_METHODS.map((m) => {
                    const active = form[key] === m.label;
                    return (
                      <button
                        key={m.label}
                        type="button"
                        onClick={() => setField(key, m.label)}
                        className="card"
                        style={{
                          padding: 12,
                          textAlign: "left",
                          cursor: "pointer",
                          border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                          background: active ? "var(--accent-soft)" : "var(--surface)",
                        }}
                      >
                        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>{m.label}</div>
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

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
            로그인
          </Link>
        </p>
      </main>
    </div>
  );
}
