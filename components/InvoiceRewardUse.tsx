"use client";

import { useCallback, useEffect, useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import SmsConfirmModal, { type SmsPreview } from "@/components/SmsConfirmModal";

// ─────────────────────────────────────────────────────────────────────────────
// 정산 상세의 **운임 할인** 블록 (2026-09-22 · 사용자 요청 *"운임 할인 적용도 만들어줘"*)
//
// 🔴 **판정은 서버가 한다** — 이 화면은 `/api/admin/reward/use` 가 내려준 값을
//    그릴 뿐이고, 잔액·관문·최대액을 **여기서 다시 계산하지 않는다**(두 벌이 되면
//    「화면엔 걸 수 있다는데 서버가 막는」 상태가 난다 · 원칙 51번).
//
// 🔴 **리워드를 안 쓰는 화주에게는 아무것도 안 그린다**(`null`) — `InvoiceRewardLine`
//    과 같은 기준이다. 쓰지 않는 담당자에게 잡음이 되면 안 된다.
//
// 🔴 **버튼은 관리자에게만** — 금액을 바꾸는 일이다(원칙 25번). 서버도 같은 검사를
//    하므로 이것은 **두 방어선 중 앞쪽**이지 전부가 아니다.
//
// 🚨 **문자는 여기서 나가지 않는다** — 서버가 문구만 만들고, 담당자가 확인창에서
//    [발송]을 눌러야 나간다(2차 확정 · 다른 일곱 종과 같은 자세).
// ─────────────────────────────────────────────────────────────────────────────

type UseInfo = {
  is_member: boolean;
  campaign: { minimum_use_amount: number; use_end_date: string } | null;
  balance: number;
  current: number;
  gross: number;
  charge: number;
  max: number;
  blocked: string | null;
  blocked_label: string;
};

const won = (n: number | null | undefined) => `${Math.round(n || 0).toLocaleString()}원`;

export default function InvoiceRewardUse({
  invoiceId,
  isAdmin,
  onChanged,
}: {
  invoiceId: string;
  isAdmin: boolean;
  /** 🔴 할인이 바뀌면 **청구 금액이 바뀐다** — 부모가 전체를 다시 불러야 한다 */
  onChanged: () => void | Promise<void>;
}) {
  const [info, setInfo] = useState<UseInfo | null>(null);
  // 🔴 조회 실패를 빈 값으로 때우지 말 것(원칙 55번) — 「대상 아님」과 「못 불러왔다」는
  //    정반대의 뜻이고, 앞엣것은 **문제 없음**으로 읽힌다.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [sms, setSms] = useState<SmsPreview | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/reward/use?invoice_id=${encodeURIComponent(invoiceId)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json?.error || "적립금 정보를 불러오지 못했습니다.");
        return;
      }
      setLoadError(null);
      setInfo(json);
    } catch (e: any) {
      setLoadError(e?.message || "적립금 정보를 불러오지 못했습니다.");
    }
  }, [invoiceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) {
    return (
      <div style={{ marginTop: 12, fontSize: 12, color: "var(--danger, #B4423A)" }}>
        운임 할인 정보를 불러오지 못했습니다 — {loadError}
      </div>
    );
  }
  if (!info || !info.is_member) return null;

  const hasDiscount = info.current > 0;

  return (
    <div className="reward-use">
      <div className="reward-use-head">
        <span className="reward-use-title">운임 할인 (리워드)</span>
        {/* 🔴 **잔액과 할인액을 나란히 적는다** — 담당자가 「얼마나 더 깎을 수 있나」를
            두 화면을 오가며 맞춰 보지 않아도 되게. */}
        <span className="reward-use-meta">
          적립금 잔액 {won(info.balance)}
          {info.campaign?.minimum_use_amount ? (
            <> · 최소 사용 {won(info.campaign.minimum_use_amount)}</>
          ) : null}
        </span>
      </div>

      {hasDiscount ? (
        <div className="reward-use-applied">
          <div>
            깎기 전 운임 <b>{won(info.gross)}</b> − 할인{" "}
            <b className="reward-use-minus">{won(info.current)}</b> = 청구{" "}
            <b>{won(info.charge)}</b>
          </div>
          {/* 🔴 **세금계산서 금액이 달라진다는 것을 말한다**(사용자 확정 — 자동으로
              바꾸지 않는다). 담당자가 모르고 옛 금액으로 끊으면 대조가 어긋난다. */}
          <div className="reward-use-warn">
            🔴 세금계산서는 자동으로 바뀌지 않습니다 — 깎은 뒤 금액({won(info.charge)})으로
            발행해 주세요.
          </div>
        </div>
      ) : (
        <div className="reward-use-none">걸려 있는 할인이 없습니다.</div>
      )}

      {/* 🔴 **관문에 걸리면 사유를 그대로 보여준다** — 버튼만 감추면 담당자가
          「왜 안 되는지」를 영영 모른다(정의처는 `lib/rewardUse.ts`). */}
      {info.blocked && !hasDiscount ? (
        <div className="reward-use-blocked">{info.blocked_label}</div>
      ) : null}

      {isAdmin && (!info.blocked || hasDiscount) ? (
        <button type="button" className="btn btn-ghost reward-use-btn" onClick={() => setOpen(true)}>
          {hasDiscount ? "할인 금액 변경 · 해제" : "적립금으로 할인 적용"}
        </button>
      ) : null}

      {open && (
        <UseModal
          invoiceId={invoiceId}
          info={info}
          onClose={() => setOpen(false)}
          onDone={async (preview) => {
            setOpen(false);
            await load();
            await onChanged();
            // 🔴 **저장된 뒤에 띄운다** — 먼저 띄우면 담당자가 [발송]을 눌렀을 때
            //    아직 없는 원장 줄을 가리킨다(수동 조정과 같은 순서).
            if (preview) setSms(preview);
          }}
        />
      )}

      {sms && (
        <SmsConfirmModal preview={sms} onSent={() => setSms(null)} onSkip={() => setSms(null)} />
      )}
    </div>
  );
}

// ── 금액·사유 입력 창 ───────────────────────────────────────────────────────
//
// 🔴 **사유는 필수다** — 금액을 바꾸는 일이라 「누가 왜」가 안 남으면 나중에 아무도
//    그 줄을 설명할 수 없다(35차 A-7 재동기화와 같은 자세).
// 🚨 **「사유(내부용)」와 「화주 안내」는 다른 칸이다** — 앞엣것은 담당자 메모이고
//    화주에게 절대 가지 않는다(2차 확정). 🔴 합치지 말 것.

function UseModal({
  invoiceId,
  info,
  onClose,
  onDone,
}: {
  invoiceId: string;
  info: UseInfo;
  onClose: () => void;
  onDone: (sms: SmsPreview | null) => void | Promise<void>;
}) {
  const [amount, setAmount] = useState(String(info.current || ""));
  const [reason, setReason] = useState("");
  // 🔴 미리 채워 둔다 — 화주가 받을 문자에 「왜 깎였나」가 한 줄은 있어야 한다.
  //    ⚠️ 지울 수 있다(선택 입력이다).
  const [customerNote, setCustomerNote] = useState("운임 할인으로 사용");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amt = Math.round(Number(amount.replace(/,/g, "")) || 0);
  const nextCharge = info.gross - amt;

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/reward/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoiceId,
          amount: amt,
          reason,
          customer_note: customerNote,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "저장하지 못했습니다.");
        return;
      }
      await onDone(json?.sms ?? null);
    } catch (e: any) {
      setError(e?.message || "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    // 🔴 배경·카드 모양은 화주 상세의 「수동 조정」 창과 **같은 방식**이다
    //    (모달이 색·정렬·줄바꿈을 자기가 선언한다 — 65·66차·PR #129 와 같은 자리).
    <div style={MODAL_BACKDROP} onClick={onClose}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: 22,
          maxWidth: 440,
          width: "100%",
          color: "var(--text)",
          textAlign: "left",
          whiteSpace: "normal",
        }}
      >
        <h3 style={{ marginTop: 0, fontSize: 15 }}>운임 할인</h3>

        <div className="reward-use-modal-sum">
          <div>
            깎기 전 운임 <b>{won(info.gross)}</b>
          </div>
          <div>
            적립금 잔액 <b>{won(info.balance)}</b> · 이 건에 걸 수 있는 최대{" "}
            <b>{won(info.max)}</b>
          </div>
        </div>

        <div className="field">
          <label>할인 금액 (원 · 0원이면 해제)</label>
          {/* 🔴 `MoneyInput` 이 콤마를 그리고 값은 **순수 숫자 문자열**로 온다 */}
          <MoneyInput value={amount} onChange={setAmount} placeholder="예: 50000" />
        </div>

        {/* 🔴 **결과를 미리 보여준다** — 담당자가 저장하고 나서야 금액을 확인하는
            일이 없게. */}
        <div className="reward-use-modal-result">
          청구 금액이 <b>{won(info.charge)}</b> → <b>{won(nextCharge)}</b> 로 바뀝니다.
        </div>

        <div className="field">
          <label>사유 (필수 · 내부용)</label>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          {/* 🚨 **이 줄을 지우지 말 것** — 두 칸의 차이를 담당자가 모르면 내부 메모를
              화주에게 보내거나, 반대로 화주 안내를 비워 「무엇 때문에 깎였는지」를
              알 수 없는 문자가 나간다(수동 조정 창과 같은 안내다). */}
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
            화주에게 보이지 않습니다.
          </div>
        </div>

        {/* 🔴 **할인을 늘릴 때만 그린다** — 해제·감액은 적립금이 **돌아오는** 것이라
            「어떻게 사용됐는지」를 적을 자리가 아니다(수동 조정 창과 같은 규칙). */}
        {amt > info.current && (
          <div className="field">
            <label>화주 안내 (선택)</label>
            <input
              type="text"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
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
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            취소
          </button>
          {/* 🔴 사유가 비면 저장을 막는다(수동 조정 창과 같은 규칙 · 라우트도 같은 검사) */}
          <button type="button" className="btn" onClick={submit} disabled={saving || !reason.trim()}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
