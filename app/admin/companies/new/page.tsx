"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentStaffId } from "@/lib/currentStaff";
import CompanyFieldInput from "@/components/CompanyFieldInput";
import SmsConfirmModal, { type SmsPreview } from "@/components/SmsConfirmModal";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import { formatPhoneNumber } from "@/lib/constants";
import {
  COMPANY_FIELDS,
  applyCompanyFieldChange,
  buildCompanyPayload,
  emptyCompanyForm,
  validateCompanyForm,
} from "@/lib/companyFields";

// ─────────────────────────────────────────────────────────────────────────────
// 신규 화주 **빠른 등록** 창구 (2026-09-22 · 사용자 요청)
//
//   *"활성화주를 바로 등록하고 계정발급을 바로 처리할 수 있는 창구가 있으면 좋을 것
//     같다. 신규업체 등록을 메인화면 어딘가에 두는건 어떨까?"*
//
// ── 🔴 왜 화면을 새로 만들었나 (기존 폼을 고치지 않은 이유) ────────────────
//
//   지금까지의 길은 **화면 셋을 거쳐 여섯 걸음**이었다 —
//     관리자 홈 → 화주 관리 → 「+ 신규 업체 등록」 → 저장 → 목록에서 그 업체를
//     다시 찾아 클릭 → 상세 → 「포털 계정 발급」.
//
//   그리고 **저장해도 활성 화주에 안 나타난다** — `/admin/companies` 등록 폼의
//   영업상태 기본값이 **`미접촉`** 인데, 활성 화주 목록(`/admin/customers`)은
//   `ACTIVE_CUSTOMER_STATUSES` **여섯 값**만 읽는다. 사용자가 말한
//   「활성화주를 바로 등록」이 지금 구조로는 **한 걸음이 더 필요한 일**이었다.
//
//   🔴 **그래서 기존 폼의 기본값을 바꾸지 않았다** — 그 폼은 **영업 대상 DB** 를
//      쌓는 자리라 `미접촉` 이 맞다(539건이 그렇게 들어와 있다). 여기만
//      **`견적요청`(활성)** 으로 연다. 🔴 **두 기본값을 같게 만들지 말 것.**
//
// ── 🔴 네 번째 입구지만 정의는 하나다 ─────────────────────────────────────
//
//   33차가 화주 항목의 입구 **셋**(등록·수정·승인)을 `lib/companyFields.ts`
//   한 정의처로 모았다. 이 화면이 **네 번째 입구**이므로 그 규칙을 그대로 지킨다 —
//   항목을 손으로 적지 않고 `COMPANY_FIELDS` 에서 **키로 골라** 쓰고, 저장은
//   `buildCompanyPayload()` 로만 한다.
//   🔴 **여기에 `insert({ name: ..., phone: ... })` 를 손으로 적지 말 것.**
//
// 🔴 **고르는 항목은 아홉 개뿐이다** — 나머지는 등록 뒤 화주 상세에서 채운다.
//    이 화면의 목적은 「빠르게 열어 주는 것」이지 화주 정보를 다 받는 것이 아니다.
// ─────────────────────────────────────────────────────────────────────────────

/** 🔴 `COMPANY_FIELDS` 의 키다 — 이름을 바꾸면 그 항목이 **조용히 사라진다**(아래 단언 참고). */
const QUICK_KEYS = [
  "name",
  "phone",
  "address",
  "biz_reg_no",
  "status",
  "contact_name",
  "contact_mobile",
  "contact_email",
  "billing_cycle_default",
] as const;

/**
 * 🔴 **활성 화주로 연다.** `/admin/customers` 의 `ACTIVE_CUSTOMER_STATUSES` 중
 *    가장 앞 단계이고, 견적을 내려고 등록하는 자리이니 이것이 맞다.
 * ⚠️ 담당자가 화면에서 바꿀 수 있다(영업상태 칸이 그대로 있다).
 */
const QUICK_STATUS = "견적요청";

type Issued = { login_id: string; password: string };

export default function CompanyQuickAddPage() {
  const [form, setForm] = useState<Record<string, any>>(() => ({
    ...emptyCompanyForm(),
    status: QUICK_STATUS,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 저장된 화주 — 🔴 이것이 있으면 2단계(계정 발급)다 */
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [sms, setSms] = useState<SmsPreview | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // 🔴 인라인 객체로 넘기지 말 것 — `CompanyFieldInput` 의 `memo` 가 무력해진다(33차 리뷰).
  const staticDeps = useMemo(
    () => ({ billing_cycle_default: form.billing_cycle_default }),
    [form.billing_cycle_default]
  );

  const setField = useCallback((key: string, value: any) => {
    setForm((prev) => applyCompanyFieldChange(prev, key, value));
  }, []);

  // 주소검색이 돌려주는 sido/sigungu 를 대응 컬럼에 같이 담는다(원칙 37번).
  const setAddressField = useCallback(
    (key: string, addr: string, sido: string, sigungu: string) => {
      setForm((prev) => ({
        ...prev,
        [key]: addr,
        [`${key}Detail`]: "",
        [`${key.replace(/_address$/, "")}_sido`]: sido,
        [`${key.replace(/_address$/, "")}_sigungu`]: sigungu,
      }));
    },
    []
  );

  const fields = useMemo(() => {
    const byKey = new Map(COMPANY_FIELDS.map((f) => [f.key, f]));
    // 🔴 **없는 키는 조용히 버리지 않는다** — `lib/companyFields.ts` 에서 이름이 바뀌면
    //    항목이 사라진 채로 배포되어 아무도 모른다(원칙 55번과 같은 결).
    return QUICK_KEYS.map((k) => {
      const f = byKey.get(k);
      if (!f) throw new Error(`COMPANY_FIELDS 에 '${k}' 가 없습니다 — lib/companyFields.ts 를 확인하십시오`);
      return f;
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validateCompanyForm(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    const staffId = await getCurrentStaffId();
    // 🔴 payload 는 `buildCompanyPayload()` 하나로 — 네 입구가 같은 정의를 읽어야 한다.
    // 🔴 `.select("id")` 를 빼지 말 것 — 바로 이어서 계정을 발급하려면 id 가 필요하다.
    const { data, error: insErr } = await supabase
      .from("companies")
      .insert({ ...buildCompanyPayload(form), created_by: staffId })
      .select("id,name")
      .single();
    setSaving(false);
    if (insErr || !data) {
      setError(insErr?.message || "등록하지 못했습니다.");
      return;
    }
    setCreated({ id: data.id, name: data.name });
  }

  async function handleIssue() {
    if (!created) return;
    setIssuing(true);
    setIssueError(null);
    try {
      const res = await fetch("/api/admin/create-portal-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: created.id,
          // 🔴 등록할 때 적은 담당자를 그대로 쓴다 — 여기서 다시 묻지 않는다(그것이
          //    「바로 처리」의 뜻이다). 비어 있으면 서버가 알아서 비운 채 발급한다.
          contact_mobile: String(form.contact_mobile || "").trim() || null,
          name: String(form.contact_name || "").trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIssueError(data.error || "계정 발급에 실패했습니다.");
        return;
      }
      setIssued({ login_id: data.login_id, password: data.password });
      // 🚨 **문자는 여기서 안 나간다** — 담당자가 확인창에서 [발송]을 눌러야 한다
      //    (다른 일곱 종과 같은 자세 · PR #73 리뷰).
      if (data.smsPreview) setSms(data.smsPreview);
    } catch {
      setIssueError("계정 발급 중 오류가 발생했습니다.");
    } finally {
      setIssuing(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(label);
        setTimeout(() => setCopied(null), 1500);
      },
      () => setCopied(null)
    );
  }

  function startOver() {
    setForm({ ...emptyCompanyForm(), status: QUICK_STATUS });
    setCreated(null);
    setIssued(null);
    setIssueError(null);
    setError(null);
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">신규 화주 빠른 등록</h1>
          <p className="page-desc">
            활성 화주로 등록하고 이어서 운송관리 계정까지 한 자리에서 발급합니다.
          </p>
        </div>
        <Link href="/admin/companies" className="btn btn-ghost">
          화주 관리로
        </Link>
      </div>

      {/* ── 1단계 — 등록 ──────────────────────────────────────────────────── */}
      <div className="card quickadd-card">
        <div className="quickadd-step">
          <span className={`quickadd-num${created ? " is-done" : ""}`}>1</span>
          <b>화주 등록</b>
          {created && <span className="quickadd-done">완료 — {created.name}</span>}
        </div>

        {!created ? (
          <form onSubmit={handleSave} onKeyDown={handleFormKeyDown}>
            {/* 🔴 항목을 손으로 적지 말 것 — `lib/companyFields.ts` 가 정의처다(33차). */}
            <div className="form-grid quickadd-grid">
              {fields.map((f) => (
                <CompanyFieldInput
                  key={f.key}
                  deps={staticDeps}
                  field={f}
                  value={form[f.key]}
                  detailValue={form[`${f.key}Detail`]}
                  tonnage={form.recommended_vehicle_tonnage}
                  bodytype={form.recommended_vehicle_bodytype}
                  onChange={setField}
                  onAddressChange={setAddressField}
                />
              ))}
            </div>
            {/* 🔴 **영업상태 기본값이 다르다는 것을 말한다** — 화주 관리의 등록 폼은
                `미접촉` 으로 열린다. 적어 두지 않으면 「왜 여기만 다르지」가 된다. */}
            <p className="quickadd-note">
              영업상태를 <b>견적요청</b>으로 열어 두었습니다 — 저장하면 바로 활성 화주
              목록에 나타납니다. (화주 관리의 등록 폼은 <b>미접촉</b>으로 열립니다)
            </p>
            <p className="quickadd-note">
              나머지 항목(업종·지역·주요 상하차지 등)은 등록 뒤 화주 상세에서 채우면 됩니다.
            </p>

            {error && <div className="error-box">{error}</div>}

            <div className="quickadd-foot">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "등록 중…" : "등록하고 계정 발급으로"}
              </button>
            </div>
          </form>
        ) : (
          <p className="quickadd-note">
            등록했습니다. 아래에서 운송관리 계정을 발급하거나, 상세 화면에서 나머지
            정보를 채울 수 있습니다.
          </p>
        )}
      </div>

      {/* ── 2단계 — 계정 발급 ─────────────────────────────────────────────── */}
      <div className={`card quickadd-card${created ? "" : " is-waiting"}`}>
        <div className="quickadd-step">
          <span className={`quickadd-num${issued ? " is-done" : ""}`}>2</span>
          <b>운송관리 계정 발급</b>
          {!created && <span className="quickadd-wait">화주를 먼저 등록해 주세요</span>}
        </div>

        {created && !issued && (
          <>
            <p className="quickadd-note">
              {String(form.contact_mobile || "").trim()
                ? `담당자 ${String(form.contact_name || "").trim() || "(이름 없음)"} · ${formatPhoneNumber(String(form.contact_mobile))} 로 발급합니다.`
                : "담당자 연락처를 안 적었습니다 — 계정은 발급되지만 안내 문자를 보낼 번호가 비어 있습니다(확인창에서 직접 넣을 수 있습니다)."}
            </p>
            {issueError && <div className="error-box">{issueError}</div>}
            <div className="quickadd-foot">
              <button type="button" className="btn" onClick={handleIssue} disabled={issuing}>
                {issuing ? "발급 중…" : "포털 계정 발급"}
              </button>
              <Link href={`/admin/companies/${created.id}`} className="btn btn-ghost">
                계정 없이 상세로 이동
              </Link>
            </div>
          </>
        )}

        {issued && (
          <>
            {/* 🔴 **한 번만 보여준다** — 비밀번호는 다시 못 꺼낸다(재발급만 된다). */}
            <div className="quickadd-cred">
              <div>
                아이디: <span className="num">{issued.login_id}</span>
                <button type="button" className="btn-ghost quickadd-copy" onClick={() => copy(issued.login_id, "id")}>
                  {copied === "id" ? "복사됨" : "복사"}
                </button>
              </div>
              <div>
                임시 비밀번호: <span className="num">{issued.password}</span>
                <button type="button" className="btn-ghost quickadd-copy" onClick={() => copy(issued.password, "pw")}>
                  {copied === "pw" ? "복사됨" : "복사"}
                </button>
              </div>
              <div className="quickadd-note">
                최초 로그인 시 비밀번호를 새로 설정하도록 되어 있습니다.
                <br />
                🔴 이 화면을 떠나면 임시 비밀번호는 다시 볼 수 없습니다 — 문자로 보내거나
                복사해 두십시오.
              </div>
            </div>
            <div className="quickadd-foot">
              <Link href={`/admin/companies/${created!.id}`} className="btn">
                화주 상세로 이동
              </Link>
              <button type="button" className="btn btn-ghost" onClick={startOver}>
                계속 등록
              </button>
            </div>
          </>
        )}
      </div>

      {/* 🚨 문자는 여기서만 나간다 — 담당자가 [발송]을 눌러야 한다 */}
      {sms && <SmsConfirmModal preview={sms} onSent={() => setSms(null)} onSkip={() => setSms(null)} />}
    </main>
  );
}
