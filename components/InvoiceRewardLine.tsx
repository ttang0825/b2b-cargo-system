"use client";

import { useEffect, useState } from "react";
import { REWARD_SKIP_REASON_LABEL, type RewardIneligibleReason } from "@/lib/rewardCalc";

// ─────────────────────────────────────────────────────────────────────────────
// 정산 상세의 「리워드」 **읽기 전용 한 줄** (C장 4-3, 2026-09-20)
//
// 🔴 **버튼을 만들지 말 것**(1차는 자동만) — 수동으로 넣어야 하면 화주 상세의
//    **「수동 조정」**이다. 여기에 「지금 적립」 버튼을 두면 원장이 자동·수동 두 경로로
//    쌓여 무엇이 자동인지 구분되지 않는다.
//
// 🔴 **「적립 실패」도 보여야 한다** — 적립은 입금확인을 막지 않고 조용히 넘어가므로,
//    담당자가 그 사실을 알 길이 **여기뿐**이다.
//
// 🔴 **리워드를 안 쓰는 화주에게는 아무것도 안 그린다**(`null`) — 「대상 아님」을
//    모든 정산 건에 띄우면 쓰지 않는 담당자에게 잡음이다.
// ─────────────────────────────────────────────────────────────────────────────

type LedgerRow = {
  id: string;
  transaction_type: string;
  amount: number;
  created_at: string;
};

type Props = {
  invoiceId: string;
  companyId: string | null | undefined;
  /** 저장 직후 서버가 돌려준 적립 결과 — 있으면 그것을 먼저 보여준다 */
  lastResult?: {
    results?: { invoice_id: string; status: string; amount?: number; reason?: string; message?: string }[];
    timedOut?: boolean;
    error?: string;
  };
};

const won = (n: number | null | undefined) => `${Math.round(n || 0).toLocaleString()}원`;
const ymd = (s: string | null | undefined) => (s ? s.slice(0, 10).replace(/-/g, ".") : "");

// 🔴 **정의처는 `lib/rewardCalc.ts` 하나다**(2026-09-22 에 그리로 올렸다) —
//    「미적립 건 목록」이 같은 사유를 그리므로 **여기에 다시 적지 말 것.**
const SKIP_LABEL = REWARD_SKIP_REASON_LABEL;

export default function InvoiceRewardLine({ invoiceId, companyId, lastResult }: Props) {
  const [rows, setRows] = useState<LedgerRow[] | null>(null);
  const [member, setMember] = useState<boolean | null>(null);
  /** 🔴 **예상 적립** — 아직 안 쌓인 건에만 쓴다. 원장에는 한 줄도 안 들어간다. */
  const [preview, setPreview] = useState<
    { amount: number; reason?: string; isDirect?: boolean } | null
  >(null);

  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    (async () => {
      try {
        const [sumRes, ledRes, preRes] = await Promise.all([
          fetch(`/api/admin/reward/summary?company_id=${encodeURIComponent(companyId)}`, { cache: "no-store" }),
          fetch(`/api/admin/reward/ledger?company_id=${encodeURIComponent(companyId)}`, { cache: "no-store" }),
          // 🔴 **이 정산 건 하나만** 미리 계산한다(읽기 전용) — 입금 확인 전에도
          //    담당자가 얼마가 쌓일지 알 수 있어야 한다는 요청(2026-09-21).
          fetch(`/api/admin/reward/preview?invoice_id=${encodeURIComponent(invoiceId)}`, { cache: "no-store" }),
        ]);
        if (!alive) return;
        if (sumRes.ok) {
          const j = await sumRes.json();
          setMember(!!j.membership);
        } else {
          setMember(false);
        }
        if (ledRes.ok) {
          const j = await ledRes.json();
          // 🔴 이 정산 건의 줄만 고른다 — 원장은 화주 단위로 쌓인다.
          setRows((j.rows || []).filter((r: any) => r.source_id === invoiceId));
        }
        // 🔴 예상 적립이 실패하면 **그 줄만 조용히 빠진다** — 이미 쌓인 금액과
        //    실패 안내가 본문이고 예상은 곁다리다(원칙 55번의 「곁다리가 본문을
        //    못 막는다」 쪽).
        if (preRes.ok) {
          const j = await preRes.json();
          const one = (j.rows || [])[0];
          setPreview(
            one
              ? { amount: one.amount || 0, reason: one.reason, isDirect: !!one.is_direct }
              : null
          );
        }
      } catch {
        if (alive) setMember(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [companyId, invoiceId, lastResult]);

  // 🔴 리워드를 안 쓰는 화주면 아무것도 안 그린다.
  if (!companyId || member === false) return null;
  if (member === null) return null;

  const mine = lastResult?.results?.find((r) => r.invoice_id === invoiceId);
  const earned = (rows || []).filter((r) => r.transaction_type === "transport_earn");
  const reversed = (rows || []).filter((r) => r.transaction_type === "reversal");

  let text: string;
  let tone: "ok" | "muted" | "warn" = "muted";

  if (lastResult?.error || mine?.status === "error") {
    // 🔴 조용히 넘어간 실패를 **여기서 알린다.**
    text = `적립 실패 — ${mine?.message || lastResult?.error} (화주 상세의 「수동 조정」으로 넣을 수 있습니다)`;
    tone = "warn";
  } else if (lastResult?.timedOut) {
    text = "적립 처리가 시간 안에 끝나지 않았습니다 — 잠시 뒤 새로고침해 확인해 주세요.";
    tone = "warn";
  } else if (earned.length > 0 && reversed.length > 0) {
    text = `+${won(earned[0].amount)} 적립됨 (${ymd(earned[0].created_at)}) · 이후 회수됨 (${ymd(reversed[0].created_at)})`;
    tone = "muted";
  } else if (earned.length > 0) {
    text = `+${won(earned[0].amount)} 적립됨 (${ymd(earned[0].created_at)})`;
    tone = "ok";
  } else if (mine && mine.status === "skipped") {
    text = SKIP_LABEL[mine.reason || ""] || `대상 아님 — ${mine.reason}`;
  } else if (preview && !preview.reason && preview.amount > 0) {
    // 🔴 **「예상」이라고 분명히 적는다** — 쌓인 금액과 같은 말투로 쓰면 담당자가
    //    이미 적립된 것으로 읽는다.
    // 🔴 **기다리는 것이 수금방식마다 다르다** — 선착불은 화주 입금이 아니라
    //    주선수수료 입금이다(그 화면에 화주 입금 체크박스는 아예 없다).
    text = preview.isDirect
      ? `예상 적립 +${won(preview.amount)} — 주선수수료 입금 확인 시 쌓입니다.`
      : `예상 적립 +${won(preview.amount)} — 입금 확인 시 쌓입니다.`;
  } else if (preview && preview.reason) {
    // 🔴 입금 전이라도 **대상이 아닌 이유**를 미리 알린다(선착불·캠페인 밖 등) —
    //    입금 확인을 누른 뒤에야 알면 그때는 되돌릴 것이 없다.
    text = SKIP_LABEL[preview.reason] || `대상 아님 — ${preview.reason}`;
  } else {
    text = "아직 적립되지 않았습니다 — 입금 확인 시 자동으로 쌓입니다.";

  }

  return (
    <div className="reward-invoice-line">
      <span>리워드</span>
      <b className={tone === "ok" ? "reward-line-ok" : tone === "warn" ? "reward-line-warn" : undefined}>
        {text}
      </b>
    </div>
  );
}
