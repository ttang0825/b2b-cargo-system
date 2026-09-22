"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentStaffRole } from "@/lib/currentStaff";
import SmsConfirmModal, { type SmsPreview } from "@/components/SmsConfirmModal";
import { fetchRewardStatusSmsPreview } from "@/lib/notifyRewardSms";
import {
  REWARD_METHOD_OPTIONS,
  rewardMethodLabel,
  type RewardMethod,
} from "@/lib/rewardCalc";

// ─────────────────────────────────────────────────────────────────────────────
// 화주 상세 「기업고객 리워드」 블록 (B장, 2026-09-20)
//
// 🔴 **`lib/companyFields.ts` 에 넣지 않았다** — 리워드는 `companies` 가 아니라
//    **별도 표**(`reward_memberships`)이고 저장 경로도 다르다(service_role 라우트).
//    그 파일에 넣으면 화주 저장이 리워드까지 같이 쓰려 들고, 그러면 화주 등록·승인
//    경로 셋이 전부 리워드를 알아야 한다.
//
// 🔴 **화면이 리워드 표를 직접 읽지 않는다** — 세 표가 RLS on + 정책 0개라
//    `authenticated` 로는 아예 닿지 않는다(그게 설계다). 읽기·쓰기 모두 서버 라우트.
//    🔴 **「안 읽히니 정책을 열자」로 가지 말 것** — 화주포털 계정도 `authenticated` 라
//       정책을 여는 순간 화주가 남의 회사 적립금을 읽는다.
//
// 🔴 **편집은 관리자만.** 여기서 버튼을 감추는 것과 라우트의 `role === "admin"` 검사는
//    **한 벌**이다(원칙 25번) — 화면만 감추면 콘솔에서 그대로 부를 수 있다.
//
// 🔴 **설정 넷은 각각 독립이다** — 적립 ON/OFF · 포털 노출 · 혜택 방식 · 문자 안내.
//    하나로 묶으면 **「적립은 하되 포털에는 안 보이고 상품권으로 주는」 고객**을
//    운영할 수 없게 된다(전달문서 §38 ②).
// ─────────────────────────────────────────────────────────────────────────────

type Campaign = {
  id: string;
  name: string;
  start_date: string;
  earn_end_date: string;
  use_end_date: string;
  earn_rate: number;
  minimum_use_amount: number;
};

type Membership = {
  enabled: boolean;
  portal_visible: boolean;
  reward_method: RewardMethod;
  sms_notification_enabled: boolean;
  /**
   * 🚨 **「운송완료 확인창」만 끄는 자식 스위치**(2026-09-22) — 부모는 바로 위
   *    `sms_notification_enabled` 이고, 그것이 꺼지면 이 값과 무관하게 셋 다
   *    안 나간다. 🔴 **기본이 켜짐이다**(지금 동작 유지 · DB `default true`).
   */
  sms_on_delivery_enabled: boolean;
  started_at: string | null;
  ended_at: string | null;
  internal_note: string | null;
};

type LedgerRow = {
  id: string;
  transaction_type: string;
  amount: number;
  earning_base_amount: number | null;
  description: string | null;
  /** 🚨 화주에게 보인 한 줄(3차) — `description`(내부 사유)과 **다른 칸이다** */
  customer_note?: string | null;
  created_at: string;
};

const won = (n: number | null | undefined) => `${Math.round(n || 0).toLocaleString()}원`;
const ymd = (s: string | null | undefined) => (s ? s.slice(0, 10).replace(/-/g, ".") : "—");

const EMPTY_FORM: Membership = {
  enabled: false,
  portal_visible: false,
  reward_method: "manual",
  sms_notification_enabled: false,
  // 🔴 **넷과 달리 기본이 `true` 다** — DB `default true` 와 같아야 한다.
  //    false 로 두면 리워드를 처음 켜는 화주가 **아무도 끄지 않았는데** 운송완료
  //    안내만 빠진 채로 저장된다.
  sms_on_delivery_enabled: true,
  started_at: null,
  ended_at: null,
  internal_note: null,
};

export default function CompanyRewardPanel({ companyId }: { companyId: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [balance, setBalance] = useState({ balance: 0, earned: 0, used: 0 });
  /**
   * 🔴 **예상 적립 — 아직 입금 확인이 안 된 건의 합계다.** 원장에는 한 줄도
   *    들어가지 않고 표시 시점에만 센다. 🔴 `balance` 에 더하지 말 것 —
   *    받지 않은 돈이 적립금으로 읽히면 화주에게 그만큼 약속한 것이 된다.
   */
  const [pending, setPending] = useState<{ amount: number; count: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔴 **로딩 실패와 액션 실패를 나눈다**(원칙 33번 — 이 저장소에서 **네 번** 난 자리).
  //    하나로 두면 저장에 실패했을 때 이미 불러온 블록이 통째로 오류로 덮인다.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Membership>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  /** 차감·현황 안내 문자의 확인창 — 🔴 `null` 이면 안 뜬다 */
  const [smsPreview, setSmsPreview] = useState<SmsPreview | null>(null);
  const [smsLoading, setSmsLoading] = useState(false);
  /**
   * 🔴 **액션 실패는 로딩 실패(`loadError`)·저장 실패(`saveError`)와 따로 둔다**
   *    (원칙 33번) — 섞으면 문자 준비 실패가 이미 불러온 카드를 통째로 덮는다.
   *    이 저장소에서 같은 버그를 네 번 겪은 자리다.
   */
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [res, preRes] = await Promise.all([
        fetch(`/api/admin/reward/summary?company_id=${encodeURIComponent(companyId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/admin/reward/preview?company_id=${encodeURIComponent(companyId)}`, {
          cache: "no-store",
        }),
      ]);
      const json = await res.json().catch(() => ({}));
      // 🔴 `error` 를 삼키지 않는다(원칙 55번) — 실패를 「적립 0원」으로 두면
      //    담당자가 「이 화주는 리워드를 안 쓰는구나」로 잘못 읽는다.
      if (!res.ok) throw new Error(json.error || "리워드 정보를 불러오지 못했습니다.");
      setCampaign(json.campaign || null);
      setMembership(json.membership || null);
      setBalance({
        balance: json.balance || 0,
        earned: json.earned || 0,
        used: json.used || 0,
      });

      // 🔴 예상 적립이 실패해도 **본문(설정·잔액)은 그대로 그린다** — 곁다리가
      //    본문을 막지 않는다. 대신 `null` 로 두어 그 칸을 아예 안 그린다
      //    (0원으로 그리면 「미입금 건이 없다」는 거짓말이 된다).
      const pre = await preRes.json().catch(() => ({}));
      setPending(preRes.ok ? { amount: pre.total || 0, count: pre.count || 0 } : null);
    } catch (e: any) {
      setLoadError(e?.message || "리워드 정보를 불러오지 못했습니다.");
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
    getCurrentStaffRole().then((r) => setIsAdmin(r === "admin"));
  }, [load]);

  function startEdit() {
    // 🔴 **`?? true` 는 보험이다** — DB 가 먼저 반영되므로 이 칸은 항상 온다.
    //    다만 없는 응답을 만나면 **켜짐**(지금 동작)으로 떨어져야지, `undefined`
    //    가 체크박스에 들어가 React 가 uncontrolled 로 바꿔 버리면 안 된다.
    setForm(
      membership
        ? { ...membership, sms_on_delivery_enabled: membership.sms_on_delivery_enabled ?? true }
        : { ...EMPTY_FORM }
    );
    setSaveError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/reward/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId, ...form }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "저장하지 못했습니다.");
      setEditing(false);
      await load();
    } catch (e: any) {
      // 🔴 **폼을 비우거나 접지 않는다**(원칙 33번) — 적은 것을 잃지 않게.
      setSaveError(e?.message || "저장하지 못했습니다.");
    }
    setSaving(false);
  }

  /**
   * 「적립 안내 문자」 — 🔴 **여기서 보내지 않는다.** 미리보기를 받아 확인창을 띄우고,
   * 담당자가 [발송]을 눌러야 나간다(리워드 문자 셋이 전부 같은 자세다).
   *
   * 🔴 **못 만든 이유를 말해준다**(원칙 55번) — 조용히 아무 일도 안 일어나면
   *    담당자가 버튼이 고장난 것으로 읽는다. 사유는 셋이다:
   *    리워드 꺼짐 · 문자 안내 꺼짐 · 아직 알릴 숫자가 없음.
   */
  async function sendStatusSms() {
    setSmsLoading(true);
    setActionError(null);
    const preview = await fetchRewardStatusSmsPreview({ companyId });
    setSmsLoading(false);
    if (!preview) {
      setActionError(
        "안내할 내용이 없습니다. 「리워드 적용」과 「문자 적립 안내」가 켜져 있는지, 적립되었거나 적립 예정인 운송이 있는지 확인해 주세요."
      );
      return;
    }
    setSmsPreview(preview);
  }

  async function openLedger() {
    setLedgerOpen(true);
    setLedger(null);
    try {
      const res = await fetch(
        `/api/admin/reward/ledger?company_id=${encodeURIComponent(companyId)}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "내역을 불러오지 못했습니다.");
      setLedger(json.rows || []);
    } catch (e: any) {
      setLedger([]);
      setSaveError(e?.message || "내역을 불러오지 못했습니다.");
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 0 }}>기업고객 리워드</h3>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>불러오는 중…</div>
      </div>
    );
  }

  // 🔴 **아무것도 안 그리는 분기를 만들지 말 것**(PR #154 교훈) — 조회가 실패했는데
  //    블록이 사라지면 담당자는 「이 화면에 리워드가 원래 없다」고 읽는다.
  if (loadError || !campaign) {
    return (
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 10 }}>기업고객 리워드</h3>
        <div className="error-box" style={{ fontSize: 12 }}>
          {loadError || "활성 캠페인이 없습니다."}
        </div>
      </div>
    );
  }

  const on = membership?.enabled === true;

  return (
    <div className="card reward-panel" style={{ padding: 20, marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        기업고객 리워드
        <span className={`reward-tag ${on ? "reward-tag-on" : "reward-tag-off"}`}>
          {on ? "적용 중" : "미적용"}
        </span>
        <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>
          {campaign.name}
        </span>
      </h3>

      {editing ? (
        <div className="reward-form">
          <label className="reward-check">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            <span>
              <b>리워드 적용</b>
              {/* 🔴 OFF 는 「신규 적립 중단」이다 — 기존 적립금을 없애는 것이 아니다.
                  화면에도 그렇게 적는다(전달문서 §28). */}
              <em>끄면 새로 쌓이지 않습니다 — 이미 쌓인 적립금은 그대로 남습니다.</em>
            </span>
          </label>

          <label className="reward-check">
            <input
              type="checkbox"
              checked={form.portal_visible}
              onChange={(e) => setForm({ ...form, portal_visible: e.target.checked })}
            />
            <span>
              <b>화주포털 노출</b>
              {/* 🔴 2026-09-21 부터 **실제로 동작한다**(2차) — 이 칸이 꺼져 있으면
                  화주포털의 「적립금」 메뉴·홈 카드가 **통째로 안 그려지고**,
                  `/api/customer/reward` 도 금액을 주지 않는다.
                  🔴 「2차 작업 후 동작합니다」로 되돌리지 말 것. */}
              <em>켜면 화주가 포털에서 적립금과 적립 내역을 볼 수 있습니다.</em>
            </span>
          </label>

          <div className="field">
            <label>혜택 제공 방식</label>
            <select
              value={form.reward_method}
              onChange={(e) => setForm({ ...form, reward_method: e.target.value as RewardMethod })}
            >
              {REWARD_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <label className="reward-check">
            <input
              type="checkbox"
              checked={form.sms_notification_enabled}
              onChange={(e) => setForm({ ...form, sms_notification_enabled: e.target.checked })}
            />
            <span>
              <b>문자 적립 안내</b>
              {/* 🔴 2026-09-21 부터 **동작한다**(2차) — 적립이 확정되는 순간(입금 확인)
                  담당자에게 **확인창**이 뜨고, [발송]을 눌러야 나간다.
                  🚨 **「자동으로 발송됩니다」로 적지 말 것** — 담당자가 그 말을 믿고
                  확인창을 건너뛰면 화주는 문자를 못 받는다(사용자 확정 2026-09-21).
                  🔴 「2차 작업 후 동작합니다」로도 되돌리지 말 것. */}
              <em>적립될 때 발송 확인창이 뜹니다. 확인 후 [발송]을 눌러야 나갑니다.</em>
            </span>
          </label>

          {/* 🚨 **「운송완료 확인창」만 끄는 자식 스위치**(2026-09-22 · 사용자
              *"운송완료 확인창만 따로 끄는 스위치 만들어줘"*).
              🔴 **부모가 꺼져 있으면 아무 일도 하지 않는다** — 그때는 비활성으로
                 두고 그 사실을 말한다. 🔴 **감추지 말 것**(설정이 없어진 것으로 읽힌다).
              🔴 **수동 「적립 안내 문자」 버튼은 이 칸과 무관하다** — 꺼도 담당자는
                 언제든 보낼 수 있고, 그것이 이 스위치를 「안 보낸다」가 아니라
                 「자동으로 뜨지 않는다」로 만드는 이유다. */}
          <label
            className={`reward-check reward-check-sub${
              form.sms_notification_enabled ? "" : " is-muted"
            }`}
          >
            <input
              type="checkbox"
              checked={form.sms_on_delivery_enabled}
              disabled={!form.sms_notification_enabled}
              onChange={(e) =>
                setForm({ ...form, sms_on_delivery_enabled: e.target.checked })
              }
            />
            <span>
              <b>└ 운송완료 때도 안내</b>
              <em>
                {form.sms_notification_enabled
                  ? "끄면 배차를 운송완료로 바꿀 때 확인창이 뜨지 않습니다. 적립·차감 안내와 화주 상세의 「적립 안내 문자」 버튼은 그대로입니다."
                  : "위 「문자 적립 안내」를 켜야 쓸 수 있습니다."}
              </em>
            </span>
          </label>

          <div className="field">
            <label>적용 시작일</label>
            <input
              type="date"
              value={form.started_at || ""}
              onChange={(e) => setForm({ ...form, started_at: e.target.value || null })}
            />
            <div className="reward-hint">이 날짜 이후에 만들어진 정산 건부터 적립됩니다.</div>
          </div>

          <div className="field">
            <label>내부 메모</label>
            <textarea
              rows={2}
              value={form.internal_note || ""}
              onChange={(e) => setForm({ ...form, internal_note: e.target.value })}
            />
          </div>

          {/* 🔴 오류는 **그 버튼 옆**에(원칙 33번) — 맨 위에 그리면 여기서 한참 떨어진다 */}
          {saveError && (
            <div className="error-box" style={{ fontSize: 12, marginBottom: 8 }}>
              {saveError}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? "저장 중…" : "저장"}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="reward-kv">
            <Row label="리워드 적용" value={on ? "ON" : "OFF"} />
            <Row label="적립률" value={`${(campaign.earn_rate * 100).toFixed(campaign.earn_rate * 100 % 1 ? 1 : 0)}%`} />
            <Row label="화주포털 노출" value={membership?.portal_visible ? "노출" : "비노출"} />
            <Row label="혜택 제공 방식" value={rewardMethodLabel(membership?.reward_method)} />
            <Row label="문자 적립 안내" value={membership?.sms_notification_enabled ? "ON" : "OFF"} />
            {/* 🔴 **부모가 꺼져 있으면 「—」다** — 그때 「ON」이라 적으면 운송완료마다
                문자가 나가는 것으로 읽힌다(실제로는 부모가 셋 다 막고 있다). */}
            <Row
              label="운송완료 때도 안내"
              value={
                !membership?.sms_notification_enabled
                  ? "—"
                  : membership?.sms_on_delivery_enabled === false
                    ? "OFF"
                    : "ON"
              }
            />
            <Row label="적용 시작일" value={ymd(membership?.started_at)} />
            <Row label="적립 종료일" value={ymd(campaign.earn_end_date)} />
            <Row label="사용 기한" value={ymd(campaign.use_end_date)} />
          </div>
          {membership?.internal_note && (
            <div className="reward-note">{membership.internal_note}</div>
          )}

          <div className="reward-balance">
            <div>
              <span>현재 적립금</span>
              <b>{won(balance.balance)}</b>
            </div>
            <div>
              <span>누적 적립</span>
              <b>{won(balance.earned)}</b>
            </div>
            <div>
              <span>누적 사용·회수</span>
              <b>{won(balance.used)}</b>
            </div>
            {/* 🔴 **잔액과 나란히 두되 말로 갈라 둔다** — 「예상」·「미입금」이 둘 다
                들어가야 담당자가 확정 적립금과 헷갈리지 않는다. */}
            {pending && (
              <div className="reward-pending">
                <span>예상 적립 (미입금 {pending.count}건)</span>
                <b>{pending.amount > 0 ? `+${won(pending.amount)}` : won(0)}</b>
              </div>
            )}
          </div>

          {saveError && (
            <div className="error-box" style={{ fontSize: 12, marginBottom: 8 }}>
              {saveError}
            </div>
          )}
          {/* 🔴 **누른 자리 바로 위에 띄운다**(원칙 33번 · PR #154 의 교훈) —
              카드 맨 위에만 그리면 버튼에서 멀어 「아무 일도 안 일어난다」가 된다. */}
          {actionError && (
            <div className="error-box" style={{ fontSize: 12, marginBottom: 8 }}>
              {actionError}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={openLedger}>
              적립·사용 내역 보기
            </button>
            {/* 🚨 **이 버튼이 리워드의 주 채널이다**(2026-09-21 사용자 확정) —
                포털은 대부분 꺼져 있고, 화주가 「얼마가 쌓이고 있는지」를 아는 길이
                이 문자다. 🔴 관리자 전용 블록 **밖**에 둔다(재직 직원이면 누구나
                안내할 수 있다 — 다른 문자 발송 버튼과 같은 기준이고, 설정·조정만
                관리자다). 🔴 감추거나 지우지 말 것. */}
            <button
              className="btn btn-ghost"
              onClick={sendStatusSms}
              disabled={smsLoading}
            >
              {smsLoading ? "준비 중…" : "적립 안내 문자"}
            </button>
            {isAdmin && (
              <>
                <button className="btn btn-ghost" onClick={() => setAdjustOpen(true)}>
                  수동 조정
                </button>
                <button className="btn btn-ghost" onClick={startEdit}>
                  설정 수정
                </button>
              </>
            )}
          </div>
        </>
      )}

      {ledgerOpen && (
        <LedgerModal rows={ledger} onClose={() => setLedgerOpen(false)} />
      )}
      {adjustOpen && (
        <AdjustModal
          companyId={companyId}
          onClose={() => setAdjustOpen(false)}
          onDone={async (sms) => {
            setAdjustOpen(false);
            await load();
            // 🔴 **조정이 저장된 뒤에 띄운다** — 창을 먼저 띄우면 담당자가 [발송]을
            //    눌렀을 때 아직 없는 원장 줄을 가리킨다.
            if (sms) setSmsPreview(sms);
          }}
        />
      )}
      {/* ── 차감 안내 문자 확인창 (3차, 2026-09-21) ──────────────────────────
          🚨 **문자는 여기서만 나간다.** 서버는 문구만 만들고, 담당자가 [발송]을
             눌러야 `/api/admin/send-sms` 가 돈다(적립 안내와 **같은 자세**).
          🔴 **자동 발송으로 되돌리지 말 것**(2026-09-21 사용자 확정). */}
      {smsPreview && (
        <SmsConfirmModal
          preview={smsPreview}
          onSent={() => setSmsPreview(null)}
          onSkip={() => setSmsPreview(null)}
        />
      )}
    </div>
  );
}

/**
 * 🔴 기존 모달과 **같은 값**이다(`AmendmentReasonModal` 등) — 이 저장소에는 모달용
 *    CSS 클래스가 없고 전부 인라인 style 이다. 새 클래스를 만들면 판본이 갈린다.
 * ⚠️ `zIndex: 100` 은 상단바(`z-index: 30`, 36차)보다 위다 — 낮추지 말 것.
 */
const MODAL_BACKDROP: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  padding: 20,
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="reward-kv-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

const TYPE_LABEL: Record<string, string> = {
  transport_earn: "운송 적립",
  reversal: "회수",
  adjustment: "수동 조정",
};

function LedgerModal({ rows, onClose }: { rows: LedgerRow[] | null; onClose: () => void }) {
  return (
    <div style={MODAL_BACKDROP} onClick={onClose}>
      {/* 🔴 모달은 색·정렬·줄바꿈을 **자기가 선언한다**(65·66·PR #129 와 같은 자리) —
          어두운 배경 안에서 열리면 상속으로 글자가 통째로 안 보이고, 바깥에서 물려받은
          `nowrap` 이 남으면 가로로 끌린다. */}
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: 22,
          maxWidth: 720,
          width: "100%",
          maxHeight: "80vh",
          overflowY: "auto",
          color: "var(--text)",
          textAlign: "left",
          whiteSpace: "normal",
        }}
      >
        <h3 style={{ marginTop: 0, fontSize: 15 }}>적립·사용 내역</h3>
        {rows === null ? (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>아직 내역이 없습니다.</div>
        ) : (
          <table className="table table-compact">
            <thead>
              <tr>
                <th>날짜</th>
                <th>유형</th>
                <th style={{ textAlign: "right" }}>금액</th>
                <th>내용</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{ymd(r.created_at)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{TYPE_LABEL[r.transaction_type] || r.transaction_type}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                    {r.amount > 0 ? "+" : ""}
                    {won(r.amount)}
                  </td>
                  <td>
                    {r.description || "—"}
                    {/* 🚨 **화주가 본 문장을 같이 보여준다**(3차) — 담당자가 나중에
                        「우리가 화주에게 뭐라고 했더라」를 되짚을 자리가 여기뿐이다.
                        🔴 위 내부 사유와 **한 칸으로 합치지 말 것.** */}
                    {r.customer_note ? (
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3 }}>
                        화주 안내: {r.customer_note}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ marginTop: 14, textAlign: "right" }}>
          <button className="btn btn-ghost" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function AdjustModal({
  companyId,
  onClose,
  onDone,
}: {
  companyId: string;
  onClose: () => void;
  /** 🔴 차감이면 서버가 **차감 안내 문자 미리보기**를 함께 준다(3차) — 화면이
   *  확인창을 띄우고, 담당자가 [발송]을 눌러야 문자가 나간다. */
  onDone: (sms?: SmsPreview | null) => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  /**
   * 🚨 **화주에게 보이는 한 줄** — 위 `reason`(내부 사유)과 **다른 칸이다.**
   *    🔴 둘을 하나로 합치지 말 것: 내부 메모를 화주에게 그대로 보내게 된다
   *       (2차가 `description` 을 화주 응답에서 뺀 이유와 같다).
   *    ⚠️ 선택 입력이다 — 비우면 포털 줄에도 문자에도 그 줄이 안 나온다.
   */
  const [customerNote, setCustomerNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const n = Math.round(Number(amount.replace(/[^0-9-]/g, "")));
  // 🔴 **사유 없이는 저장이 안 된다**(전달문서 §38 ④ · 라우트도 같은 검사를 한다)
  const canSave = Number.isFinite(n) && n !== 0 && reason.trim().length > 0;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reward/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          amount: n,
          reason: reason.trim(),
          customer_note: customerNote.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "조정하지 못했습니다.");
      // 🔴 **미리보기가 없으면 그냥 닫는다** — 양수 조정이거나 「문자 안내」가 꺼진
      //    화주다. 그때 창을 띄우면 건너뛸 것도 없는 확인을 시키는 셈이다.
      onDone(json.sms || null);
      return;
    } catch (e: any) {
      setError(e?.message || "조정하지 못했습니다.");
    }
    setSaving(false);
  }

  return (
    <div style={MODAL_BACKDROP} onClick={onClose}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: 22,
          maxWidth: 420,
          width: "100%",
          color: "var(--text)",
          textAlign: "left",
          whiteSpace: "normal",
        }}
      >
        <h3 style={{ marginTop: 0, fontSize: 15 }}>적립금 수동 조정</h3>
        {/* 🔴 원장은 append-only 다 — 고치는 것이 아니라 **한 줄 더** 넣는 것이다 */}
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0 }}>
          기존 기록을 고치지 않고 <b>조정 내역을 한 줄 더</b> 남깁니다. 차감하려면 금액 앞에
          <b> −</b> 를 붙이세요.
        </p>
        <div className="field">
          <label>조정 금액 (원)</label>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="예: 5000  또는  -5000"
          />
        </div>
        <div className="field">
          <label>사유 (필수 · 내부용)</label>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          {/* 🚨 **이 줄을 지우지 말 것** — 두 칸의 차이를 담당자가 모르면 내부 메모를
              화주에게 보내거나, 반대로 화주 안내를 비워 「무엇 때문에 차감됐는지」를
              알 수 없는 문자가 나간다. */}
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
            화주에게 보이지 않습니다.
          </div>
        </div>
        {/* 🔴 **차감일 때만 그린다** — 적립을 늘리는 조정에는 「사용처」가 없다. */}
        {n < 0 && (
          <div className="field">
            <label>화주 안내 (선택)</label>
            <input
              type="text"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="예: 오더 20260921003 운임 차감"
              maxLength={60}
            />
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
              화주의 적립 내역과 안내 문자에 그대로 표시됩니다.
            </div>
          </div>
        )}
        {error && (
          <div className="error-box" style={{ fontSize: 12, marginBottom: 8 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            취소
          </button>
          <button className="btn" onClick={submit} disabled={!canSave || saving}>
            {saving ? "저장 중…" : "조정 기록 남기기"}
          </button>
        </div>
      </div>
    </div>
  );
}
