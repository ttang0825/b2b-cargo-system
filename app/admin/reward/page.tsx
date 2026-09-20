"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { rewardMethodLabel } from "@/lib/rewardCalc";

// ─────────────────────────────────────────────────────────────────────────────
// 리워드 관리 (B장 3-4, 2026-09-20) — 🔴 관리자 메뉴 「화주 관리」 그룹
//
// 🔴 **화면이 리워드 표를 직접 읽지 않는다** — 세 표가 RLS on + 정책 0개라
//    `authenticated` 로는 아예 닿지 않는다. 읽기는 서버 라우트 둘뿐이다.
//    🔴 **「안 읽히니 정책을 열자」로 가지 말 것**(화주도 `authenticated` 다).
//
// 🔴 **③ 「처리 필요」는 1차에서 목록만이다** — 상품권 지급 버튼은 3차다.
//    버튼을 여기에 만들면 눌렀을 때 아무 일도 안 일어난다.
//
// 🔴 **프리렌더가 46 → 47 이 된다**(이 라우트 하나).
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
  company_id: string;
  enabled: boolean;
  portal_visible: boolean;
  reward_method: string;
  started_at: string | null;
};

type Balance = { balance: number; earned: number; used: number };

type LedgerRow = {
  id: string;
  company_id: string;
  transaction_type: string;
  amount: number;
  earning_base_amount: number | null;
  description: string | null;
  created_at: string;
  companies?: { name?: string | null } | null;
};

const won = (n: number | null | undefined) => `${Math.round(n || 0).toLocaleString()}원`;
const ymd = (s: string | null | undefined) => (s ? s.slice(0, 10).replace(/-/g, ".") : "—");

const TYPE_LABEL: Record<string, string> = {
  transport_earn: "운송 적립",
  reversal: "회수",
  adjustment: "수동 조정",
};

const TABS = [
  { key: "companies", label: "기업별 현황" },
  { key: "ledger", label: "적립·사용 이력" },
  { key: "todo", label: "처리 필요" },
] as const;

export default function RewardAdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("companies");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [balances, setBalances] = useState<Record<string, Balance>>({});
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  // 🔴 로딩 실패와 액션 실패를 나눈다(원칙 33번). 이 화면은 아직 액션이 없어
  //    로딩 하나뿐이지만, 조정·지급이 붙을 때 합치지 말 것.
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [sumRes, ledRes] = await Promise.all([
        fetch("/api/admin/reward/summary", { cache: "no-store" }),
        fetch("/api/admin/reward/ledger", { cache: "no-store" }),
      ]);
      const sum = await sumRes.json().catch(() => ({}));
      // 🔴 `error` 를 삼키지 않는다(원칙 55번) — 실패를 「아직 아무도 안 쓴다」로
      //    보여주면 담당자가 리워드를 새로 켜려 든다.
      if (!sumRes.ok) throw new Error(sum.error || "리워드 현황을 불러오지 못했습니다.");
      setCampaign(sum.campaign || null);
      setMemberships(sum.memberships || []);
      setBalances(sum.balances || {});

      const led = await ledRes.json().catch(() => ({}));
      if (!ledRes.ok) throw new Error(led.error || "적립 이력을 불러오지 못했습니다.");
      const rows = (led.rows || []) as LedgerRow[];
      setLedger(rows);

      // 회사명 — 원장 조인에서 온 것을 모아 기업별 현황에도 쓴다.
      const names: Record<string, string> = {};
      for (const r of rows) if (r.companies?.name) names[r.company_id] = r.companies.name;
      setCompanyNames(names);
    } catch (e: any) {
      setLoadError(e?.message || "리워드 현황을 불러오지 못했습니다.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = (id: string) => companyNames[id] || `화주 ${id.slice(0, 8)}`;

  // ③ 처리 필요 — 🔴 **목록만이다**(지급 버튼은 3차).
  const todo = useMemo(() => {
    const min = campaign?.minimum_use_amount ?? 0;
    return memberships
      .map((m) => ({ m, b: balances[m.company_id] }))
      .filter((x) => x.m.enabled && (x.b?.balance || 0) >= min && min > 0);
  }, [memberships, balances, campaign]);

  return (
    <main className="container admin-wide">
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>리워드 관리</h1>
        {campaign && (
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            {campaign.name} · 적립 {ymd(campaign.start_date)} ~ {ymd(campaign.earn_end_date)} ·
            사용 기한 {ymd(campaign.use_end_date)} · 적립률{" "}
            {(campaign.earn_rate * 100).toFixed((campaign.earn_rate * 100) % 1 ? 1 : 0)}%
          </span>
        )}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 0, marginBottom: 16 }}>
        적립은 <b>화주 입금이 확인될 때</b> 자동으로 쌓입니다. 기업별 적용 여부는 각
        화주 상세의 「기업고객 리워드」에서 켜고 끕니다.
      </p>

      {/* 🔴 탭은 `/admin/rates` 와 **같은 관례**다(`btn` / `btn btn-ghost` + 인라인 flex) —
          이 저장소에는 탭 전용 CSS 클래스가 없다. 새로 만들면 판본이 갈린다. */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? "btn" : "btn btn-ghost"}
            style={{ fontSize: 12.5, padding: "7px 12px" }}
          >
            {t.label}
            {t.key === "todo" && todo.length > 0 && ` (${todo.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 20, fontSize: 13, color: "var(--text-muted)" }}>
          불러오는 중…
        </div>
      ) : loadError ? (
        <div className="error-box">{loadError}</div>
      ) : tab === "companies" ? (
        <div className="card" style={{ padding: 0 }}>
          {memberships.length === 0 ? (
            <Empty>
              아직 리워드를 적용한 기업이 없습니다. 화주 상세의 「기업고객 리워드」에서
              켜 주세요.
            </Empty>
          ) : (
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>회사명</th>
                  <th>적용</th>
                  <th>포털</th>
                  <th>방식</th>
                  <th style={{ textAlign: "right" }}>현재 적립</th>
                  <th style={{ textAlign: "right" }}>누적 적립</th>
                  <th style={{ textAlign: "right" }}>누적 사용·회수</th>
                  <th>시작일</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => (
                  <tr key={m.company_id}>
                    <td className="cell-nowrap">
                      <Link href={`/admin/companies/${m.company_id}?from=customers`}>
                        {nameOf(m.company_id)}
                      </Link>
                    </td>
                    <td className="cell-nowrap">
                      <span className={`reward-tag ${m.enabled ? "reward-tag-on" : "reward-tag-off"}`}>
                        {m.enabled ? "적용" : "해제"}
                      </span>
                    </td>
                    <td className="cell-nowrap">{m.portal_visible ? "노출" : "비노출"}</td>
                    <td className="cell-nowrap">{rewardMethodLabel(m.reward_method)}</td>
                    <td className="cell-nowrap" style={{ textAlign: "right", fontWeight: 600 }}>
                      {won(balances[m.company_id]?.balance || 0)}
                    </td>
                    <td className="cell-nowrap" style={{ textAlign: "right" }}>
                      {won(balances[m.company_id]?.earned || 0)}
                    </td>
                    <td className="cell-nowrap" style={{ textAlign: "right" }}>
                      {won(balances[m.company_id]?.used || 0)}
                    </td>
                    <td className="cell-nowrap">{ymd(m.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : tab === "ledger" ? (
        <div className="card" style={{ padding: 0 }}>
          {ledger.length === 0 ? (
            <Empty>아직 적립·사용 이력이 없습니다.</Empty>
          ) : (
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>회사</th>
                  <th>유형</th>
                  <th style={{ textAlign: "right" }}>기준 금액</th>
                  <th style={{ textAlign: "right" }}>금액</th>
                  <th>내용</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((r) => (
                  <tr key={r.id}>
                    <td className="cell-nowrap">{ymd(r.created_at)}</td>
                    <td className="cell-nowrap">{r.companies?.name || nameOf(r.company_id)}</td>
                    <td className="cell-nowrap">{TYPE_LABEL[r.transaction_type] || r.transaction_type}</td>
                    <td className="cell-nowrap" style={{ textAlign: "right" }}>
                      {r.earning_base_amount != null ? won(r.earning_base_amount) : "—"}
                    </td>
                    <td className="cell-nowrap" style={{ textAlign: "right", fontWeight: 600 }}>
                      {r.amount > 0 ? "+" : ""}
                      {won(r.amount)}
                    </td>
                    <td>{r.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {/* 🔴 1차에서는 **목록만**이다 — 상품권 지급 버튼은 3차다. 여기에 버튼을
              만들면 눌러도 아무 일이 안 일어난다. */}
          <div style={{ padding: "14px 16px 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            적립금이 사용 하한({won(campaign?.minimum_use_amount)}) 이상 쌓인 기업입니다.
            혜택 제공(운임 할인·상품권)은 지금은 <b>담당자가 직접</b> 처리합니다.
          </div>
          {todo.length === 0 ? (
            <Empty>아직 처리할 기업이 없습니다.</Empty>
          ) : (
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>회사명</th>
                  <th>방식</th>
                  <th style={{ textAlign: "right" }}>현재 적립</th>
                </tr>
              </thead>
              <tbody>
                {todo.map(({ m, b }) => (
                  <tr key={m.company_id}>
                    <td className="cell-nowrap">
                      <Link href={`/admin/companies/${m.company_id}?from=customers`}>
                        {nameOf(m.company_id)}
                      </Link>
                    </td>
                    <td className="cell-nowrap">{rewardMethodLabel(m.reward_method)}</td>
                    <td className="cell-nowrap" style={{ textAlign: "right", fontWeight: 600 }}>
                      {won(b?.balance || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ padding: 20, margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{children}</p>
  );
}
