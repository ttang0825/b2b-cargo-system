"use client";

// 화주포털 — 적립금 (2차, 2026-09-21)
//
// 🔴 **리워드 표를 화면에서 직접 읽지 않는다.** 표 셋이 RLS on + 정책 0개라
//    `supabase.from("reward_ledger")` 는 **에러 없이 빈 배열**을 돌려준다(원칙 22번과
//    같은 증상). 통로는 `/api/customer/reward` 하나뿐이다.
//
// 🔴 **`portal_visible` 이 꺼져 있으면 서버가 `{ visible: false }` 만 준다** —
//    이 화면은 그때 「아직 참여하지 않은 화주」로 그린다. 🔴 금액을 받아서 감추는
//    방식으로 바꾸지 말 것(응답에 실리면 그대로 브라우저에 내려간다).

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import {
  PORTAL_REWARD_LABEL,
  type PortalRewardCampaign,
  type PortalRewardRow,
} from "@/lib/rewardPortal";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";

type RewardResponse = {
  visible: boolean;
  campaign?: PortalRewardCampaign;
  balance?: number;
  earned?: number;
  used?: number;
  rows?: PortalRewardRow[];
};

function won(n: number | null | undefined) {
  return Math.round(n || 0).toLocaleString("ko-KR");
}

function shortDate(v: string | null | undefined) {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

function longDate(v: string | null | undefined) {
  if (!v) return "-";
  // 🔴 `new Date("2026-09-30")` 은 **UTC 자정**이라 KST 에서 하루가 밀린다(원칙 41번 ·
  //    PR #168 이 목록 기간에서 겪은 자리). 날짜 문자열은 갈라서 만든다.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return v;
  return `${m[1]}. ${m[2]}. ${m[3]}.`;
}

/** 🔴 배지 색은 셋뿐이다 — 늘리면 뜻을 잃는다(PR #155 묶음 목록과 같은 규칙) */
const KIND_STYLE: Record<string, { bg: string; color: string }> = {
  earn: { bg: "#FFF9D6", color: "#5B4A00" },
  adjust: { bg: "#F4F3EF", color: "#4A4945" },
  deduct: { bg: "#FDF3F2", color: "#B4423A" },
};

export default function PortalRewardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RewardResponse | null>(null);

  async function load() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    // 🔴 `cache: "no-store"` 는 원칙 21번의 **클라이언트 쪽 짝이다** — 빼면 적립 직후에도
    //    한참 옛 잔액을 보여준다.
    const res = await fetch("/api/customer/reward", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // 🔴 조회 실패를 「적립금 없음」으로 떨어뜨리지 말 것(원칙 55번) — 화주가
      //    「내 적립금이 사라졌다」로 읽는다.
      setError(body.error || "적립금 정보를 불러오지 못했습니다.");
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="pv2-empty">불러오는 중...</div>;

  if (error) {
    return (
      <>
        <div className="pv2-page-head-tight">
          <h1 className="pv2-page-title">적립금</h1>
        </div>
        <div className="pv2-alert pv2-alert-error">{error}</div>
      </>
    );
  }

  if (!data?.visible) {
    return (
      <>
        <div className="pv2-page-head-tight">
          <h1 className="pv2-page-title">적립금</h1>
        </div>
        <div className="pv2-card-empty">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/portal/wecarry-eng-cropped.svg" alt="" className="pv2-empty-logo" />
          <div className="pv2-card-empty-title">적립 내역이 없습니다</div>
          {/* 🚨 **「신청하면 됩니다」로 적지 말 것.** 리워드는 **선택된 기업**만 참여하고
              화주가 신청해서 켜는 것이 아니다(HANDOFF §5-27). 안내 페이지가 「별도 신청
              없이 자동 적립」이라 적고 있는 것과 같은 문제를 여기서 되풀이하지 않는다. */}
          <div className="pv2-card-empty-desc">
            적립 혜택 참여 여부는 담당자에게 문의해주세요. ({COMPANY_SUPPORT_PHONE})
          </div>
        </div>
      </>
    );
  }

  const campaign = data.campaign!;
  const rows = data.rows || [];
  const balance = data.balance || 0;
  const canUse = balance >= (campaign.minimum_use_amount || 0);

  return (
    <>
      <div className="pv2-page-head-tight">
        <h1 className="pv2-page-title">적립금</h1>
        <p className="pv2-page-desc">
          운송 운임의 {Math.round(campaign.earn_rate * 1000) / 10}%가 적립됩니다. 적립금 사용은
          담당자와 협의해주세요.
        </p>
      </div>

      <div className="pv2-isum">
        <div className="pv2-isum-card">
          <div className="pv2-isum-label">사용 가능 적립금</div>
          <div className="pv2-isum-value">
            {won(balance)}
            <span className="pv2-isum-unit"> 원</span>
          </div>
          <div className="pv2-isum-sub">
            {/* 🔴 최소 사용 금액은 캠페인 값이다 — 화면에 숫자를 적지 말 것 */}
            {campaign.minimum_use_amount > 0
              ? canUse
                ? `${won(campaign.minimum_use_amount)}원부터 사용 가능`
                : `${won(campaign.minimum_use_amount)}원부터 사용할 수 있습니다`
              : "담당자와 협의 후 사용"}
          </div>
        </div>
        <div className="pv2-isum-card">
          <div className="pv2-isum-label">누적 적립</div>
          <div className="pv2-isum-value">
            {won(data.earned)}
            <span className="pv2-isum-unit"> 원</span>
          </div>
          <div className="pv2-isum-sub">{rows.filter((r) => r.kind === "earn").length}건 적립</div>
        </div>
        <div className="pv2-isum-card">
          <div className="pv2-isum-label">적립 기간</div>
          <div className="pv2-isum-value" style={{ fontSize: 17.5 }}>
            {longDate(campaign.earn_end_date)}까지
          </div>
          {/* 🔴 적립 마감과 사용 기한은 **다른 날짜다** — 한 줄로 뭉개지 말 것
              (적립이 끝나도 쌓인 적립금은 사용 기한까지 살아 있다). */}
          <div className="pv2-isum-sub">사용 기한 {longDate(campaign.use_end_date)}</div>
        </div>
      </div>

      <section className="pv2-card pv2-block" aria-labelledby="pv2-rw-title">
        <div className="pv2-block-head">
          <span className="pv2-section-title" id="pv2-rw-title">
            적립 내역
          </span>
          {rows.length > 0 && <span className="pv2-count-chip">{rows.length}건</span>}
        </div>

        {rows.length === 0 ? (
          <div className="pv2-empty">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/portal/wecarry-eng-cropped.svg" alt="" className="pv2-empty-logo" />
            <div className="pv2-empty-title">아직 적립된 내역이 없습니다</div>
          </div>
        ) : (
          <div className="pv2-rwlist">
            {rows.map((r) => {
              const style = KIND_STYLE[r.kind] || KIND_STYLE.adjust;
              return (
                <div key={r.id} className="pv2-rwrow">
                  <span className="pv2-status-badge" style={{ background: style.bg, color: style.color }}>
                    {PORTAL_REWARD_LABEL[r.kind]}
                  </span>
                  <div className="pv2-rwbody">
                    {/* 🔴 오더번호가 없으면 **날짜만** 말한다 — 내부 id 를 잘라 보여주지 말 것 */}
                    <div className="pv2-rwtitle">
                      {r.order_no ? `오더 ${r.order_no}` : PORTAL_REWARD_LABEL[r.kind]}
                    </div>
                    {/* 🚨 **조정·차감 줄에는 사유를 적지 않는다** — 그 칸(`description`)은
                        담당자의 내부 메모라 서버가 애초에 안 준다. 화면이 지어내지도 않는다. */}
                    {r.kind === "earn" && r.base_amount ? (
                      <div className="pv2-rwmeta">
                        운임 {won(r.base_amount)}원 (부가세 별도)
                        {r.earn_rate ? ` · ${Math.round(r.earn_rate * 1000) / 10}%` : ""}
                      </div>
                    ) : null}
                  </div>
                  <div className="pv2-rwright">
                    <div
                      className="pv2-rwamt num"
                      style={r.amount < 0 ? { color: "#B4423A" } : undefined}
                    >
                      {r.amount > 0 ? "+" : ""}
                      {won(r.amount)}원
                    </div>
                    <div className="pv2-rwdate num">{shortDate(r.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
