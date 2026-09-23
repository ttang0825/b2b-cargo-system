"use client";

import { useEffect, useState } from "react";
import {
  DISPATCH_CANCEL_CUSTOMER_STYLE,
  dispatchCancelCustomerBadge,
} from "@/lib/dispatchCancel";
import {
  filterCancelledForCustomer,
  getPortalCancelNotice,
  type PortalRedispatchMap,
} from "@/lib/portalCancelledDispatches";
import {
  fetchPortalPendingDispatches,
  mergePortalPendingRows,
} from "@/lib/portalPendingDispatches";
import { usePortalRefresh } from "@/lib/portalRefresh";
import Link from "next/link";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import {
  getDispatchStage,
  getDispatchStageStyle,
  hasDispatchIssue,
  DISPATCH_ISSUE_STYLE,
} from "@/lib/dispatchStage";
import { calcInclusiveAmount } from "@/lib/vat";
// 🔴 요약 계산은 이 함수 하나다 — 정산 화면과 같은 수를 말해야 한다(원칙 51번).
import { summarizePortalInvoices } from "@/lib/portalInvoiceSummary";
// 🔴 구간 표기는 `lib/shortAddress.ts` 하나다 — 화면마다 자르지 말 것.
import { shortAddress } from "@/lib/shortAddress";
import { PORTAL_PERIOD_MONTH } from "@/components/pv2/Pv2PeriodFilter";
import {
  ANNOUNCEMENT_NOTICE_FIELD,
  getLastSeen,
  getAcknowledgedRequestIds,
  acknowledgeRequestIds,
} from "@/lib/portalNotifications";
import InstallAppButton from "@/components/InstallAppButton";

/** 숫자만. 🔴 단위를 따로 그려야 해서(`.pv2-isum-unit`) 「원」을 붙이지 않는다. */
function wonNum(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR");
}

/** 「2026. 9. 23.」 — 정산 화면과 같은 모양이다. */
function formatDate(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR");
}

function won(n: number | null | undefined) {
  if (!n) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function shortDateTime(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortDate(v: string | null | undefined) {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

function ArrowRight({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12h17M13.5 5.5 20 12l-6.5 6.5" />
    </svg>
  );
}

// ⚠️ **`QuoteRow` 가 있었다** — 홈 「응답 확인하기」가 `견적제출` 견적을 그리는 데
//    쓰던 타입이고, 그 카드가 2026-09-23(A장)에 **「금액 요약」으로 교체**되면서
//    함께 없어졌다. 🔴 되살리려면 먼저 「화주가 견적을 보는 화면이 있는가」를 볼 것.
//
// 🔴 `PortalInvoiceLike` 를 **그대로 넓힌 모양**이다 — 요약 계산은
//    `lib/portalInvoiceSummary.ts` 한 곳이 하고, 여기서는 그 칸들을 받아오기만 한다.
type InvoiceRow = {
  id: string;
  customer_charge_total: number | null;
  payment_received: boolean | null;
  tax_invoice_issued: boolean | null;
  tax_invoice_date: string | null;
  settlement_reference_date: string | null;
  created_at: string;
};
/** 반려된 발주 요청 — 띠에 그릴 최소한의 칸만. `staff_note` 가 반려 사유다. */
type RejectedRequestRow = {
  id: string;
  created_at: string;
  origin: string | null;
  destination: string | null;
  staff_note: string | null;
};

type DispatchRow = {
  id: string;
  order_id: string | null;
  dispatch_status: string | null;
  cancel_reason: string | null;
  created_at: string | null;
  /** 🔴 아직 배차가 없는 가상 카드에만 있다 — `lib/portalPendingDispatches.ts` 참고. */
  quote_no?: string | null;
  orders: {
    order_no: string | null;
    origin: string | null;
    destination: string | null;
    requested_pickup_at: string | null;
    item: string | null;
    vehicle_type: string | null;
  } | null;
};
type AnnouncementRow = {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  announced_at: string;
};

export default function CustomerHomePage() {
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  // 🚨 **반려된 발주 요청 — 화주가 그것을 볼 자리가 여기밖에 없다**(2026-09-23 · B장).
  //    그전에는 「견적 확인」 목록이 빨간 「접수 반려」 알약으로 보여줬는데 그 메뉴가
  //    A장에 없어졌다. 🔴 **반려에는 문자도 푸시도 나가지 않는다**(관리자 화면이
  //    `status='반려'` + `staff_note` 만 쓴다 — 실측). 그래서 이 띠를 지우면 화주는
  //    자기 요청이 반려된 것을 **영영 모른다.**
  const [rejectedRequests, setRejectedRequests] = useState<RejectedRequestRow[]>([]);
  // 🔴 「확인」을 누른 것은 `localStorage` 에 남는다(`acknowledgeRequestIds`) — 표에
  //    쓰지 않는다(화주가 본인 요청 행을 고칠 권한이 없고, 그럴 일도 아니다).
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [activeDispatches, setActiveDispatches] = useState<DispatchRow[]>([]);
  // 🔴 재배차가 접수 중인 오더의 취소 이력 — 조회 화면과 **같은 함수**가 채운다.
  const [redispatch, setRedispatch] = useState<PortalRedispatchMap>(new Map());
  // 🔴 공지는 최근 5건까지 보여준다(PR #103 리뷰). 25차까지는 1건이었다.
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  // 안 읽은 공지 수. 🔴 사이드바 배지와 **같은 규칙**이어야 한다 —
  //   `created_at > 마지막 확인 시각`(기록이 없으면 전부 안 읽음).
  //   두 곳이 어긋나면 "사이드바엔 2인데 홈엔 5" 같은 상태가 된다.
  const [unreadNotices, setUnreadNotices] = useState(0);
  // 🔴 **적립금 카드** — `reward_memberships.portal_visible` 이 켜진 화주에게만 그린다.
  //    🔴 화면에서 `reward_ledger` 를 직접 읽지 말 것(RLS on + 정책 0개라 **에러 없이
  //       빈 배열**이 온다). 통로는 `/api/customer/reward` 하나다.
  //    🔴 **참여하지 않은 화주에게는 카드 자체를 그리지 않는다** — 「0원」을 보여주면
  //       받을 수 있는 것을 못 받고 있다고 읽는다(리워드는 선택된 기업만 참여한다).
  const [reward, setReward] = useState<{
    balance: number;
    earned: number;
    /** 🔴 **정산 전이라 아직 안 쌓인 금액** — `balance` 에 더하지 말 것(3차) */
    pending: { amount: number; count: number } | null;
  } | null>(null);
  const [noticeLastSeen, setNoticeLastSeen] = useState<string | null>(null);

  async function load() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // 🔴 홈에서는 "확인함"으로 기록하지 **않는다** — 기록하면 홈을 열어본 것만으로
    //   배지가 사라져서, 화주가 어느 글이 새 글인지 끝내 못 본다.
    //   기록은 `/customer/announcements` 를 실제로 열었을 때만 한다.
    const lastSeen = getLastSeen("announcements");
    setNoticeLastSeen(lastSeen);

    // 🔴 상호 조회를 아래 다섯 건과 **같이** 던진다 — 예전에는 이 한 건을 먼저
    //    `await` 해서 끝난 뒤에야 나머지가 출발했다. 폰처럼 왕복이 느린 곳에서는 그
    //    한 번이 홈 화면 전체를 그만큼 늦춘다(「로그인 뒤 로딩이 길다」, 2026-09-08).
    //    🔴 다시 위로 빼서 먼저 기다리게 만들지 말 것 — 나머지 질의가 이 결과를
    //    쓰지 않으므로 순서를 지킬 이유가 없다.
    const [
      accountRes,
      invoicesRes,
      dispatchesRes,
      announcementRes,
      pendingRes,
      unreadRes,
      rejectedRes,
    ] = await Promise.all([
      session
        ? supabase
            .from("customer_accounts")
            .select("companies(name)")
            .eq("auth_user_id", session.user.id)
            .single()
        : Promise.resolve({ data: null }),
      // 🔴 **「금액 요약」 카드용**(2026-09-23 A장) — 미결제 건만 받아오지 않는다.
      //    카드가 「이번 달 청구금액」까지 말하므로 **입금된 건도 필요**하다.
      //    🔴 `limit` 은 정산 화면과 같은 100이다 — 다르게 두면 같은 카드가 화면마다
      //    다른 수를 말한다(그 화면도 최근 100건만 읽는다).
      //    ⚠️ **여기에 `.eq("payment_received", false)` 를 다시 걸지 말 것** — 걸면
      //    청구금액이 「아직 안 낸 것」만 세어 실제보다 작게 나온다.
      supabase
        .from("invoices")
        .select(
          "id,customer_charge_total,payment_received,tax_invoice_issued,tax_invoice_date,settlement_reference_date,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("dispatches")
        .select(
          // 🔴 `order_id`·`cancel_reason` 을 빼지 말 것 — 조회 화면과 **같은 규칙**으로
          //    취소 건을 가르고 같은 말을 붙이는 데 둘 다 필요하다.
          "id,order_id,dispatch_status,cancel_reason,pickup_confirmed,delivery_confirmed,issue_occurred,created_at,orders(order_no,origin,destination,requested_pickup_at,item,vehicle_type)"
        )
        // 🔴 3단계 매핑에서 `하차완료`도 「운송완료」 단계다(53차 ⑦ — 화물은 이미 도착했다).
        //    이 줄을 `neq("운송완료")` 하나로 되돌리면 "진행 중인 운송" 블록에
        //    「운송완료」 배지가 달린 행이 나타난다.
        .not("dispatch_status", "in", "(운송완료,하차완료)")
        // 🔴 **취소된 배차를 감추지 않는다**(사용자 지시 2026-09-17) — 재배차를 기다리는
        //    동안은 **아직 진행 중인 운송**이다. 조회 화면에서만 보이고 홈에서는 사라지면
        //    같은 건이 화면마다 다르게 보인다(`lib/dispatchStage.ts` 가 세운 규칙과 같은 결).
        //    ⚠️ **5건보다 넉넉히 받아 온다** — 아래에서 재배차가 끝난 취소 건을 걷어내므로
        //    딱 5건만 받으면 걷어낸 만큼 목록이 비어 보인다.
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("announcements")
        // 🔴 홈은 **제목만** 그린다 — 본문을 그리게 되면 `content_format` 을 함께
        //    받아 `AnnouncementBody` 로 그릴 것(평문을 서식으로 읽으면 줄바꿈이 사라진다).
        .select(`id,title,content,created_at,${ANNOUNCEMENT_NOTICE_FIELD}`)
        .order("created_at", { ascending: false })
        .limit(5),
      // 🔴 **아직 배차가 없는 건**(화주가 승인한 수주 견적 · 배차 전 오더)도 같이
      //    받아온다 — 규칙은 배차·운송 조회와 **같은 함수**다(2026-09-18).
      //    🔴 한쪽에만 넣으면 「조회에는 뜨는데 홈에는 없는」 상태가 된다.
      fetchPortalPendingDispatches(supabase),
      // 안 읽은 공지 수는 목록 5건과 따로 센다 — 6건 이상 밀려 있을 수 있어서
      // 불러온 5건으로 세면 실제보다 적게 나온다.
      supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        // 🔴 `created_at` 이 아니라 `announced_at` 이다 — 사이드바 배지·목록 NEW 와
        //    **같은 기준**이어야 한다(셋이 갈리면 숫자가 서로 안 맞는다).
        .gt(ANNOUNCEMENT_NOTICE_FIELD, lastSeen || "1970-01-01T00:00:00.000Z"),
      // 🔴 **반려된 발주 요청**(B장) — 회사 범위는 RLS 가 거른다(`customer_view_own_requests`).
      //    🔴 `대기중` 을 같이 가져오지 말 것 — 그것은 「아직 답이 없다」이고 띠로 알릴
      //    일이 아니다(담당자가 보는 중이다).
      supabase
        .from("portal_order_requests")
        .select("id,created_at,origin,destination,staff_note")
        .eq("status", "반려")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    setCompanyName(((accountRes?.data as any)?.companies as any)?.name || "");
    setInvoices((invoicesRes.data as unknown as InvoiceRow[]) || []);
    setRejectedRequests((rejectedRes?.data as unknown as RejectedRequestRow[]) || []);
    setAcknowledged(getAcknowledgedRequestIds());
    // 🔴 규칙은 화면이 아니라 `lib/portalCancelledDispatches.ts` 에 있다 —
    //    배차·운송 조회와 **같은 함수**를 쓴다.
    const dispatchView = await filterCancelledForCustomer(
      supabase,
      ((dispatchesRes.data as unknown as DispatchRow[]) || []) as any[]
    );
    // 🔴 합치는 일도 `lib/portalPendingDispatches.ts` 가 한다 — 여기서 각자 정렬하면
    //    「홈에 뜨는 5건」과 「조회 맨 위 5건」이 서로 다른 건이 된다.
    //    ⚠️ 가상 카드 조회가 실패해도 배너를 띄우지 않는다 — 홈은 원래 조회 실패를
    //    조용히 넘기고(배차·정산 다섯 건 전부 그렇다) 배차·운송 조회 화면이 말한다.
    setActiveDispatches(
      mergePortalPendingRows(dispatchView.rows, pendingRes.rows).slice(
        0,
        5
      ) as unknown as DispatchRow[]
    );
    setRedispatch(dispatchView.redispatch);
    setAnnouncements((announcementRes.data as AnnouncementRow[]) || []);
    setUnreadNotices(unreadRes.count || 0);
    setLoading(false);

    // 🔴 **위 `Promise.all` 에 넣지 않았다** — 이 한 건은 서버 라우트를 거쳐서 왕복이
    //    더 길고, 홈의 나머지가 이것을 기다릴 이유가 없다(참여하지 않은 화주가 대부분이라
    //    보통은 그릴 것도 없다). 🔴 `setLoading(false)` **뒤**라는 것이 핵심이다.
    // 🔴 실패하면 **안 그린다** — 조회 실패를 0원으로 떨어뜨리지 말 것(원칙 55번).
    if (session) {
      const res = await fetch("/api/customer/reward?menu=1", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => null);
      const menu = res?.ok ? await res.json().catch(() => null) : null;
      if (menu?.visible !== true) {
        setReward(null);
      } else {
        const full = await fetch("/api/customer/reward", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch(() => null);
        const body = full?.ok ? await full.json().catch(() => null) : null;
        setReward(
          body?.visible === true
            ? {
                balance: body.balance || 0,
                earned: body.earned || 0,
                // 🔴 서버가 못 셌으면 `pending` 이 아예 안 온다 — 그때는 `null` 이고
                //    화면이 줄을 안 그린다(0원으로 두면 「쌓일 것이 없다」가 된다).
                pending:
                  body.pending && body.pending.amount > 0
                    ? { amount: body.pending.amount, count: body.pending.count }
                    : null,
              }
            : null
        );
      }
    }
  }

  // 🔴 Realtime 이 끊겼을 때의 그물(`lib/portalRefresh.ts`) — 배차·정산 화면과 같은 규칙.
  usePortalRefresh(load);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("customer_home_all")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatches" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <div className="pv2-empty">불러오는 중...</div>;
  }

  // 🔴 **요약 계산은 `lib/portalInvoiceSummary.ts` 한 곳이다** — 정산 화면의 카드
  //    셋과 **같은 함수**를 쓴다. 화면마다 더하면 같은 금액이 홈과 정산에서 갈린다.
  //    🔴 기간은 **이번 달**이다(홈은 기간 칩이 없다 — 고르는 자리는 정산 화면이다).
  //    ⚠️ 미결제 잔액은 그 함수가 **기간을 보지 않고 누적**으로 센다(사용자 확정).
  const invoiceSummary = summarizePortalInvoices(invoices, PORTAL_PERIOD_MONTH);

  // 🔴 「확인」을 누른 건은 감춘다 — 안 감추면 반려 건이 **영원히 홈 맨 위**에 남는다.
  const unseenRejected = rejectedRequests.filter((r) => !acknowledged.includes(r.id));

  function dismissRejected(id: string) {
    acknowledgeRequestIds([id]);
    setAcknowledged(getAcknowledgedRequestIds());
  }

  return (
    <>
      {/* ① 인사 — 🔴 설치 버튼은 제목 줄 **오른쪽 끝**이다(실사용 지적, PR #127).
          본문 흐름 중간에 두면 자리가 애매해서 눈에 안 들어온다.
          이미 설치했거나 설치할 방법이 아예 없으면 **아무것도 그리지 않으므로**
          그때는 이 줄이 제목만 있는 예전 모습 그대로가 된다. */}
      <div className="pv2-page-head">
        <div>
          <h1 className="pv2-h1">{companyName || "위캐리 운송관리"}</h1>
          <p className="pv2-sub">안녕하세요, 새 운송이 필요하신가요?</p>
        </div>
        <InstallAppButton appName="운송관리" className="pv2-install-btn" />
      </div>

      {/* ①-2 🚨 **반려된 발주 요청**(2026-09-23 · B장) — 화주가 이것을 볼 자리가
          여기밖에 없다(문자도 푸시도 안 나간다 · A장이 「견적 확인」 메뉴를 없앴다).
          🔴 **CTA 위다** — 「새 운송 요청하기」를 누르기 전에 지난 요청이 왜 접수되지
          않았는지 먼저 읽어야 한다.
          🔴 **사유(`staff_note`)를 빼지 말 것** — 담당자 화면이 *「화주에게 표시됩니다」*
          라고 적고 받는 값이다. 없으면 「사유 없음」이 아니라 안내 문장만 남는다. */}
      {unseenRejected.length > 0 && (
        <section className="pv2-card pv2-rejnote" aria-labelledby="pv2-rejnote-title">
          <div className="pv2-rejnote-head" id="pv2-rejnote-title">
            접수되지 않은 발주 요청 {unseenRejected.length}건
          </div>
          {unseenRejected.map((r) => (
            <div key={r.id} className="pv2-rejnote-row">
              <div className="pv2-rejnote-body">
                <div className="pv2-rejnote-title">
                  {shortAddress(r.origin)} <span className="pv2-arrow-glyph">→</span>{" "}
                  {shortAddress(r.destination)}
                </div>
                <div className="pv2-rejnote-meta">
                  {formatDate(r.created_at)} 요청
                  {r.staff_note ? ` · 사유: ${r.staff_note}` : ""}
                </div>
              </div>
              <button type="button" className="pv2-btn-ghost" onClick={() => dismissRejected(r.id)}>
                확인
              </button>
            </div>
          ))}
          <div className="pv2-rejnote-foot">
            다시 요청하시거나 담당자에게 전화로 문의해주세요.
          </div>
        </section>
      )}

      {/* ② 발주 CTA + 금액 요약 */}
      <div className="pv2-home-top">
        <Link href="/customer/request" className="pv2-cta">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/portal/wecarry-line.svg" alt="" className="pv2-cta-motif" aria-hidden="true" />
          <span className="pv2-cta-text">
            <span className="pv2-cta-title">새 운송 요청하기</span>
            <span className="pv2-cta-desc">
              출발지·도착지 입력 후 바로 접수
              <br />
              담당자가 확인 후 운임을 확정해드립니다
            </span>
          </span>
          <span className="pv2-cta-arrow">
            <ArrowRight size={30} />
          </span>
        </Link>

        {/* 🔴 **「금액 요약」 — 「응답 확인하기」를 대체한 카드**(2026-09-23 · A장 ·
            사용자 확정 7번 「홈 「응답 확인하기」는 빼고 금액 요약으로」).
            ⚠️ 그 카드는 `견적제출` 견적(「견적 도착」)과 미입금 정산(「입금 대기」)을
            줄로 그리고 있었다. 앞의 것은 **화주가 견적을 보는 화면 자체가 없어져서**
            그릴 수 없고, 뒤의 것은 이 카드의 「미결제 잔액」이 대신한다.
            🔴 **「견적 도착」 줄을 되살리지 말 것.**
            🔴 세 숫자는 정산 화면의 카드 셋과 **같은 함수**에서 온다 — 한쪽만 고치지 말 것. */}
        <section className="pv2-card pv2-block" aria-labelledby="pv2-sum-title">
          <div className="pv2-block-head">
            <span className="pv2-section-title" id="pv2-sum-title">
              금액 요약
            </span>
            <Link href="/customer/invoices" className="pv2-btn-ghost">
              정산·결제내역 <ArrowRight size={15} />
            </Link>
          </div>

          <div className="pv2-home-sum">
            <div className="pv2-home-sum-item">
              <div className="pv2-isum-label">이번 달 청구금액</div>
              <div className="pv2-isum-value">
                {wonNum(invoiceSummary.billedTotal)}
                <span className="pv2-isum-unit"> 원</span>
              </div>
              <div className="pv2-isum-sub">
                {invoiceSummary.billedCount > 0
                  ? `${invoiceSummary.billedCount}건 · 부가세 포함 ${wonNum(
                      calcInclusiveAmount(invoiceSummary.billedTotal)
                    )}원`
                  : "청구된 건이 없습니다"}
              </div>
            </div>

            {/* 🔴 **미결제 잔액만 값 색이 다르다**(정산 화면 카드와 같은 `#B4423A`).
                🔴 이 숫자는 **누적**이다 — 기간을 걸면 지난달 미납이 사라져 화주가
                「낼 게 없구나」로 읽는다(사용자 확정 2026-09-23). */}
            <div className="pv2-home-sum-item">
              <div className="pv2-isum-label">미결제 잔액 (전체)</div>
              <div className="pv2-isum-value" style={{ color: "#B4423A" }}>
                {wonNum(invoiceSummary.unpaidTotal)}
                <span className="pv2-isum-unit" style={{ color: "#B4423A" }}>
                  {" "}
                  원
                </span>
              </div>
              <div className="pv2-isum-sub">
                {invoiceSummary.unpaidCount > 0
                  ? `${invoiceSummary.unpaidCount}건 입금 대기 중`
                  : "입금 대기 건이 없습니다"}
              </div>
            </div>

            <div className="pv2-home-sum-item">
              <div className="pv2-isum-label">세금계산서</div>
              <div className="pv2-isum-value">
                {invoiceSummary.taxCount}
                <span className="pv2-isum-unit"> 건 발행</span>
              </div>
              <div className="pv2-isum-sub">
                {invoiceSummary.latestTaxDate
                  ? `최근 발행일 ${formatDate(invoiceSummary.latestTaxDate)}`
                  : "이번 달 발행 이력 없음"}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ②-2 적립금 — 🔴 **참여한 화주에게만 그린다.** 안 켜진 화주에게는 이 블록이
          통째로 없다(「0원」도 아니고 「참여 안내」도 아니다 — 선택된 기업만 참여하는
          프로모션이라, 안내를 띄우면 신청하면 되는 것으로 읽힌다. HANDOFF §5-27). */}
      {reward && (
        <section className="pv2-card pv2-block" aria-labelledby="pv2-rwhome-title">
          <div className="pv2-rwhome">
            <div className="pv2-rwhome-body">
              <div className="pv2-rwhome-label" id="pv2-rwhome-title">
                사용 가능 적립금
              </div>
              <div className="pv2-rwhome-value num">{won(reward.balance)}</div>
              {/* 🚨 **월정산 화주는 이 줄이 없으면 홈에서 계속 0원만 본다**(3차) —
                  한 달치를 한 번에 입금하므로 그 전까지 원장이 비어 있다.
                  🔴 잔액에 더해 한 숫자로 만들지 말 것 · 🔴 「예정」을 빼지 말 것. */}
              {reward.pending && (
                <div className="pv2-rwhome-pending">
                  {/* ⚠️ **이 화면의 `won()` 은 「원」까지 붙인다** — 적립금 화면의
                      것과 다르다. 안 보고 적었다가 「58,600원원」이 되었고
                      **렌더링해서 잡았다**(2026-09-21). */}
                  정산 후 적립 예정 +{won(reward.pending.amount)} · 운송{" "}
                  {reward.pending.count}건
                </div>
              )}
            </div>
            <Link href="/customer/reward" className="pv2-btn-ghost">
              적립 내역 <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      )}

      {/* ③ 진행 중인 운송 */}
      <section className="pv2-card pv2-block" aria-labelledby="pv2-active-title">
        <div className="pv2-block-head">
          <span className="pv2-section-title" id="pv2-active-title">
            진행 중인 운송
          </span>
          {activeDispatches.length > 0 && (
            <span className="pv2-count-chip">{activeDispatches.length}건</span>
          )}
          <Link href="/customer/dispatches" className="pv2-btn-ghost">
            전체 보기 <ArrowRight size={15} />
          </Link>
        </div>

        {activeDispatches.length === 0 ? (
          <div className="pv2-empty">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/portal/wecarry-eng-cropped.svg" alt="" className="pv2-empty-logo" />
            <div className="pv2-empty-title">진행 중인 운송이 없습니다</div>
          </div>
        ) : (
          <div>
            {activeDispatches.map((d) => (
              <div key={d.id} className="pv2-active-row">
                {/* 🔴 배차 상태 배지는 3단계다(29차). 매핑 정의처는 `lib/dispatchStage.ts` 하나이고
                    배차·운송 조회 화면이 같은 파일을 쓴다 — 여기에 매핑을 다시 적지 말 것.
                    🔴 「문제 발생」은 단계가 아니라 별도 배지다(사용자 확정 6번). */}
                {hasDispatchIssue(d) && (
                  <span
                    className="pv2-status-badge"
                    style={{ background: DISPATCH_ISSUE_STYLE.bg, color: DISPATCH_ISSUE_STYLE.color }}
                  >
                    {DISPATCH_ISSUE_STYLE.label}
                  </span>
                )}
                {/* 🔴 취소된 건은 단계가 「접수」로 돌아가 있으므로(`lib/dispatchStage.ts`)
                    **왜 돌아갔는지를 여기서 말해야 한다** — 배지 하나를 빼면 화주는
                    배차됐던 건이 이유 없이 접수로 되돌아간 것으로 본다.
                    🔴 **재배차가 접수된 뒤에도 배차확정 전까지 계속 뜬다** — 새 배차 카드가
                    취소 이력을 이어받는다. 🔴 `isDispatchCancelled(d.dispatch_status)` 로
                    되돌리지 말 것(그러면 재배차 접수 순간 배지가 사라진다).
                    🔴 말도 판정도 조회 화면과 **같은 함수**가 한다. */}
                {(() => {
                  // 🔴 **취소된 건뿐 아니라 「재배차 접수 중」인 새 배차에도 뜬다**
                  //    (사용자 지시 2026-09-17 — *「이때까지는 배차취소 뱃지가 남아있고
                  //    배차완료가 됐을때 사라지게 하자」*). 판정은 조회 화면과 같은 함수다.
                  const notice = getPortalCancelNotice(d, redispatch);
                  if (!notice) return null;
                  return (
                    <span
                      className="pv2-status-badge"
                      style={{
                        background: DISPATCH_CANCEL_CUSTOMER_STYLE.bg,
                        color: DISPATCH_CANCEL_CUSTOMER_STYLE.color,
                      }}
                    >
                      {dispatchCancelCustomerBadge(notice.reason)}
                    </span>
                  );
                })()}
                <span
                  className="pv2-status-badge"
                  style={{
                    background: getDispatchStageStyle(getDispatchStage(d)).bg,
                    color: getDispatchStageStyle(getDispatchStage(d)).color,
                  }}
                >
                  {getDispatchStageStyle(getDispatchStage(d)).label}
                </span>
                <div className="pv2-active-body">
                  <div className="pv2-active-title">
                    {d.orders?.origin} <span className="pv2-arrow-glyph">→</span> {d.orders?.destination}
                  </div>
                  <div className="pv2-active-meta">
                    {/* 🔴 오더가 아직 없는 건은 **견적번호로 말한다**(2026-09-18) —
                        배차·운송 조회와 같은 표기여야 한다. 접두어를 빼지 말 것. */}
                    {[
                      d.orders?.order_no || (d.quote_no ? `견적 ${d.quote_no}` : null),
                      d.orders?.item,
                      d.orders?.vehicle_type,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="pv2-active-when">상차 {shortDateTime(d.orders?.requested_pickup_at)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ④ 공지사항 — 🔴 캘린더·공지사항이 메뉴에서 빠졌으므로 이 블록이 공지의 유일한
          진입로다. 지우면 /customer/announcements 는 주소를 직접 쳐야만 갈 수 있게 된다. */}
      {announcements.length > 0 ? (
        <section className="pv2-card pv2-block pv2-notices" aria-labelledby="pv2-notice-title">
          <div className="pv2-notices-head">
            <span className="pv2-section-title" id="pv2-notice-title">
              공지사항
            </span>
            {/* 🔴 안 읽은 수는 사이드바 배지와 같은 규칙이다(위 주석 참고).
                0 이면 아예 그리지 않는다 — "안 읽음 0" 은 알림이 아니라 잡음이다. */}
            {unreadNotices > 0 && (
              <span className="pv2-notices-count">안 읽음 {unreadNotices}</span>
            )}
            <Link href="/customer/announcements" className="pv2-btn-ghost">
              전체 공지사항 보기 <ArrowRight size={15} />
            </Link>
          </div>
          <ul className="pv2-notices-list">
            {announcements.map((a) => {
              // 마지막 확인 기록이 없으면 전부 새 글로 본다(공지 페이지와 같은 판정)
              const isNew =
                !noticeLastSeen ||
                new Date((a as any)[ANNOUNCEMENT_NOTICE_FIELD]) > new Date(noticeLastSeen);
              return (
                <li key={a.id} className="pv2-notices-row">
                  <Link href="/customer/announcements" className="pv2-notices-link">
                    {isNew && (
                      <span className="pv2-notices-new" aria-label="안 읽은 공지">
                        NEW
                      </span>
                    )}
                    <span className="pv2-notices-title">{a.title}</span>
                    <span className="pv2-notices-date">{shortDate(a.created_at)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="pv2-card pv2-block pv2-notice" aria-labelledby="pv2-notice-title">
          <span className="pv2-section-title" id="pv2-notice-title">
            공지사항
          </span>
          <span className="pv2-notice-empty">등록된 공지사항이 없습니다.</span>
          <Link href="/customer/announcements" className="pv2-btn-ghost">
            전체 공지사항 보기 <ArrowRight size={15} />
          </Link>
        </section>
      )}
    </>
  );
}
