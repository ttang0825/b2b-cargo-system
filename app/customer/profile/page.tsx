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
    setSaving(true);
    setError(null);

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
        <div className="pv2-prof-head">
          <div className="pv2-prof-avatar" aria-hidden="true">
            {initial}
          </div>
          <div className="pv2-prof-ident">
            <div className="pv2-prof-name">{editing ? "담당자 정보 수정" : saved.name || "-"}</div>
            {companyName && <div className="pv2-prof-company">{companyName}</div>}
          </div>
          {!editing && (
            <button type="button" className="pv2-block-action" onClick={() => setEditing(true)}>
              수정
            </button>
          )}
        </div>

        {!editing ? (
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
        ) : (
          <form className="pv2-prof-form" onSubmit={handleSave} onKeyDown={handleFormKeyDown}>
            <div className="pv2-field">
              <label className="pv2-field-label" htmlFor="pv2-prof-name">
                담당자명
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
                휴대폰
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
            {error && <div className="pv2-form-error">{error}</div>}
            <div className="pv2-prof-actions">
              <button className="pv2-btn-dark" type="submit" disabled={saving}>
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
