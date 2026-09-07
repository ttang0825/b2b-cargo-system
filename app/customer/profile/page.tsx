"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { formatPhoneNumber } from "@/lib/constants";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";

export default function PortalProfilePage() {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saved, setSaved] = useState({
    name: "",
    contact_position: "",
    contact_mobile: "",
    email: "",
  });
  const [form, setForm] = useState({
    name: "",
    contact_position: "",
    contact_mobile: "",
    email: "",
  });

  async function load() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    const { data: account } = await supabase
      .from("customer_accounts")
      .select("name,contact_position,contact_mobile,email,companies(name)")
      .eq("auth_user_id", session.user.id)
      .single();
    if (account) {
      setCompanyName((account.companies as any)?.name || "");
      const values = {
        name: account.name || "",
        contact_position: account.contact_position || "",
        contact_mobile: account.contact_mobile || "",
        email: account.email || "",
      };
      setSaved(values);
      setForm(values);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 🔴 라벨의 `*` 는 실제로 막아야 뜻이 선다 — 표시만 하고 통과시키면 거짓 표시가 된다.
    //    막는 방식은 발주요청과 같다(네이티브 `required` 가 아니라 제출 직전 JS 검증 +
    //    인라인 에러) — `required` 는 React 핸들러보다 먼저 걸려 에러 문구가 안 뜬다.
    //    ⚠️ 서버(`/api/customer/update-contact`)는 여전히 빈 값을 받는다 — 그쪽은 화이트
    //    리스트가 하는 일이라 이번 범위에서 손대지 않았다.
    if (!form.name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!form.contact_mobile.trim()) {
      setError("휴대폰 번호를 입력해주세요.");
      return;
    }

    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      setError("로그인이 만료되었습니다. 다시 로그인해주세요.");
      return;
    }

    const res = await fetch("/api/customer/update-contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(form),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "저장에 실패했습니다.");
      return;
    }
    setSaved(form);
    setEditing(false);
  }

  if (loading) return <div className="pv2-empty">불러오는 중...</div>;

  // 🔴 이름이 비면 상호 첫 글자로 떨어뜨린다 — 원형이 빈 채로 남으면 무엇이 안 채워진
  //    것인지 화면만 봐서는 알 수 없다. 둘 다 없을 때만 물음표다.
  const initial = (saved.name || companyName || "?").trim().charAt(0) || "?";

  return (
    <>
      <div className="pv2-page-head pv2-page-head-tight">
        <h1 className="pv2-page-title">담당자 정보</h1>
        <p className="pv2-page-desc">
          {companyName ? `${companyName} · ` : ""}이 계정으로 로그인한 담당자 본인의 정보입니다.
          같은 회사의 다른 담당자 계정에는 영향을 주지 않습니다.
        </p>
      </div>

      <div className="pv2-prof-card">
        {/* 🔴 이름은 항목 행이 아니라 카드 머리에 있다(시안) — 아래 행 목록으로 되돌리지
            말 것. 담당자 본인의 화면이라 "누구의 정보인지"가 먼저 읽혀야 한다.
            🔴 「수정」도 페이지 머리가 아니라 이 카드 안이다 — 고칠 대상 바로 위에 둔다. */}
        {!editing ? (
          <>
            <div className="pv2-prof-head">
              <div className="pv2-prof-avatar" aria-hidden="true">
                {initial}
              </div>
              <div className="pv2-prof-ident">
                <div className="pv2-prof-name">{saved.name || "-"}</div>
                {companyName && <div className="pv2-prof-company">{companyName}</div>}
              </div>
              <button type="button" className="pv2-block-action" onClick={() => setEditing(true)}>
                수정
              </button>
            </div>
            <div className="pv2-prof-rows">
              <div className="pv2-prof-row">
                <div className="pv2-prof-k">직책</div>
                <div className="pv2-prof-v">{saved.contact_position || "-"}</div>
              </div>
              <div className="pv2-prof-row">
                <div className="pv2-prof-k">휴대폰</div>
                <div className="pv2-prof-v">{saved.contact_mobile || "-"}</div>
              </div>
              <div className="pv2-prof-row">
                <div className="pv2-prof-k">이메일</div>
                <div className="pv2-prof-v">{saved.email || "-"}</div>
              </div>
            </div>
          </>
        ) : (
          <form className="pv2-prof-form" onSubmit={handleSave} onKeyDown={handleFormKeyDown}>
            {/* 🔴 수정 중에는 아바타·상호를 그리지 않는다(시안) — 지금 하는 일이 「고치는
                것」이라 무엇을 고치는 화면인지가 먼저 읽혀야 하고, 아바타는 이름 칸을
                고치는 동안 옛 이름의 첫 글자를 계속 보여줘 어긋난다. */}
            <div className="pv2-prof-edithead">
              <h2 className="pv2-prof-edittitle">담당자 정보 수정</h2>
              <span className="pv2-prof-edithint">변경 후 저장을 눌러주세요</span>
            </div>
            {/* 🔴 데스크탑 **2열**이다(시안) — 한 줄에 하나씩 쌓으면 카드가 두 배로 길어진다.
                모바일에서만 1열로 접힌다. */}
            <div className="pv2-prof-grid">
              <div className="pv2-field">
                <label className="pv2-field-label" htmlFor="pv2-prof-name">
                  이름 *
                </label>
                <input
                  id="pv2-prof-name"
                  className="pv2-input pv2-input-sm"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </div>
              <div className="pv2-field">
                <label className="pv2-field-label" htmlFor="pv2-prof-position">
                  직책
                </label>
                <input
                  id="pv2-prof-position"
                  className="pv2-input pv2-input-sm"
                  value={form.contact_position}
                  onChange={(e) => setField("contact_position", e.target.value)}
                />
              </div>
              <div className="pv2-field">
                <label className="pv2-field-label" htmlFor="pv2-prof-mobile">
                  휴대폰 *
                </label>
                <input
                  id="pv2-prof-mobile"
                  className="pv2-input pv2-input-sm"
                  value={form.contact_mobile}
                  onChange={(e) => setField("contact_mobile", formatPhoneNumber(e.target.value))}
                  placeholder="숫자만 입력하면 자동으로 - 표시"
                />
              </div>
              <div className="pv2-field">
                <label className="pv2-field-label" htmlFor="pv2-prof-email">
                  이메일
                </label>
                <input
                  id="pv2-prof-email"
                  className="pv2-input pv2-input-sm"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>
            </div>
            {error && <div className="pv2-form-error">{error}</div>}
            {/* 🔴 저장은 **옐로**다(시안) — 발주요청 제출(`.pv2-submit`)과 같은 어휘다.
                🔴 두 버튼은 왼쪽에 붙고 **글자 폭**이다 — 반반으로 늘리지 말 것(시안).
                모바일에서만 저장이 남는 폭을 먹는다. */}
            <div className="pv2-prof-actions">
              <button className="pv2-prof-save" type="submit" disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                className="pv2-btn-ghost"
                onClick={() => {
                  setForm(saved);
                  setEditing(false);
                  setError(null);
                }}
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
